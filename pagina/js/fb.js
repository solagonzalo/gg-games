// Variables del juego
//Captura los elementos del DOM necesarios
const gameContainer = document.getElementById('gameContainer');
const bird = document.getElementById('bird');
const scoreElement = document.getElementById('score');
const coinsElement = document.getElementById('coins');
const gameOverScreen = document.getElementById('gameOver');
const instructions = document.getElementById('instructions');
const shieldIndicator = document.getElementById('shield-indicator');

let bgBirdTimer = null;
let gameStarted = false;
let gameActive = false;
let birdY = 250; //posición vertical del pájaro.
let birdVelocity = 0; //velocidad vertical afectada por gravedad.
let gravity = 0.16; //cuánto cae el pájaro por frame
let jumpForce = -4.2 //fuerza al saltar.

//Variables del jugador
let score = 0;
let coins = 0;
let hasShield = false;
let shieldTimer = null;

//Power-down (agrandar el pájaro)
let bigBirdActive = false;
let bigBirdTimer = null;


//Arrays de objetos de juego
let pipes = [];
let coinObjects = [];
let powerups = [];
let redPowerdown = [];
let bgBirds = [];




let pipeInterval;
let coinInterval;
let powerupInterval;
let gameLoop;
let redPowerdownInterval;


// Crear tubería
function createPipe() {
    const gap = 240;
    const minHeight = 80;
    const maxHeight = 160;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

    const pipeTop = document.createElement('div');
    pipeTop.className = 'pipe';
    pipeTop.style.left = '1200px';
    pipeTop.innerHTML = `
                <div class="pipe-cap"></div>
                <div class="pipe-top" style="height: ${topHeight}px;"></div>
            `;
    pipeTop.style.top = '0';

    const pipeBottom = document.createElement('div');
    pipeBottom.className = 'pipe';
    pipeBottom.style.left = '1200px';
    pipeBottom.innerHTML = `
                <div class="pipe-bottom" style="height: ${600 - topHeight - gap}px;"></div>
                <div class="pipe-cap"></div>
            `;
    pipeBottom.style.bottom = '0';

    gameContainer.appendChild(pipeTop);
    gameContainer.appendChild(pipeBottom);

    pipes.push({
        top: pipeTop,
        bottom: pipeBottom,
        x: 1200,
        scored: false,
        topHeight: topHeight,
        gap: gap
    });
}

// Crear moneda
function createCoin() {
    const coin = document.createElement('div');
    coin.className = 'coin';
    coin.style.left = '1200px'; //Se posiciona en X=1200 (fuera de la pantalla)
    coin.style.top = Math.random() * 400 + 100 + 'px'; //Y aleatoria
    gameContainer.appendChild(coin);
    coinObjects.push({ element: coin, x: 1200 });
}

// Crear power-up de escudo
function createPowerup() {
    const powerup = document.createElement('div');
    powerup.className = 'powerup';
    powerup.innerHTML = '<div class="shield-icon"></div>';
    powerup.style.left = '1200px';
    powerup.style.top = Math.random() * 400 + 100 + 'px';
    gameContainer.appendChild(powerup);
    powerups.push({ element: powerup, x: 1200 });
}

// Crear power-down rojo, que agranda el pájaro
function createRedPowerdown() {
    const powerup = document.createElement('div');
    powerup.className = 'powerup powerup-red'; // hereda + rojo
    powerup.innerHTML = '<div class="cross-icon"></div>'; // mismo icono, distinto color por CSS
    powerup.style.left = '1200px';
    powerup.style.top = Math.random() * 400 + 100 + 'px';
    gameContainer.appendChild(powerup);

    redPowerdown.push({ element: powerup, x: 1200 });
}

