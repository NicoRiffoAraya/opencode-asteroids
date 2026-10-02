'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Shooting Star ─────────────────────────────────────────────────────────────
class ShootingStar extends Asteroid {
  constructor() {
    // Aparece en un borde aleatorio
    const side = randInt(0, 3);
    let x, y, angle;
    if (side === 0) { x = 0; y = rand(0, H); angle = rand(-Math.PI/4, Math.PI/4); } // Izquierda
    else if (side === 1) { x = W; y = rand(0, H); angle = rand(Math.PI*0.75, Math.PI*1.25); } // Derecha
    else if (side === 2) { x = rand(0, W); y = 0; angle = rand(Math.PI*0.25, Math.PI*0.75); } // Arriba
    else { x = rand(0, W); y = H; angle = rand(-Math.PI*0.75, -Math.PI*0.25); } // Abajo

    super(x, y, 1); // Tamaño pequeño base
    this.isShootingStar = true;
    this.radius = 8;
    const speed = rand(280, 420);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(2.5, 4.0);
    this.ttl = this.life;
    this.trailTimer = 0;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;

    // Efecto de estela
    this.trailTimer += dt;
    if (this.trailTimer > 0.03) {
      particles.push(new Particle(this.x, this.y, '255, 220, 50'));
      this.trailTimer = 0;
    }
  }

  draw() {
    const alpha = Math.min(1, this.ttl * 2);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2);
    
    // Brillo
    ctx.shadowBlur = 15;
    ctx.shadowColor = `rgba(255, 230, 100, ${alpha})`;
    
    ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.lineWidth = 2;

    // Forma de estrella pequeña / punta de flecha brillante
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }

  split() { return []; } // No se divide
}

// ── Enemy Bullet ──────────────────────────────────────────────────────────────
class EnemyBullet extends Bullet {
  constructor(x, y, targetX, targetY) {
    const angle = Math.atan2(targetY - y, targetX - x);
    super(x, y, angle);
    const SPEED = 250;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 2.0;
  }

