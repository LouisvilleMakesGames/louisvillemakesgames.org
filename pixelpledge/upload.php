
  <?php
  declare(strict_types=1);
  header('Content-Type: application/json');

  $out = ['ok' => false, 'msg' => ''];
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok'=>false,'msg'=>'Method not allowed']);
    exit;
  }

  $email = $_POST['email'] ?? '';
  $used  = isset($_POST['used']) ? (int)$_POST['used'] : 0;
  $max   = isset($_POST['max']) ? (int)$_POST['max'] : 0;

  if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'msg'=>'Invalid email']);
    exit;
  }

  if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['ok'=>false,'msg'=>'Missing image upload']);
    exit;
  }

  $tmp = $_FILES['image']['tmp_name'];
  $info = @getimagesize($tmp);
  if ($info === false || ($info['mime'] ?? '') !== 'image/png') {
    http_response_code(400);
    echo json_encode(['ok'=>false,'msg'=>'Only PNG allowed']);
    exit;
  }

  $dir = __DIR__ . '/uploads';
  if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
  if (!is_dir($dir) || !is_writable($dir)) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'msg'=>'Upload directory not writable']);
    exit;
  }

  $safeBase = 'pixelpledge_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4));
  $dest = $dir . '/' . $safeBase . '.png';
  if (!move_uploaded_file($_FILES['image']['tmp_name'], $dest)) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'msg'=>'Failed to save file']);
    exit;
  }

  // Optional: append a simple CSV log
  $logRow = [date('c'), $email, (string)$used, (string)$max, $_SERVER['REMOTE_ADDR'] ?? '', basename($dest)];
  @file_put_contents($dir . '/log.csv', implode(',', $logRow) . "\n", FILE_APPEND | LOCK_EX);

  echo json_encode(['ok'=>true,'file'=>basename($dest)]);
  ?>
  