//Crear pájaros de fondo (decorativos)
function spawnBgBird() {
    const b = bird.cloneNode(true);
    b.className = "";               // limpia todas las clases
    b.removeAttribute("id");        // para no duplicar IDs
    b.classList.add("background-bird");

    b.id = "";
    b.classList.add("background-bird");

    const y = Math.random() * 300 + 50;
    b.style.top = y + "px";

    const scale = 0.2 + Math.random() * 0.3;
    b.style.transform = `scale(${scale})`;

    const speed = 1 + Math.random() * 2;
    let x = 1200;

    gameContainer.appendChild(b);

    bgBirds.push(b);

    const interval = setInterval(() => {
        x -= speed;
        b.style.left = x + "px";

        if (x < -100) {
            clearInterval(interval);
            b.remove();

            // sacarlo del array
            const index = bgBirds.indexOf(b);
            if (index !== -1) bgBirds.splice(index, 1);
        }
    }, 8);
}


function startBgBirdSpawner() {
    if (!gameActive) return;
    const delay = 800 + Math.random() * 1600; // entre 0.8 y 2.4 segundos
    spawnBgBird();
    bgBirdTimer = setTimeout(startBgBirdSpawner, delay);
}

// Activar pájaro grande
function activateBigBird() {

    if (bigBirdTimer) clearTimeout(bigBirdTimer);

    bigBirdActive = true;

    // Agranda el pájaro suavemente
    bird.style.transition = "transform 0.3s ease";

    // Volver al tamaño normal después de 6s
    bigBirdTimer = setTimeout(() => {
        bigBirdActive = false;
    }, 6000);
}



// Saltar
function jump() {
    if (!gameActive) return;
    birdVelocity = jumpForce;
    // aplicar la animación de impulso al cuerpo interno para no sobrescribir transform del padre
    const body = bird.querySelector('.bird-body');
    body.classList.add('bird-boost');
    setTimeout(() => body.classList.remove('bird-boost'), 300);
}

// Activar escudo
function activateShield() {
    hasShield = true;
    shieldIndicator.style.display = 'block';
    if (shieldTimer) clearTimeout(shieldTimer);
    shieldTimer = setTimeout(() => {
        hasShield = false;
        shieldIndicator.style.display = 'none';
    }, 5000);
}

// Detectar colisión (usa rects reales de elementos)
function checkCollision(pipe) {
    const bRect = bird.getBoundingClientRect();
    const topRect = pipe.top.getBoundingClientRect();
    const bottomRect = pipe.bottom.getBoundingClientRect();

    // Si intersecta con la parte superior o inferior de la tubería -> colisión
    const hitTop = !(bRect.right < topRect.left ||
        bRect.left > topRect.right ||
        bRect.bottom < topRect.top ||
        bRect.top > topRect.bottom);

    const hitBottom = !(bRect.right < bottomRect.left ||
        bRect.left > bottomRect.right ||
        bRect.bottom < bottomRect.top ||
        bRect.top > bottomRect.bottom);

    return hitTop || hitBottom;
}

function winGame() {
    gameActive = false;
    gameContainer.classList.add('paused');

    clearInterval(pipeInterval);
    clearInterval(coinInterval);
    clearInterval(powerupInterval);
    clearInterval(redPowerdownInterval);
    cancelAnimationFrame(gameLoop);

    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalCoins').textContent = coins;
    document.querySelector('#gameOver h1').textContent = "¡GANASTE! 🎉";
    
    gameOverScreen.style.display = 'block';

}


