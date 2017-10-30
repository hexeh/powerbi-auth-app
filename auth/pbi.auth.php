<?php
$login = $_GET["login"];
$passwd = $_GET["pwd"];
$subj = $_GET["subj"];
$client_id = 'APP_CLIENT_ID';
$client_secret = 'APP_CLIENT_SECRET';
$redirect_uri = 'APP_REDIRECT_URI';
$http_origin = $_SERVER['HTTP_ORIGIN'];

header('Content-Type: application/json');

# Check whether form submitted from our pages or not

if( strpos($http_origin, 'ALLOWED_ORIGIN_1') !== false ||  strpos($http_origin, 'ALLOWED_ORIGIN_2') !== false )
{ 
   header('Access-Control-Allow-Credentials: true');
   header('Access-Control-Allow-Origin:' . $http_origin);
}
$redis = new Redis();
# Client logins stored in redis storage
# Define connection info here
$redis->connect('REDIS_STORAGE_ADDR', 6379);
$redis->auth('REDIS_STORAGE_PASSWORD');
if( strlen($redis->get($subj . ':' . $login)) > 0 ) 
{
	# We assumed redis keys in format: WEB_APP_SUBJECT:WEB_APP_LOGIN
	$saved = json_decode($redis->get($subj . ':' . $login) , true);
	$existed = base64_encode($saved['login'] . ':' . $saved['password']);
	$delivered = base64_encode($login . ':' . $passwd);
	if($existed == $delivered)
	{
		$ch = curl_init();
		# Provide auth info - APP credentials & User credentials
		$params = [
			'grant_type' => 'password',
			'scope' => 'openid',
			'resource' => 'https://analysis.windows.net/powerbi/api',
			'client_id' => $client_id,
			'client_secret' => $client_secret,
			'username' => 'POWERBI_USER_EMAIL',
			'password' => 'POWERBI_USER_PASSWORD'
		];

		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1); 
		curl_setopt($ch, CURLOPT_VERBOSE, true);
		curl_setopt($handle, CURLOPT_STDERR, $err);
		curl_setopt($ch, CURLOPT_URL, 'https://login.windows.net/common/oauth2/token');
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));

		$server_output = curl_exec($ch);
		$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		if($httpcode == 200)
		{
			$sub = $server_output;
			$r = [
				'result' => True, 
				'client' => $saved['client_name'], 
				'reportId' => $saved['reportId'], 
				'groupId' => $saved['groupId'], 
				'checkin' => base64_encode($saved['reportId'] . ':' .$login . ':' . $passwd),
				'auth_data' => $sub
			];
		}
		else
		{
			if( strpos($server_output, '65001') !== false )
			{
				$r = ['result' => False, 'reason' => 'first time login', 'interactive_auth_url' => 'https://login.microsoftonline.com/common/oauth2/authorize?client_id=' . $client_id . '&redirect_uri=' . $redirect_uri . '&response_type=code&prompt=admin_consent'];
			}
			else
			{
				$r = ['result' => False, 'reason' => 'Power BI Auth Failed'];
			}
		}
		curl_close($ch);
		echo json_encode($r);
	}
	else
	{
		if($saved['login'] == $login)
		{
			$r = ['result' => False, 'reason' => 'password incorrect'];
		}
		else
		{
			$r = ['result' => False, 'reason' => 'login incorrect'];
		}
		echo json_encode($r);
	}
}
else
{
	$r = ['result' => False, 'reason' => 'project not found'];
	echo json_encode($r);
}
?>
