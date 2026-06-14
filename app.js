// --- ИНИЦИАЛИЗАЦИЯ 3D СЦЕНЫ ---
const container = document.getElementById('game-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05050a);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// Свет
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

// --- ГЕНЕРАЦИЯ КАРТЫ (ПО КАРТИНКЕ ПОЛЬЗОВАТЕЛЯ) ---
const rooms = [];
const interactiveObjects = [];

function createRoom(x, z, w, h, color, name) {
    const floorGeo = new THREE.PlaneGeometry(w, h);
    const floorMat = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = Math.PI / 2;
    floor.position.set(x, 0, z);
    scene.add(floor);
    rooms.push({ name, x, z, w, h });
}

// Строим зоны из разметки «амонг ас.png»
createRoom(0, -10, 12, 8, 0xEADAA2, "Главный Зал"); // Песочный верх
createRoom(-1, -3, 10, 6, 0xCBC6E3, "Управление"); // Фиолетовый центр
createRoom(-7, -1, 4, 10, 0x8B5A2B, "Библиотека"); // Коричневый слева
createRoom(-1, 5, 10, 6, 0xAAAAAA, "Тактический Центр / Диваны"); // Серый низ
createRoom(7, -3, 6, 16, 0xCCCCCC, "Главный Коридор"); // Серый длинный коридор справа
createRoom(12, -4, 4, 3, 0x444444, "Энергоблок"); // Черный блок справа
createRoom(12, -0.5, 4, 3, 0x7AC5CD, "Туалеты"); // Сине-голубой
createRoom(12, 3, 4, 3, 0x98F5FF, "Душевые"); // Светло-голубой

// --- СКРАФТИМ ПРЕДМЕТЫ (БЕЗ ТЕКСТОВЫХ ПОДПИСЕЙ В ИГРЕ) ---
function addObject(x, z, w, h, d, color, type) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h/2, z);
    scene.add(mesh);
    interactiveObjects.push({ mesh, type, radius: w + 1.5 });
}

// Расставляем интерактивные точки по комнате
addObject(0, -11, 2, 1, 2, 0xff0000, "EmergencyButton"); // Красная кнопка в Главном Зале
addObject(12, -4, 1.5, 1.5, 0.5, 0x00ff00, "Wires"); // Щиток в Энергоблоке
addObject(-7, -3, 1, 2.5, 5, 0x4a2e1b, "Books"); // Книжные шкафы в Библиотеке
// Люки (Вентиляция)
function addVent(x,z) { addObject(x, z, 1.2, 0.1, 1.2, 0x333333, "Vent"); }
addVent(7, -13); addVent(13, -4); addVent(13, -1); addVent(13, 2.5); addVent(-8, 7);

// --- СОЗДАЕМ ИГРОКА (Красный Космонавт) ---
const playerGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.4, 16);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xee1111 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.set(0, 0.7, -10); // Старт в Главном зале
scene.add(player);

camera.position.set(player.position.x, 11, player.position.z + 8);
camera.lookAt(player.position);

// --- НАСТРОЙКА СЕНСОРНОГО УПРАВЛЕНИЯ (МОБИЛЬНЫЙ ДЖОЙСТИК) ---
const joystickZone = document.getElementById('joystick-zone');
const joystickStick = document.getElementById('joystick-stick');
const actionBtn = document.getElementById('action-btn');

let moveVector = { x: 0, z: 0 };
let isMobile = false;

joystickZone.addEventListener('touchstart', (e) => { isMobile = true; handleJoystick(e); });
joystickZone.addEventListener('touchmove', (e) => { handleJoystick(e); });
joystickZone.addEventListener('touchend', () => {
    joystickStick.style.transform = `translate(0px, 0px)`;
    moveVector = { x: 0, z: 0 };
});

function handleJoystick(e) {
    const touch = e.touches[0];
    const rect = joystickZone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    const distance = Math.min(Math.sqrt(deltaX*deltaX + deltaY*deltaY), 50); // Лимит 50px
    
    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    
    joystickStick.style.transform = `translate(${x}px, ${y}px)`;
    
    // Переводим в игровое перемещение
    moveVector.x = (x / 50);
    moveVector.z = (y / 50);
}

// --- УПРАВЛЕНИЕ ДЛЯ ПК (КЛАВИАТУРА) ---
const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', (e) => { if(e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { if(e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = false; });