// Game Over
function endGame() {
    gameActive = false;
    gameContainer.classList.add('paused');

    bird.classList.add('bird-explode');

    clearInterval(pipeInterval);
    clearInterval(coinInterval);
    clearInterval(powerupInterval);
    cancelAnimationFrame(gameLoop);
    clearInterval(redPowerdownInterval);

    // // 🔥 ELIMINAR todos los pipes
    // document.querySelectorAll('.pipe').forEach(p => p.remove());

    // // 🔥 ELIMINAR todas las coins
    // document.querySelectorAll('.coin').forEach(c => c.remove());

    // // 🔥 ELIMINAR todos los powerups
    // document.querySelectorAll('.powerup').forEach(pu => pu.remove());

    // // 🔥 ELIMINAR todos los powerdowns (si los tenés con otra clase)
    // document.querySelectorAll('.powerdown').forEach(pd => pd.remove());

    // document.querySelectorAll('.powerdown').forEach(pd => pd.remove());

    // bgBirds.forEach(b => b.remove());



    setTimeout(() => {
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalCoins').textContent = coins;
        gameOverScreen.style.display = 'block';
    }, 500);
}

// Update del juego
function update() {
    if (!gameActive) return;

    // Física del pájaro
    birdVelocity += gravity;
    birdY += birdVelocity;
    bird.style.top = birdY + 'px';

    // --- CHANGED: aplicar rotación + escala aquí ANTES de leer getBoundingClientRect()
    const rotation = Math.min(Math.max(birdVelocity * 3, -30), 90);
    const scale = bigBirdActive ? 1.5 : 1;
    bird.style.transform = `rotate(${rotation}deg) scale(${scale})`;

    // Rectángulos actualizados (incluyen transform/scale)
    const birdRect = bird.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    const birdTopRelative = birdRect.top - containerRect.top;
    const birdBottomRelative = birdTopRelative + birdRect.height;
    const birdLeftRelative = birdRect.left - containerRect.left;

    // Colisión con bordes usando rect real
    if (birdTopRelative < 0 || birdBottomRelative > containerRect.height) {
        endGame();
        return;
    }

    // Actualizar tuberías
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= 2.8;
        pipe.top.style.left = pipe.x + 'px';
        pipe.bottom.style.left = pipe.x + 'px';

        // Colisión con tuberías
        if (checkCollision(pipe)) {
            if (hasShield) {
                // El escudo protege de la colisión
                hasShield = false;
                shieldIndicator.style.display = 'none';
                // Remover la tubería
                pipe.top.remove();
                pipe.bottom.remove();
                pipes.splice(i, 1);
                score += 5; // Bonus por destruir tubería
            } else {
                endGame();
                return;
            }
        }

        // Puntuación al pasar tubería: comparar con la posición real del pájaro
        // usa la izquierda real del pájaro en lugar de una constante fija
        if (!pipe.scored) {
            const pipeRect = pipe.top.getBoundingClientRect(); // top y bottom tienen misma x
            if ((pipeRect.right - containerRect.left) < birdLeftRelative) {
                pipe.scored = true;
                score++;
                scoreElement.textContent = score;
            }
        }

        // Remover tuberías fuera de pantalla
        if (pipe.x < -120) {
            pipe.top.remove();
            pipe.bottom.remove();
            pipes.splice(i, 1);
        }
    }

    // Actualizar monedas
    for (let i = coinObjects.length - 1; i >= 0; i--) {
        const coin = coinObjects[i];
        coin.x -= 4;
        coin.element.style.left = coin.x + 'px';

        // Colisión con monedas
        const coinRect = coin.element.getBoundingClientRect();
        const birdRect = bird.getBoundingClientRect();
        if (
            birdRect.left < coinRect.right &&
            birdRect.right > coinRect.left &&
            birdRect.top < coinRect.bottom &&
            birdRect.bottom > coinRect.top
            
        ) {
            // Animación del pájaro al agarrar moneda
            const body = bird.querySelector('.bird-body');
            body.classList.add('bird-coin-anim');

            // remover la animación después de 300ms (una vuelta del keyframe)
            setTimeout(() => body.classList.remove('bird-coin-anim'), 800);

            coins++;
            score += 2; //suma dos puntos al agarrar una moneda
            coinsElement.textContent = coins;
            scoreElement.textContent = score;
            coin.element.remove();
            coinObjects.splice(i, 1);
        }

        if (coin.x < -50) {
            coin.element.remove();
            coinObjects.splice(i, 1);
        }
    }

    // Actualizar power-ups azules (escudo)
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        p.x -= 4;
        p.element.style.left = p.x + 'px';

        // Colisión con escudo azul
        const pRect = p.element.getBoundingClientRect();
        const bRect = bird.getBoundingClientRect();
        if (
            bRect.left < pRect.right &&
            bRect.right > pRect.left &&
            bRect.top < pRect.bottom &&
            bRect.bottom > pRect.top
        ) {
            activateShield();
            p.element.remove();
            powerups.splice(i, 1);
        }

        if (p.x < -50) {
            p.element.remove();
            powerups.splice(i, 1);
        }
    }

    // Actualizar power-ups rojos (agrandar pájaro)
    for (let i = redPowerdown.length - 1; i >= 0; i--) {
        const powerup = redPowerdown[i];
        powerup.x -= 4.3;
        powerup.element.style.left = powerup.x + 'px';

        // Colisión
        const pRect = powerup.element.getBoundingClientRect();
        const bRect = bird.getBoundingClientRect();

        if (
            bRect.left < pRect.right &&
            bRect.right > pRect.left &&
            bRect.top < pRect.bottom &&
            bRect.bottom > pRect.top
        ) {
            activateBigBird();
            powerup.element.remove();
            redPowerdown.splice(i, 1);
        }

        if (powerup.x < -50) {
            powerup.element.remove();
            redPowerdown.splice(i, 1);
        }
    }

    if (score >= 10 && gameActive) {
    winGame();
    return;
    }

    gameLoop = requestAnimationFrame(update);
}

