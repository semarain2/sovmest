<?php
// Finik Acquiring API Integration

$FINIK_API_KEY = 'HpSOYfOfHvaW2JdtsTkM79kt2TRGQKeH6PdnchbU';
$FINIK_ACCOUNT_ID = 'e0f9dae5-cf2f-4ae8-8aa6-044e63e7ea76';

$FINIK_BASE_URL = 'https://api.acquiring.averspay.kg';
$FINIK_HOST = 'api.acquiring.averspay.kg';

// Use correct path to private.pem
$FINIK_PRIVATE_KEY_PATH = __DIR__ . '/keys/private.pem';

$FINIK_PROD_PUB_KEY = <<<EOD
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuF/PUmhMPPidcMxhZBPb
BSGJoSphmCI+h6ru8fG8guAlcPMVlhs+ThTjw2LHABvciwtpj51ebJ4EqhlySPyT
hqSfXI6Jp5dPGJNDguxfocohaz98wvT+WAF86DEglZ8dEsfoumojFUy5sTOBdHEu
g94B4BbrJvjmBa1YIx9Azse4HFlWhzZoYPgyQpArhokeHOHIN2QFzJqeriANO+wV
aUMta2AhRVZHbfyJ36XPhGO6A5FYQWgjzkI65cxZs5LaNFmRx6pjnhjIeVKKgF99
4OoYCzhuR9QmWkPl7tL4Kd68qa/xHLz0Psnuhm0CStWOYUu3J7ZpzRK8GoEXRcr8
tQIDAQAB
-----END PUBLIC KEY-----
EOD;

// Pricing: 100 som per review, 5% off for 5+, 10% off for 10+, 15% off for 20+
function finik_calc_price($qty) {
    $pricePerUnit = 100;
    if ($qty >= 20) {
        $pricePerUnit = 85; // 15% off
    } elseif ($qty >= 10) {
        $pricePerUnit = 90; // 10% off
    } elseif ($qty >= 5) {
        $pricePerUnit = 95; // 5% off
    }
    return $qty * $pricePerUnit;
}

function finik_canonicalize($method, $path, $headers, $queryString, $bodyStr) {
    // 1) Lowercase(HTTP method) + "\n"
    $data = strtolower($method) . "\n";
    
    // 2) URIAbsolutePath + "\n"
    $data .= $path . "\n";
    
    // 3) Headers: "Host" and "x-api-*" sorted alphabetically
    $headerKeys = array();
    $headerMap = array();
    foreach ($headers as $k => $v) {
        $lk = strtolower($k);
        if ($lk === 'host' || strpos($lk, 'x-api-') === 0) {
            $headerKeys[] = $lk;
            $headerMap[$lk] = $v;
        }
    }
    sort($headerKeys);
    $headerParts = array();
    foreach ($headerKeys as $k) {
        $headerParts[] = $k . ":" . $headerMap[$k];
    }
    $data .= implode("&", $headerParts) . "\n";
    
    // 4) Query String Params
    if (!empty($queryString)) {
        $data .= $queryString . "\n";
    }
    
    // 5) JSON body
    $data .= $bodyStr;
    
    return $data;
}

function finik_sort_json_keys($array) {
    if (!is_array($array)) return $array;
    $keys = array_keys($array);
    $isAssoc = array_keys($keys) !== $keys;
    
    if ($isAssoc) {
        ksort($array);
    }
    
    foreach ($array as $key => $value) {
        if (is_array($value)) {
            $array[$key] = finik_sort_json_keys($value);
        }
    }
    return $array;
}

function finik_create_payment($deviceId, $tgId, $qty = 1) {
    global $FINIK_API_KEY, $FINIK_ACCOUNT_ID, $FINIK_BASE_URL, $FINIK_HOST, $FINIK_PRIVATE_KEY_PATH;
    
    if ($FINIK_ACCOUNT_ID === 'YOUR_ACCOUNT_ID') {
        return array('ok' => false, 'error' => 'Finik Account ID is not configured.');
    }
    
    $qty = max(1, intval($qty));
    $amount = finik_calc_price($qty);
    
    $timestamp = (string) round(microtime(true) * 1000);
    $paymentId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
    
    // Construct user key to pass through payment
    $userKey = 'dev_' . $deviceId;
    if ($tgId) {
        $userKey = 'tg_' . $tgId;
    }
    
    $bodyArray = array(
        "Amount" => $amount,
        "CardType" => "FINIK_QR",
        "PaymentId" => $paymentId,
        "RedirectUrl" => "https://sovmest.aist.pw/index.html?payment=success",
        "Data" => array(
            "accountId" => $FINIK_ACCOUNT_ID,
            "description" => "Совместимость PRO x" . $qty,
            "merchantCategoryCode" => "0742",
            "name_en" => "Sovmestimost PRO",
            "webhookUrl" => "https://sovmest.aist.pw/api.php?action=finik_webhook",
            "additionalData" => array(
                array(
                    "fieldId" => "user_key",
                    "name" => "User Key",
                    "isHidden" => true,
                    "value" => $userKey
                ),
                array(
                    "fieldId" => "qty",
                    "name" => "Quantity",
                    "isHidden" => true,
                    "value" => (string)$qty
                )
            )
        )
    );
    
    $sortedBodyArray = finik_sort_json_keys($bodyArray);
    $bodyStr = json_encode($sortedBodyArray, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    $headers = array(
        "Host" => $FINIK_HOST,
        "x-api-key" => $FINIK_API_KEY,
        "x-api-timestamp" => $timestamp
    );
    
    $canonicalStr = finik_canonicalize("POST", "/v1/payment", $headers, "", $bodyStr);
    
    $privateKey = file_get_contents($FINIK_PRIVATE_KEY_PATH);
    if (!$privateKey) return array('ok' => false, 'error' => 'Private key not found');
    
    $signature = '';
    openssl_sign($canonicalStr, $signature, $privateKey, OPENSSL_ALGO_SHA256);
    $signatureBase64 = base64_encode($signature);
    
    $url = $FINIK_BASE_URL . "/v1/payment";
    
    $ch = curl_init($url);
    $reqHeaders = array(
        "Content-Type: application/json",
        "x-api-key: " . $FINIK_API_KEY,
        "x-api-timestamp: " . $timestamp,
        "signature: " . $signatureBase64
    );
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $bodyStr);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);
    
    if ($httpCode == 302 || $httpCode == 301 || $httpCode == 303 || $httpCode == 307 || $httpCode == 308) {
        $headerStr = substr($response, 0, $headerSize);
        preg_match('/^Location:\s*(.*)$/mi', $headerStr, $matches);
        if (!empty($matches[1])) {
            return array('ok' => true, 'paymentUrl' => trim($matches[1]));
        }
    }
    
    $bodyPart = substr($response, $headerSize);
    return array('ok' => false, 'error' => 'Failed to create payment', 'code' => $httpCode, 'details' => $bodyPart);
}

function finik_verify_webhook($method, $path, $headers, $queryString, $bodyStr, $signatureBase64) {
    global $FINIK_PROD_PUB_KEY;
    $canonicalStr = finik_canonicalize($method, $path, $headers, $queryString, $bodyStr);
    $signature = base64_decode($signatureBase64);
    
    $ok = openssl_verify($canonicalStr, $signature, $FINIK_PROD_PUB_KEY, OPENSSL_ALGO_SHA256);
    return $ok === 1;
}
?>