function updateMovement() {
    let speed = 0.12;
    // Если ПК управление активное
    if (!isMobile) {
        moveVector = { x: 0, z: 0 };
        if (keys.w) moveVector.z = -1;
        if (keys.s) moveVector.z = 1;
        if (keys.a) moveVector.x = -1;
        if (keys.d) moveVector.x = 1;
    }
    
    player.position.x += moveVector.x * speed;
    player.position.z += moveVector.z * speed;
    
    // Слежение камеры
    camera.position.set(player.position.x, player.position.y + 11, player.position.z + 8);
    camera.lookAt(player.position);
}

// --- ПРОВЕРКА РЯДОМ С ОБЪЕКТОМ (ТРИГГЕРЫ ЗАДАНИЙ) ---
let ActiveTarget = null;

function checkInteractions() {
    let nearSomething = false;
    for (let obj of interactiveObjects) {
        let dist = player.position.distanceTo(obj.mesh.position);
        if (dist < obj.radius) {
            nearSomething = true;
            ActiveTarget = obj;
            actionBtn.classList.add('active');
            actionBtn.disabled = false;
            break;
        }
    }
    if (!nearSomething) {
        ActiveTarget = null;
        actionBtn.classList.remove('active');
        actionBtn.disabled = true;
    }
}

// --- ИНТЕРФЕЙС, ОКНА И ЛОГИН СПИСКА ДРУЗЕЙ ---
const modal = document.getElementById('game-modal');
const voteModal = document.getElementById('voting-modal');
const modalTitle = document.getElementById('modal-title');
const closeBtns = document.querySelectorAll('.close-btn');

// Ники твоих друзей для голосования
const myFriends = ["Артем", "Максим", "София", "Данил", "Никита"];

actionBtn.addEventListener('click', () => {
    if (!ActiveTarget) return;
    
    if (ActiveTarget.type === "EmergencyButton") {
        openVoting();
    } else if (ActiveTarget.type === "Wires") {
        openMiniGame("Электрощиток: Соединить провода", "wires");
    } else if (ActiveTarget.type === "Books") {
        openMiniGame("Библиотека: Сортировка книг", "generic");
    } else if (ActiveTarget.type === "Vent") {
        // Эффект прыжка в люк
        player.position.set(7, 0.7, 5); // Перемещаем в другую вентиляцию санузла
    }
});

function openMiniGame(title, type) {
    modal.style.display = "flex";
    modalTitle.innerText = title;
    document.getElementById('wires-game-container').style.display = type === 'wires' ? 'block' : 'none';
    document.getElementById('generic-task-container').style.display = type === 'generic' ? 'block' : 'none';
}

function openVoting() {
    voteModal.style.display = "flex";
    const listHtml = document.getElementById('players-list');
    listHtml.innerHTML = "";
    myFriends.forEach(friend => {
        listHtml.innerHTML += `<div class="vote-player-card" onclick="castVote('${friend}')">🧑‍🚀 ${friend}</div>`;
    });
}

// Клик по кнопкам мини-игр
document.getElementById('connect-wire-btn').addEventListener('click', () => {
    document.getElementById('task-wires').classList.add('complete');
    document.getElementById('task-wires').innerText = "✅ Соединить провода (Выполнено)";
    closeAllModals();
});

document.getElementById('hold-task-btn').addEventListener('click', () => {
    document.getElementById('task-books').classList.add('complete');
    document.getElementById('task-books').innerText = "✅ Расставить книги (Выполнено)";
    closeAllModals();
});

function castVote(name) {
    alert(`Вы и ваши друзья проголосовали против: ${name}. ${name} не был предателем!`);
    document.getElementById('task-button').classList.add('complete');
    document.getElementById('task-button').innerText = "✅ Проверить Кнопку (Выполнено)";
    closeAllModals();
}

function closeAllModals() { modal.style.display = "none"; voteModal.style.display = "none"; }
closeBtns.forEach(btn => btn.onclick = closeAllModals);
document.getElementById('skip-vote-btn').onclick = closeAllModals;

// --- ОСНОВНОЙ ДВИЖОК ОБНОВЛЕНИЯ ---
function animate() {
    requestAnimationFrame(animate);
    updateMovement();
    checkInteractions();
    renderer.render(scene, camera);
}
animate();

// Подгонка под экран при повороте телефона
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
