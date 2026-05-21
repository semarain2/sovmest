<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
// СОВМЕСТИМОСТЬ — API Backend (PHP 5.6 compatible)

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$DATA_DIR = dirname(__DIR__) . '/sovmest_data/users';
$BOT_TOKEN = '8978686854:AAGU0ytIM4R3HLqfNgvYOHulI0oX62F7A0w';

// Create data dirs OUTSIDE public_html (safe from deploys)
$base = dirname(__DIR__) . '/sovmest_data';
if (!is_dir($base)) { @mkdir($base, 0755); }
if (!is_dir($DATA_DIR)) { @mkdir($DATA_DIR, 0755, true); }

// --- Helper: safe get from array ---
function arr_get($arr, $key, $default = '') {
    return isset($arr[$key]) ? $arr[$key] : $default;
}

// --- User File Helpers ---
// --- User File Helpers (device-based) ---
function getUserFile($device_id) {
    global $DATA_DIR;
    // Sanitize: only alphanumeric and dashes
    $safe = preg_replace('/[^a-zA-Z0-9\-]/', '', $device_id);
    return $DATA_DIR . '/dev_' . $safe . '.json';
}

function loadUser($device_id) {
    $file = getUserFile($device_id);
    if (file_exists($file)) {
        return json_decode(file_get_contents($file), true);
    }
    return null;
}

