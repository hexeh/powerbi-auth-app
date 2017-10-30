<?php
$login = $_GET["login"];
$checkin = $_GET["checkin"];
$subj = $_GET["subj"];
$token = $_GET["refresh"];

header('Content-Type: application/json');
$http_origin = $_SERVER['HTTP_ORIGIN'];
$client_id = 'APP_CLIENT_ID';
$client_secret = 'APP_CLIENT_SECRET';
$redirect_uri = 'APP_REDIRECT_URI';

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
	$saved = json_decode($redis->get($subj . ':' . $login) , true);
	$existed = base64_encode($saved['reportId'] . ':' . $saved['login'] . ':' . $saved['password']);
	$delivered = $checkin;
	if($existed == $delivered)
	{
		$ch = curl_init();
		$params = [
			'grant_type' => 'refresh_token',
			'refresh_token' => $token,
			'resource' => 'https://analysis.windows.net/powerbi/api',
			'client_id' => 'APP_CLIENT_ID',
			'client_secret' => 'APP_CLIENT_SECRET'
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
		echo json_encode($r, JSON_FORCE_OBJECT);
	}
	else
	{
		$r = ['result' => False];
		echo json_encode($r, JSON_FORCE_OBJECT);
	}
}
else
{
	$r = ['result' => False, 'reason' => 'Doesn\'t Exists'];
	echo json_encode($r);
}
?>
