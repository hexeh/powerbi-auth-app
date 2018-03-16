<?php
	function getAccess($type, $mode, $refresh = '_blank') {
		$ch = curl_init();
		if ($type == 'refresh') {
			$params = [
				'grant_type' => 'refresh_token',
				'refresh_token' => $refresh,
				'resource' => 'https://analysis.windows.net/powerbi/api',
				'client_id' => in_array($mode, ['admin','superuser']) ? 'a' : 'b',
				'client_secret' => in_array($mode, ['admin','superuser']) ? 'c' : 'd'
			];
		} else {
			$params = [
				'grant_type' => 'password',
				'scope' => 'openid',
				'resource' => 'https://analysis.windows.net/powerbi/api',
				'client_id' => in_array($mode, ['admin','superuser']) ? 'a' : 'b',
				'client_secret' => in_array($mode, ['admin','superuser']) ? 'c' : 'd',
				'username' => 'powerbi@mail.com',
				'password' => 'pwd'
			];
		}

		curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1); 
		curl_setopt($ch, CURLOPT_VERBOSE, true);
		curl_setopt($ch, CURLOPT_URL, 'https://login.windows.net/common/oauth2/token');
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));

		$server_output = curl_exec($ch);
		$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

		if ($httpcode == 200) {
			$response = json_decode($server_output, true);
		}

		if (isset($response)) {
			$result = [
				'access' => $response['access_token'],
				'refresh' => $response['refresh_token'],
				'expires' => $response['expires_on']
			];
		} else {
			$result = [];
		}
		return $result;
	}
?>
