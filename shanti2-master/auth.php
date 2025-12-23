<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin();
        break;
    case 'logout':
        handleLogout();
        break;
    case 'verify':
        verifyToken();
        break;
    case 'register':
        handleRegister();
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
}

function handleLogin() {
    global $pdo;
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        
        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password required']);
            return;
        }
        
        $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && password_verify($password, $user['password_hash'])) {
            $token = bin2hex(random_bytes(32));
            
            $stmt = $pdo->prepare("UPDATE users SET auth_token = ?, last_login = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$token, $user['id']]);
            
            echo json_encode([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username']
                ]
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error']);
    }
}

function handleLogout() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $token = $input['token'] ?? '';
    
    if ($token) {
        $stmt = $pdo->prepare("UPDATE users SET auth_token = NULL WHERE auth_token = ?");
        $stmt->execute([$token]);
    }
    
    echo json_encode(['success' => true]);
}

function verifyToken() {
    global $pdo;
    
    $token = $_GET['token'] ?? '';
    
    if (empty($token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Token required']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT id, username FROM users WHERE auth_token = ?");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo json_encode([
            'valid' => true,
            'user' => $user
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['valid' => false]);
    }
}

function handleRegister() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    $username = $input['username'] ?? '';
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($username) || empty($email) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'All fields required']);
        return;
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'Email already exists']);
        return;
    }
    
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'Username already exists']);
        return;
    }
    
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    try {
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
        $stmt->execute([$username, $email, $passwordHash]);
        
        echo json_encode(['success' => true, 'message' => 'User registered successfully']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed']);
    }
}
?>
