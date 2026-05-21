<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
$DATA_DIR = dirname(__DIR__) . '/sovmest_data/users';
$files = glob($DATA_DIR . '/*.json');
$updated = 0;
foreach ($files as $f) {
    $u = json_decode(file_get_contents($f), true);
    if ($u && isset($u['tg_id']) && $u['tg_id'] == 302639885) {
        if (isset($u['paid_calcs'])) $u['paid_calcs'] += 1;
        else $u['paid_calcs'] = 2;
        
        $u['revenue'] = 200;
        
        if (!isset($u['payments'])) $u['payments'] = array();
        $u['payments'][] = array(
            'date' => '2026-05-20T17:22:23+03:00',
            'amount' => 100,
            'qty' => 1,
            'txn' => 'b901138c-950c-4598-b390-af7791c061c3'
        );
        file_put_contents($f, json_encode($u, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $updated++;
        echo "Updated $f <br>";
    }
}
echo "Done! Updated $updated files.";
?>