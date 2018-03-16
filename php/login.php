<?php
require 'pbi.auth.php';

$token = $_POST["token"];
$user = trim(urldecode(htmlspecialchars($_POST["userLogin"])));
$point = trim(urldecode(htmlspecialchars($_POST["point"])));
$type = trim(urldecode(htmlspecialchars($_POST["type"])));
if (empty($_POST["refresh_token"])) {
	$refresh_token = '';
} else {
	$refresh_token = trim(urldecode(htmlspecialchars($_POST["refresh_token"])));
}

header('Content-Type: application/json; charset=utf-8');
$http_origin = $_SERVER['HTTP_ORIGIN'];
if (strpos($http_origin, 'domain.ru') !== false ) { 
   header('Access-Control-Allow-Credentials: true');
   header('Access-Control-Allow-Origin:' . $http_origin);
}
if (is_null($type) || is_null($point)) {
	$r = ['result' => False, 'reason' => 'undefined point'];
	echo json_encode($r);
	die;
}
if (!in_array($type, ['start', 'resume'])) {
	$r = ['result' => False, 'reason' => 'undefined challenge', 'value' => $type];
	echo json_encode($r);
	die;
}
if (!is_null($user) && !is_null($token) && strlen($user) > 2 && strlen($token) > 2) {
	$db = new mysqli('myhost.com', 'admin_user', 'pwd', 'pbi_pages', 3306);
	if ($db->connect_errno) {
		$r = ['result' => False, 'reason' => 'db error' . $db->connect_errno ];
		echo json_encode($r);
	} else {
		$db->set_charset('utf8');
		if ($type == 'resume') {
			$password_challenge = rtrim( mcrypt_decrypt( MCRYPT_RIJNDAEL_256, md5( $user ), base64_decode( $token ), MCRYPT_MODE_CBC, md5( md5( $user ) ) ), "\0");
		} else {
			$password_challenge = $token;
		}
		$user_query = 'SELECT * FROM users WHERE login = "' . $user . '"';
		if (!$result = $db->query($user_query)) {
			$r = ['result' => False, 'reason' => 'db error' . $db->error ];
			echo json_encode($r);
			die;
		} else {
			if ($result->num_rows === 0) {
				$r = ['result' => False, 'reason' => 'login'];
				echo json_encode($r);
				die;
			} else {
				$user = $result->fetch_assoc();
				if ($user['password'] != $password_challenge) {
					$r = ['result' => False, 'reason' => 'challenge', 'value' => $token ];
					echo json_encode($r);
					die;
				} else {
					$result->free();
					$point_query = 'SELECT p.app_point, p.app_title, p.report_id, p.group_id, r.mode FROM points p INNER JOIN user_point r ON p.pid = r.pid WHERE app_point = "' . $point . '" AND uid = ' . $user['uid'] . ';';
					if (!$result = $db->query($point_query)) {
						$r = ['result' => False, 'reason' => 'db error' . $db->error ];
						echo json_encode($r);
						die;
					} else {
						if ($result->num_rows === 0) {
							$r = ['result' => False, 'reason' => 'point', 'value' => $point];
							echo json_encode($r);
							die;
						} else {
							$point = $result->fetch_assoc();
							if ($type == 'resume') {
								$pbi_auth = getAccess('refresh', $point['mode'], $refresh_token);
							} else {
								$pbi_auth = getAccess('access', $point['mode']);
							}
							try {
								$r = [
									'result' => True,
									'login' => $user['login'],
									'token' => base64_encode( mcrypt_encrypt( MCRYPT_RIJNDAEL_256, md5( $user['login'] ), $user['password'], MCRYPT_MODE_CBC, md5( md5( $user['login'] ) ) ) ),
									'mode' => $point['mode'],
									'language' => $user['language'],
									'name' => $user['name'],
									'lastname' => $user['lastname'],
									'email' => $user['email'],
									'report' => $point['report_id'],
									'group' => $point['group_id'],
									'app_title' => $point['app_title'],
									'auth_data' => $pbi_auth
								];
							} catch (Exception $e) {
								$r = [
									'result' => True,
									'login' => $user['login'],
									'mode' => $point['mode'],
									'language' => $user['language'],
									'name' => $user['name'],
									'lastname' => $user['lastname'],
									'email' => $user['email'],
									'report' => $point['report_id'],
									'group' => $point['group_id'],
									'app_title' => $point['app_title'],
									'auth_data' => $e
								];
							}
							echo json_encode($r);
						}
					}
				}
			}
		}
		$result->free();
	}
	$db->close();
} else {
	$r = ['result' => False, 'reason' => 'empty or short auth data'];
	echo json_encode($r);
}
?>