  draw() {
    ctx.fillStyle = '#f55';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#f00';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// ── Saucer (Nave Enemiga) ─────────────────────────────────────────────────────
class Saucer {
  constructor() {
    this.size = randInt(1, 2); // 1 = pequeño (puntería), 2 = grande (aleatorio)
    this.radius = this.size === 1 ? 12 : 22;
    this.x = Math.random() < 0.5 ? -this.radius : W + this.radius;
    this.y = rand(50, H - 50);
    this.vx = (this.x < 0 ? 1 : -1) * rand(100, 180);
    this.vy = rand(-40, 40);
    this.shootTimer = rand(1, 2);
    this.dead = false;
    this.dirTimer = 0;
  }

  update(dt, target) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Cambiar dirección vertical ocasionalmente
    this.dirTimer += dt;
    if (this.dirTimer > 1.5) {
      this.vy = rand(-40, 40);
      this.dirTimer = 0;
    }

    // Disparar
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.size === 1 ? rand(1.2, 2.0) : rand(2.0, 3.5);
      let tx = target.x, ty = target.y;
      if (this.size === 2) { // El grande falla a propósito
        tx += rand(-100, 100);
        ty += rand(-100, 100);
      }
      enemyBullets.push(new EnemyBullet(this.x, this.y, tx, ty));
    }

    if (this.x < -100 || this.x > W + 100) this.dead = true;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#f55';
    ctx.lineWidth = 2;
    
    // Forma de platillo
    ctx.beginPath();
    ctx.moveTo(-this.radius, 0);
    ctx.lineTo(this.radius, 0);
    ctx.lineTo(this.radius * 0.6, -this.radius * 0.4);
    ctx.lineTo(-this.radius * 0.6, -this.radius * 0.4);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.5, 0);
    ctx.lineTo(this.radius * 0.5, 0);
    ctx.lineTo(this.radius * 0.3, this.radius * 0.3);
    ctx.lineTo(-this.radius * 0.3, this.radius * 0.3);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedTimer    = 0;
    this.tripleTimer   = 0;
    this.shieldEnergy  = 100;
    this.shieldActive  = false;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedTimer    > 0) this.speedTimer    -= dt;
    if (this.tripleTimer   > 0) this.tripleTimer   -= dt;

    // Escudo
    const SHIELD_DRAIN = 35; // Energía por segundo
    const SHIELD_REGEN = 15; // Energía recuperada por segundo
    
    this.shieldActive = (keys['ShiftLeft'] || keys['ShiftRight']) && this.shieldEnergy > 0;
    
    if (this.shieldActive) {
      this.shieldEnergy = Math.max(0, this.shieldEnergy - SHIELD_DRAIN * dt);
    } else {
      this.shieldEnergy = Math.min(100, this.shieldEnergy + SHIELD_REGEN * dt);
    }

    const ROT   = 3.5;   // rad/s
    let thrustVal = 260; // px/s²
    if (this.speedTimer > 0) thrustVal *= 2;

    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * thrustVal * dt;
      this.vy += Math.sin(this.angle) * thrustVal * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    
    if (this.tripleTimer > 0) {
      return [
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle - 0.15),
        new Bullet(ox, oy, this.angle + 0.15)
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = this.speedTimer > 0 ? 'rgba(0, 200, 255, 0.9)' : 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();

    // Dibujar escudo
    if (this.shieldActive) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
      
      const gradient = ctx.createRadialGradient(0, 0, this.radius + 5, 0, 0, this.radius + 15);
      const alpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.1;
      gradient.addColorStop(0, `rgba(0, 200, 255, 0)`);
      gradient.addColorStop(1, `rgba(0, 255, 255, ${alpha})`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.strokeStyle = `rgba(150, 255, 255, ${alpha + 0.2})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color = '255,255,255') {
    this.x  = x;
    this.y  = y;
    this.color = color;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${this.color},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-Ups ─────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'SPEED') {
    this.x = x;
    this.y = y;
    this.type = type; // 'SPEED' o 'TRIPLE'
    this.radius = 12;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 50);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.ttl = 10;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Circulo exterior
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.type === 'TRIPLE' ? 'rgba(255, 120, 0, 0.6)' : 'rgba(0, 100, 255, 0.6)';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Letra
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type === 'TRIPLE' ? 'T' : 'S', 0, 0);
    
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, enemyBullets, asteroids, particles, powerUps, saucer;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets      = [];
  enemyBullets = [];
  asteroids    = [];
  particles    = [];
  powerUps     = [];
  saucer       = null;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets      = [];
  enemyBullets = [];
  particles    = [];
  powerUps     = [];
  saucer       = null;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8, color = '255,255,255') {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    enemyBullets.forEach(b => b.update(dt));
    enemyBullets = enemyBullets.filter(b => !b.dead);
    if (saucer) {
      saucer.update(dt, ship);
      if (saucer.dead) saucer = null;
    }
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Aparecer estrella fugaz aleatoriamente
  if (Math.random() < 0.005) { // Aprox una cada 200 frames -> ~3 segundos a 60fps
    asteroids.push(new ShootingStar());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  enemyBullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));
  if (saucer) saucer.update(dt, ship);

  bullets      = bullets.filter(b => !b.dead);
  enemyBullets = enemyBullets.filter(b => !b.dead);
  particles    = particles.filter(p => !p.dead);
  powerUps     = powerUps.filter(p => !p.dead);
  if (saucer && saucer.dead) saucer = null;

  // Aparecer Saucer ocasionalmente
  if (!saucer && state === 'playing' && Math.random() < 0.002) {
    saucer = new Saucer();
  }

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        
        if (a.isShootingStar) {
          score += 500;
          explode(a.x, a.y, 15, '255, 230, 100');
        } else {
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
        }
        
        // Probabilidad de soltar power-up al destruir asteroide grande
        if (a.size === 3 && Math.random() < 0.25) {
          const type = Math.random() < 0.5 ? 'SPEED' : 'TRIPLE';
          powerUps.push(new PowerUp(a.x, a.y, type));
        }
      }
    }
    // Bala vs Saucer
    if (saucer && !b.dead && dist(b, saucer) < saucer.radius) {
      b.dead = true;
      saucer.dead = true;
      score += saucer.size === 1 ? 1000 : 200;
      explode(saucer.x, saucer.y, 15, '255, 100, 100');
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide / Saucer / Balas enemigas
  if (!ship.dead) {
    const shieldRadius = ship.radius + 12;
    
    // Colisiones con Asteroides
    for (const a of asteroids) {
      const d = dist(ship, a);
      if (ship.shieldActive && d < shieldRadius + a.radius) {
        // El escudo rebota o simplemente ignora el daño. 
        // Para Asteroids clásico, el escudo protege.
        // Podríamos hacer que el asteroide rebote, pero por ahora lo protegemos.
        // Destruir el asteroide al tocar el escudo? No, mejor solo proteger.
      } else if (ship.invincible <= 0 && d < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }

    // Colisiones con Balas Enemigas
    if (!ship.dead) {
      for (const eb of enemyBullets) {
        const d = dist(ship, eb);
        if (ship.shieldActive && d < shieldRadius) {
          eb.dead = true;
          explode(eb.x, eb.y, 3, '0, 255, 255');
        } else if (ship.invincible <= 0 && d < ship.radius + eb.radius) {
          eb.dead = true;
          killShip();
          break;
        }
      }
    }

    // Colisión con Saucer
    if (saucer && !ship.dead) {
      const d = dist(ship, saucer);
      if (ship.shieldActive && d < shieldRadius + saucer.radius) {
        // Protegido
      } else if (ship.invincible <= 0 && d < ship.radius + saucer.radius) {
        killShip();
      }
    }
  }

  // Nave vs PowerUp
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'TRIPLE') {
        ship.tripleTimer = 5;
      } else {
        ship.speedTimer = 5;
      }
    }
  }

  // Nivel completado
  if (asteroids.filter(a => !a.isShootingStar).length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Barras de Power-Up y Estado
  let hudY = 39;

  if (ship.speedTimer > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0cf';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('SPEED', 14, hudY + 9);
    
    const barW = 80;
    const pct = ship.speedTimer / 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, hudY, barW, 9);
    ctx.fillStyle = '#0cf';
    ctx.fillRect(60, hudY, barW * pct, 9);
    hudY += 20;
  }

  if (ship.tripleTimer > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f80';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('TRIPLE', 14, hudY + 9);
    
    const barW = 80;
    const pct = ship.tripleTimer / 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, hudY, barW, 9);
    ctx.fillStyle = '#f80';
    ctx.fillRect(60, hudY, barW * pct, 9);
    hudY += 20;
  }

  // Barra de Escudo
  ctx.textAlign = 'left';
  ctx.fillStyle = ship.shieldEnergy < 30 ? '#f55' : '#5ff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('SHIELD', 14, hudY + 9);
  
  const sBarW = 80;
  const sPct = ship.shieldEnergy / 100;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(70, hudY, sBarW, 9);
  ctx.fillStyle = ship.shieldEnergy < 30 ? '#f55' : '#5ff';
  ctx.fillRect(70, hudY, sBarW * sPct, 9);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  powerUps.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  enemyBullets.forEach(b => b.draw());
  if (saucer) saucer.draw();
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
