<?php
// Telegram Login Widget verification (PHP 5.6 compatible)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$bot_token = '8978686854:AAGU0ytIM4R3HLqfNgvYOHulI0oX62F7A0w';

function checkTelegramAuth($auth_data, $bot_token) {
    $check_hash = $auth_data['hash'];
    unset($auth_data['hash']);
    $data_check_arr = array();
    foreach ($auth_data as $key => $value) {
        $data_check_arr[] = $key . '=' . $value;
    }
    sort($data_check_arr);
    $data_check_string = implode("\n", $data_check_arr);
    $secret_key = hash('sha256', $bot_token, true);
    $hash = hash_hmac('sha256', $data_check_string, $secret_key);
    if (strcmp($hash, $check_hash) !== 0) {
        return false;
    }
    if ((time() - $auth_data['auth_date']) > 86400) {
        return false;
    }
    return true;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['hash'])) {
    $auth_data = $_GET;
    if (checkTelegramAuth($auth_data, $bot_token)) {
        echo json_encode(array(
            'ok' => true,
            'user' => array(
                'id' => $auth_data['id'],
                'first_name' => isset($auth_data['first_name']) ? $auth_data['first_name'] : '',
                'last_name' => isset($auth_data['last_name']) ? $auth_data['last_name'] : '',
                'username' => isset($auth_data['username']) ? $auth_data['username'] : '',
                'photo_url' => isset($auth_data['photo_url']) ? $auth_data['photo_url'] : '',
            )
        ));
    } else {
        http_response_code(403);
        echo json_encode(array('ok' => false, 'error' => 'Auth verification failed'));
    }
} else {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'error' => 'Missing auth data'));
}