// Iniciar juego
function startGame() {
    gameStarted = true;
    gameActive = true;
    instructions.style.display = 'none';
    gameContainer.classList.remove('paused');
    clearTimeout(bgBirdTimer);


    birdY = 250;
    birdVelocity = 0;
    score = 0;
    coins = 0;
    hasShield = false;
    scoreElement.textContent = score;
    coinsElement.textContent = coins;
    shieldIndicator.style.display = 'none';

    // asegurar que no quede active el efecto grande de partidas anteriores
    if (bigBirdTimer) {
        clearTimeout(bigBirdTimer);
        bigBirdTimer = null;
    }
    bigBirdActive = false;
    bird.style.transform = 'rotate(0deg) scale(1)';

    // Limpiar elementos anteriores
    pipes.forEach(pipe => {
        pipe.top.remove();
        pipe.bottom.remove();
    });
    coinObjects.forEach(coin => coin.element.remove());
    powerups.forEach(powerup => powerup.element.remove());
    redPowerdown.forEach(powerup => powerup.element.remove());
    // Limpiar pajaritos de fondo
    bgBirds.forEach(b => b.remove());
    bgBirds = [];


    pipes = [];
    coinObjects = [];
    powerups = [];
    redPowerdown = [];

    bird.classList.remove('bird-explode');
    bird.style.transform = 'rotate(0deg) scale(1)';

    setTimeout(() => {
        createPipe();

        // Recién después comienza el intervalo normal
        pipeInterval = setInterval(createPipe, 2600);

    },1500);

    // Crear elementos periódicamente
    coinInterval = setInterval(createCoin, 3000);
    powerupInterval = setInterval(createPowerup, 6000);
    redPowerdownInterval = setInterval(createRedPowerdown, 8000);


    // Crear algunos elementos iniciales
    // Crea 2 monedas juntas al comienzo del juego, habria que cambiarle el tiempo
    // para separarla con la primera generada por el coinInterval.
    //setTimeout(createCoin, 2500);
    startBgBirdSpawner();

    update();
}

// Reiniciar juego
function restartGame() {
    gameOverScreen.style.display = 'none';
    document.querySelector('#gameOver h1').textContent = "¡GAME OVER!";

    startGame();
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }
});

gameContainer.addEventListener('click', jump);

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);