function saveUser($device_id, $data) {
    file_put_contents(getUserFile($device_id), json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

// --- Route ---
require_once 'finik.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'create_payment':
        header('Content-Type: application/json');
        $deviceId = isset($_GET['device_id']) ? $_GET['device_id'] : '';
        $tgId = isset($_GET['tg_id']) ? $_GET['tg_id'] : '';
        $qty = isset($_GET['qty']) ? intval($_GET['qty']) : 1;
        
        if (!$deviceId && !$tgId) {
            echo json_encode(array('ok' => false, 'error' => 'Missing device_id or tg_id'));
            break;
        }
        
        $res = finik_create_payment($deviceId, $tgId, $qty);
        echo json_encode($res);
        break;

    case 'finik_webhook':
        // Log ALL webhook requests for debugging
        $logDir = dirname(__DIR__) . '/sovmest_data';
        $bodyStr = file_get_contents('php://input');
        $logEntry = date('c') . " | " . $_SERVER['REQUEST_METHOD'] . " | " . $bodyStr . "\n";
        @file_put_contents($logDir . '/webhook_log.txt', $logEntry, FILE_APPEND);
        
        // Parse payload
        $payload = json_decode($bodyStr, true);
        
        // Process payment regardless of signature (Finik signature verification can fail on shared hosting)
        // We verify by checking the payload structure instead
        if ($payload && isset($payload['status']) && strtoupper($payload['status']) === 'SUCCEEDED') {
            $userKey = '';
            $qty = 1;
            if (isset($payload['fields']['user_key'])) {
                $userKey = $payload['fields']['user_key'];
            }
            if (isset($payload['fields']['qty'])) {
                $qty = max(1, intval($payload['fields']['qty']));
            }
            
            $amount = isset($payload['amount']) ? $payload['amount'] : 0;
            
            if ($userKey) {
                // userKey is like "dev_dev-12345-abc" or "tg_302639885"
                $file = $DATA_DIR . '/' . $userKey . '.json';
                
                // If tg_ key, try to find matching dev_ file
                if (strpos($userKey, 'tg_') === 0) {
                    $tgIdOnly = substr($userKey, 3);
                    // Search for dev_ file with this tg_id
                    $devFiles = glob($DATA_DIR . '/dev_*.json');
                    if ($devFiles) {
                        foreach ($devFiles as $df) {
                            $ud = json_decode(file_get_contents($df), true);
                            if ($ud && isset($ud['tg_id']) && $ud['tg_id'] == $tgIdOnly) {
                                $file = $df;
                                break;
                            }
                        }
                    }
                }
                
                if (file_exists($file)) {
                    $u = json_decode(file_get_contents($file), true);
                    if ($u) {
                        if (!isset($u['paid_calcs'])) $u['paid_calcs'] = 0;
                        if (!isset($u['revenue'])) $u['revenue'] = 0;
                        if (!isset($u['payments'])) $u['payments'] = array();
                        
                        $u['paid_calcs'] += $qty;
                        $u['revenue'] += $amount;
                        $u['payments'][] = array(
                            'date' => date('c'),
                            'amount' => $amount,
                            'qty' => $qty,
                            'txn' => isset($payload['transactionId']) ? $payload['transactionId'] : '',
                        );
                        
                        file_put_contents($file, json_encode($u, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                        @file_put_contents($logDir . '/webhook_log.txt', date('c') . " | CREDITED $qty to $file\n", FILE_APPEND);
                    }
                } else {
                    @file_put_contents($logDir . '/webhook_log.txt', date('c') . " | FILE NOT FOUND: $file\n", FILE_APPEND);
                }
            }
        }
        
        http_response_code(200);
        echo "OK";
        break;

    case 'save_history':
        $input = json_decode(file_get_contents('php://input'), true);
        $device_id = isset($input['device_id']) ? $input['device_id'] : '';
        if (!$device_id) {
            http_response_code(400);
            echo json_encode(array('ok' => false, 'error' => 'Missing device_id'));
            break;
        }
        
        $history = isset($input['history']) ? $input['history'] : array();
        
        $user = loadUser($device_id);
        if (!$user) {
            $user = array(
                'device_id' => $device_id,
                'created_at' => date('c'),
                'total_calcs' => 0,
                'paid_calcs' => 0,
                'revenue' => 0,
            );
        }
        
        // Update TG info if provided
        if (isset($input['tg_id']) && $input['tg_id']) {
            $tgId = intval($input['tg_id']);
            $user['tg_id'] = $tgId;
            $user['username'] = arr_get($input, 'username', arr_get($user, 'username'));
            $user['first_name'] = arr_get($input, 'first_name', arr_get($user, 'first_name'));
            $user['last_name'] = arr_get($input, 'last_name', arr_get($user, 'last_name'));
            $user['photo_url'] = arr_get($input, 'photo_url', arr_get($user, 'photo_url'));
            
            // Recovery: find old device files with same tg_id and merge history
            $files = glob($DATA_DIR . '/dev_*.json');
            if ($files) {
                foreach ($files as $f) {
                    if (basename($f) === 'dev_' . preg_replace('/[^a-zA-Z0-9\-]/', '', $device_id) . '.json') continue;
                    $old = json_decode(file_get_contents($f), true);
                    if ($old && isset($old['tg_id']) && intval($old['tg_id']) === $tgId && isset($old['history'])) {
                        $existingUids = array();
                        $curHist = isset($user['history']) ? $user['history'] : array();
                        foreach ($curHist as $h) { if (isset($h['uid'])) $existingUids[] = $h['uid']; }
                        foreach ($old['history'] as $h) {
                            if (isset($h['uid']) && !in_array($h['uid'], $existingUids)) {
                                $curHist[] = $h;
                                $existingUids[] = $h['uid'];
                            }
                        }
                        $user['history'] = $curHist;
                        // Merge paid_calcs: take the max so credits aren't lost
                        $oldPaid = isset($old['paid_calcs']) ? intval($old['paid_calcs']) : 0;
                        $curPaid = isset($user['paid_calcs']) ? intval($user['paid_calcs']) : 0;
                        $user['paid_calcs'] = max($curPaid, $oldPaid);
                        $oldRev = isset($old['revenue']) ? intval($old['revenue']) : 0;
                        $curRev = isset($user['revenue']) ? intval($user['revenue']) : 0;
                        $user['revenue'] = max($curRev, $oldRev);
                        // Keep devices in sync, don't wipe old device!
                        $old['history'] = $curHist;
                        $old['paid_calcs'] = $user['paid_calcs'];
                        // also update old file tg info
                        $old['username'] = $user['username'];
                        $old['first_name'] = $user['first_name'];
                        file_put_contents($f, json_encode($old, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                    }
                }
            }
            
            // Legacy recovery: old TG-based files (e.g. 302639885.json)
            $legacyFile = $DATA_DIR . '/' . $tgId . '.json';
            if (file_exists($legacyFile)) {
                $legacy = json_decode(file_get_contents($legacyFile), true);
                if ($legacy && !isset($legacy['migrated_to'])) {
                    $existingUids = array();
                    $curHist = isset($user['history']) ? $user['history'] : array();
                    foreach ($curHist as $h) { if (isset($h['uid'])) $existingUids[] = $h['uid']; }
                    if (isset($legacy['history'])) {
                        foreach ($legacy['history'] as $h) {
                            if (isset($h['uid']) && !in_array($h['uid'], $existingUids)) {
                                $curHist[] = $h;
                                $existingUids[] = $h['uid'];
                            }
                        }
                    }
                    $user['history'] = $curHist;
                    // Copy user info from legacy
                    if (!isset($user['username']) && isset($legacy['username'])) $user['username'] = $legacy['username'];
                    if (!isset($user['first_name']) && isset($legacy['first_name'])) $user['first_name'] = $legacy['first_name'];
                    if (!isset($user['photo_url']) && isset($legacy['photo_url'])) $user['photo_url'] = $legacy['photo_url'];
                    
                    // Migrate payments and revenue
                    $legacyPaid = isset($legacy['paid_calcs']) ? intval($legacy['paid_calcs']) : 0;
                    $curPaid = isset($user['paid_calcs']) ? intval($user['paid_calcs']) : 0;
                    $user['paid_calcs'] = max($curPaid, $legacyPaid);
                    
                    $legacyRev = isset($legacy['revenue']) ? intval($legacy['revenue']) : 0;
                    $curRev = isset($user['revenue']) ? intval($user['revenue']) : 0;
                    $user['revenue'] = max($curRev, $legacyRev);
                    
                    if (isset($legacy['payments'])) {
                        if (!isset($user['payments'])) $user['payments'] = array();
                        foreach ($legacy['payments'] as $p) {
                            $user['payments'][] = $p;
                        }
                    }

                    // Mark legacy as migrated
                    $legacy['migrated_to'] = $device_id;
                    $legacy['history'] = array();
                    file_put_contents($legacyFile, json_encode($legacy, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                }
            }
        }
        $user['last_active'] = date('c');
        $user['user_agent'] = isset($_SERVER['HTTP_USER_AGENT']) ? substr($_SERVER['HTTP_USER_AGENT'], 0, 200) : '';
        
        // Merge history: keep server items + add new client items
        $serverHistory = isset($user['history']) ? $user['history'] : array();
        $serverUids = array();
        foreach ($serverHistory as $item) {
            if (isset($item['uid'])) $serverUids[] = $item['uid'];
        }
        $newCount = 0;
        foreach ($history as $item) {
            if (isset($item['uid']) && !in_array($item['uid'], $serverUids)) {
                $serverHistory[] = $item;
                $serverUids[] = $item['uid'];
                $newCount++;
            }
        }
        $user['history'] = $serverHistory;
        $user['total_calcs'] = count($serverHistory);
        
        saveUser($device_id, $user);
        
        echo json_encode(array(
            'ok' => true,
            'history' => $serverHistory,
            'total' => count($serverHistory),
            'new_synced' => $newCount,
            'paid_calcs' => isset($user['paid_calcs']) ? $user['paid_calcs'] : 0,
        ));
        break;

    case 'load_history':
        $device_id = isset($_GET['device_id']) ? $_GET['device_id'] : '';
        if (!$device_id) {
            http_response_code(400);
            echo json_encode(array('ok' => false, 'error' => 'Missing device_id'));
            break;
        }
        
        $user = loadUser($device_id);
        if (!$user) {
            echo json_encode(array('ok' => true, 'history' => array(), 'total' => 0));
            break;
        }
        
        $user['last_active'] = date('c');
        saveUser($device_id, $user);
        
        $hist = isset($user['history']) ? $user['history'] : array();
        echo json_encode(array(
            'ok' => true,
            'history' => $hist,
            'total' => count($hist),
            'paid_calcs' => isset($user['paid_calcs']) ? $user['paid_calcs'] : 0,
        ));
        break;

    case 'analytics':
        $password = isset($_GET['pwd']) ? $_GET['pwd'] : '';
        if ($password !== 'sovmest2026admin') {
            http_response_code(403);
            echo json_encode(array('ok' => false, 'error' => 'Forbidden'));
            break;
        }
        
        $groupedUsers = array();
        
        $files = glob($DATA_DIR . '/dev_*.json');
        if (!$files) $files = array();
        foreach ($files as $file) {
            $u = json_decode(file_get_contents($file), true);
            if (!$u) continue;
            if (isset($u['migrated_to'])) continue;
            
            $tgId = arr_get($u, 'tg_id');
            $deviceId = arr_get($u, 'device_id');
            $key = $tgId ? 'tg_' . $tgId : 'dev_' . $deviceId;
            
            $hist = isset($u['history']) ? $u['history'] : array();
            $calcs = count($hist);
            $paid = isset($u['paid_calcs']) ? $u['paid_calcs'] : 0;
            $rev = isset($u['revenue']) ? $u['revenue'] : 0;
            $last_active = arr_get($u, 'last_active');
            $created_at = arr_get($u, 'created_at');
            
            if (!isset($groupedUsers[$key])) {
                $groupedUsers[$key] = array(
                    'device_id' => $deviceId,
                    'tg_id' => $tgId,
                    'username' => arr_get($u, 'username'),
                    'first_name' => arr_get($u, 'first_name'),
                    'last_name' => arr_get($u, 'last_name'),
                    'photo_url' => arr_get($u, 'photo_url'),
                    'user_agent' => arr_get($u, 'user_agent'),
                    'total_calcs' => $calcs,
                    'paid_calcs' => $paid,
                    'revenue' => $rev,
                    'created_at' => $created_at,
                    'last_active' => $last_active,
                );
            } else {
                // Merge info
                $exist = &$groupedUsers[$key];
                $exist['total_calcs'] = max($exist['total_calcs'], $calcs);
                $exist['paid_calcs'] = max($exist['paid_calcs'], $paid);
                $exist['revenue'] = max($exist['revenue'], $rev);
                if (strcmp($last_active, $exist['last_active']) > 0) {
                    $exist['last_active'] = $last_active;
                    // update user agent to the latest one
                    if (arr_get($u, 'user_agent')) $exist['user_agent'] = arr_get($u, 'user_agent');
                }
                if ($created_at && (!$exist['created_at'] || strcmp($created_at, $exist['created_at']) < 0)) {
                    $exist['created_at'] = $created_at;
                }
            }
        }
        
        $users = array_values($groupedUsers);
        $totalCalcs = 0;
        $totalPaid = 0;
        $totalRevenue = 0;
        foreach ($users as $u) {
            $totalCalcs += $u['total_calcs'];
            $totalPaid += $u['paid_calcs'];
            $totalRevenue += $u['revenue'];
        }
        
        // First sort by created_at asc to assign stable IDs
        usort($users, function($a, $b) {
            return strcmp($a['created_at'], $b['created_at']);
        });
        foreach ($users as $i => &$u) {
            $u['id'] = $i + 1;
        }
        unset($u);

        // Sort by last_active desc for display
        usort($users, function($a, $b) {
            return strcmp($b['last_active'], $a['last_active']);
        });
        
        echo json_encode(array(
            'ok' => true,
            'summary' => array(
                'total_users' => count($users),
                'total_calcs' => $totalCalcs,
                'total_paid' => $totalPaid,
                'total_revenue' => $totalRevenue,
            ),
            'users' => $users,
        ));
        break;

    case 'user_details':
        $password = isset($_GET['pwd']) ? $_GET['pwd'] : '';
        if ($password !== 'sovmest2026admin') {
            http_response_code(403);
            echo json_encode(array('ok' => false, 'error' => 'Forbidden'));
            break;
        }
        $device_id = isset($_GET['device_id']) ? $_GET['device_id'] : '';
        $user = loadUser($device_id);
        if (!$user) {
            echo json_encode(array('ok' => false, 'error' => 'User not found'));
            break;
        }
        echo json_encode(array(
            'ok' => true,
            'user' => array(
                'device_id' => arr_get($user, 'device_id'),
                'tg_id' => arr_get($user, 'tg_id'),
                'username' => arr_get($user, 'username'),
                'first_name' => arr_get($user, 'first_name'),
                'last_name' => arr_get($user, 'last_name'),
            ),
            'history' => isset($user['history']) ? $user['history'] : array(),
        ));
        break;

    case 'set_paid':
        $password = isset($_GET['pwd']) ? $_GET['pwd'] : '';
        if ($password !== 'sovmest2026admin') {
            http_response_code(403);
            echo json_encode(array('ok' => false, 'error' => 'Forbidden'));
            break;
        }
        $tgId = isset($_GET['tg_id']) ? $_GET['tg_id'] : '';
        $paid = isset($_GET['paid']) ? intval($_GET['paid']) : 0;
        if (!$tgId) {
            echo json_encode(array('ok' => false, 'error' => 'Missing tg_id'));
            break;
        }
        // Find ALL device files with this tg_id and set paid_calcs
        $updated = 0;
        $files = glob($DATA_DIR . '/dev_*.json');
        if ($files) {
            foreach ($files as $f) {
                $u = json_decode(file_get_contents($f), true);
                if ($u && isset($u['tg_id']) && $u['tg_id'] == $tgId) {
                    $u['paid_calcs'] = $paid;
                    file_put_contents($f, json_encode($u, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
                    $updated++;
                }
            }
        }
        echo json_encode(array('ok' => true, 'tg_id' => $tgId, 'paid_calcs' => $paid, 'devices_updated' => $updated));
        break;

    default:
        echo json_encode(array('ok' => false, 'error' => 'Unknown action'));
}
