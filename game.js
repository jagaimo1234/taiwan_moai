// ==========================================================================
// Game Config & Data Systems
// ==========================================================================

const MOAI_COLLECTION = [
  { id: 1, name: "クラシックモアイ", emoji: "🗿", desc: "金沢モア太郎を代表する、定番かつ究極の癒やし石調モアイ。どんなお部屋にも馴染むシンプルで愛らしい姿。", link: "https://jp.pinkoi.com/search?q=moai" },
  { id: 2, name: "黄金の招福モアイ", emoji: "🏆", desc: "豪華なゴールドコーティングを施した特別なモアイ。飾るだけで家中に金運と福を呼び込むと噂の人気作品。", link: "https://jp.pinkoi.com/search?q=moai" },
  { id: 3, name: "タピオカミルクティーモアイ", emoji: "🧋", desc: "台湾進出を記念して作られたコラボモアイ。頭にタピオカカップをのせた、とってもキュートでお茶目な姿。", link: "https://jp.pinkoi.com/search?q=moai" },
  { id: 4, name: "満開サクラモアイ", emoji: "🌸", desc: "春の日本をイメージした満開の桜模様があしらわれたモアイ。見るだけで心が温かくなる、淡く優しいピンク色。", link: "https://jp.pinkoi.com/search?q=moai" },
  { id: 5, name: "夜市ネオンモアイ", emoji: "🏮", desc: "台湾の熱気あふれる夜市をインスパイアした、鮮やかなサイバーネオンカラーモアイ。暗闇でほんのり光るかも？", link: "https://jp.pinkoi.com/search?q=moai" },
  { id: 6, name: "モアイに抱かれる作者", emoji: "🤗", desc: "立場が逆転！？大きなモアイに作者がそっと優しく抱きしめられている、クスッと笑えるシュールで心温まる限定作。", link: "https://jp.pinkoi.com/search?q=moai" }
];

// Game State Constants
const STATE_TUTORIAL = 0;
const STATE_IDLE = 1;
const STATE_CHARGING = 2;
const STATE_THROWN = 3;
const STATE_RESULT = 4;

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.state = STATE_TUTORIAL;
    
    // Loaded Assets
    this.images = {
      authorNormal: new Image(),
      authorCharge: new Image(),
      authorAttack: new Image(),
      moaiShot: new Image(),
      cyberAirplane: new Image(),
      cyberShip: new Image()
    };
    this.assetsLoaded = 0;
    this.totalAssets = 6;
    
    // Physics & Launch Settings
    this.power = 0;
    this.powerDirection = 1; // 1 = up, -1 = down
    this.powerSpeed = 2.2; // Speed of power oscillation
    this.gravity = 0.45;
    
    // Positions & Layout (relative to a 900x450 canvas)
    this.japanHeight = 350;
    this.taiwanHeight = 370;
    this.waterHeight = 410;
    
    this.authorX = 40;
    this.authorY = this.japanHeight - 90; // Adjust based on sprite
    
    // Taiwan Island target window
    this.taiwanStartX = 660;
    this.taiwanEndX = 810;
    this.targetStartX = 700; // Perfect Landing area
    this.targetEndX = 760;
    
    // Projectile state
    this.projectile = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rotation: 0,
      rotationSpeed: 0.1,
      trail: []
    };
    
    // Scoring & Collections
    this.score = 0;
    this.highScore = 0;
    this.unlockedIds = new Set();
    
    // VFX Particles
    this.particles = [];
    
    // UI Elements
    this.powerFill = document.getElementById('power-fill');
    this.btnThrow = document.getElementById('btn-throw');
    this.btnStart = document.getElementById('btn-start');
    this.tutorialOverlay = document.getElementById('tutorial-overlay');
    this.successModal = document.getElementById('success-modal');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.scoreVal = document.getElementById('score-val');
    this.highScoreVal = document.getElementById('high-score-val');
    this.collectionCount = document.getElementById('collection-count');
    this.collectionGrid = document.getElementById('collection-grid');
    this.soundToggle = document.getElementById('sound-toggle');
    
    // Sound engine properties
    this.audioCtx = null;
    this.isMuted = false;
    this.chargeOscillator = null;
    this.chargeGain = null;
    
    // Animation/Attack state frame counts
    this.attackFrameCounter = 0;
    this.resultDelayCounter = 0;
    this.resultMessage = "";
    this.resultType = ""; // "perfect", "short", "overshot"
    
    // Water wave phase
    this.wavePhase = 0;
    
    // Angry sea creatures state on ocean splash
    this.activeCreature = null;
    this.ufoEventActive = false;
    this.vietnamEventActive = false;
    this.vietnamY = 0;
    this.vietnamTimer = 0;
    this.planeHitTimer = 0;
    this.shipHitTimer = 0;

    // Deep sea floor easter egg state
    this.sunkenMoais = [];
    this.isPeekingSeaFloor = false;
    this.seaFloorCanvas = document.getElementById('sea-floor-canvas');
    this.seaFloorCtx = this.seaFloorCanvas.getContext('2d');
    this.seaFloorBubbles = [];
    for (let i = 0; i < 15; i++) {
      this.seaFloorBubbles.push({
        x: Math.random() * 560,
        y: 280 + Math.random() * 100,
        size: 1 + Math.random() * 3,
        speed: 0.5 + Math.random() * 1.5
      });
    }
    this.seaFloorGlasses = {
      x: 280,
      y: 235,
      rotation: -0.15,
      wiggleTime: 0,
      message: "",
      messageTimer: 0
    };
    
    // Init
    this.initAssets();
    this.initEvents();
    this.loadSaveData();
    this.renderCollectionGrid();
    
    // Start animation loop
    this.lastTime = 0;
    requestAnimationFrame((t) => this.loop(t));
  }

  // ==========================================================================
  // Asset Loading
  // ==========================================================================
  initAssets() {
    this.processedImages = {};
    
    const makeImageTransparent = (img) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Convert white and near-white pixels (background) to transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          
          if (r > 240 && g > 240 && b > 240) {
            data[i+3] = 0; // Alpha = 0 (Transparent)
          }
        }
        
        ctx.putImageData(imgData, 0, 0);
        return canvas;
      } catch (e) {
        console.warn("Failed to process transparency for image:", e);
        return img;
      }
    };

    const onAssetLoaded = (key) => {
      this.assetsLoaded++;
      
      if (key === 'cyberAirplane' || key === 'cyberShip') {
        this.processedImages[key] = makeImageTransparent(this.images[key]);
      }
      
      if (this.assetsLoaded === this.totalAssets) {
        console.log("All graphic assets loaded successfully.");
      }
    };

    const onAssetError = (e) => {
      console.warn("Failed to load asset, using visual fallback representation.", e);
    };

    this.images.authorNormal.src = 'boss_author.png';
    this.images.authorCharge.src = 'boss_author_charge.png';
    this.images.authorAttack.src = 'boss_author_attack.png';
    this.images.moaiShot.src = 'moai_shot.png';
    this.images.cyberAirplane.src = 'cyber_airplane.png?v=3.10';
    this.images.cyberShip.src = 'cyber_ship.png?v=3.10';

    for (let key in this.images) {
      this.images[key].onload = () => onAssetLoaded(key);
      this.images[key].onerror = onAssetError;
    }
  }

  // ==========================================================================
  // Audio Synthesizer (Web Audio API)
  // ==========================================================================
  initAudio() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API not supported in this browser.");
    }
  }

  playTone(freq, type, duration, volume = 0.1, freqSlideTo = null) {
    if (this.isMuted) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      if (this.audioCtx.state === 'suspended' && typeof this.audioCtx.resume === 'function') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      
      if (freqSlideTo) {
        osc.frequency.exponentialRampToValueAtTime(freqSlideTo, this.audioCtx.currentTime + duration);
      }
      
      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Failed to play safe audio tone:", e);
    }
  }

  startChargeSound() {
    if (this.isMuted) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      if (this.audioCtx.state === 'suspended' && typeof this.audioCtx.resume === 'function') {
        this.audioCtx.resume();
      }

      this.stopChargeSound(); // Safety reset

      this.chargeOscillator = this.audioCtx.createOscillator();
      this.chargeGain = this.audioCtx.createGain();

      this.chargeOscillator.type = 'sawtooth';
      this.chargeOscillator.frequency.setValueAtTime(150, this.audioCtx.currentTime);
      
      this.chargeGain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);

      this.chargeOscillator.connect(this.chargeGain);
      this.chargeGain.connect(this.audioCtx.destination);
      
      this.chargeOscillator.start();
    } catch (e) {
      console.warn("Failed to start charge sound safely:", e);
    }
  }

  updateChargeSound(powerPercent) {
    if (this.isMuted || !this.chargeOscillator) return;
    try {
      // Map power 0-100 to freq 150-700
      const targetFreq = 150 + (powerPercent * 5.5);
      if (this.chargeOscillator.frequency && typeof this.chargeOscillator.frequency.setTargetAtTime === 'function') {
        this.chargeOscillator.frequency.setTargetAtTime(targetFreq, this.audioCtx.currentTime, 0.05);
      }
    } catch (e) {
      console.warn("Failed to update charge sound safely:", e);
    }
  }

  stopChargeSound() {
    if (this.chargeOscillator) {
      try {
        this.chargeOscillator.stop();
        this.chargeOscillator.disconnect();
      } catch (e) {}
      this.chargeOscillator = null;
    }
    if (this.chargeGain) {
      try {
        this.chargeGain.disconnect();
      } catch (e) {}
      this.chargeGain = null;
    }
  }

  playThrowSound() {
    // Elegant quick whoosh slide
    this.playTone(350, 'triangle', 0.4, 0.2, 50);
  }

  playSplashSound() {
    // Low rumble crash
    this.playTone(180, 'sawtooth', 0.5, 0.25, 40);
  }

  playCreatureHitSound() {
    if (this.isMuted) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      if (this.audioCtx.state === 'suspended' && typeof this.audioCtx.resume === 'function') {
        this.audioCtx.resume();
      }

      // Sound 1: BONK! (Quick pitch sweeping woodblock cartoonish hitting sound)
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(650, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(190, this.audioCtx.currentTime + 0.15); // swept bonk
      
      gain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.15);

      // Sound 2: Splash low sawtooth crash starting slightly delayed (50ms)
      setTimeout(() => {
        this.playSplashSound();
      }, 50);
    } catch (e) {
      console.warn("Failed to play creature hit sound safely:", e);
      this.playSplashSound(); // direct fallback
    }
  }

  playGoddessEmergenceSound() {
    if (this.isMuted) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      if (this.audioCtx.state === 'suspended' && typeof this.audioCtx.resume === 'function') {
        this.audioCtx.resume();
      }

      // Celestial shimmering arpeggio (C Major chimes: C - E - G - C)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, index) => {
        setTimeout(() => {
          this.playTone(freq, 'sine', 0.35, 0.08);
        }, index * 70);
      });

      // Soft triangle water splash delayed
      setTimeout(() => {
        this.playTone(160, 'triangle', 0.45, 0.18);
      }, 100);
    } catch (e) {
      console.warn("Failed to play goddess sound safely:", e);
      this.playSplashSound();
    }
  }

  playOvershootSound() {
    // Sad falling beeps
    this.playTone(300, 'sine', 0.2, 0.15, 100);
    setTimeout(() => {
      this.playTone(220, 'sine', 0.3, 0.15, 70);
    }, 150);
  }

  playSuccessSound() {
    // A beautiful retro-cyber fanfare arpeggio!
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.25, 0.1);
      }, index * 80);
    });
  }

  // ==========================================================================
  // Event Listeners & Input Controls
  // ==========================================================================
  initEvents() {
    // Tutorial Start Button (Supports both click and fast touchstart)
    const handleStart = (e) => {
      if (e) {
        if (e.cancelable) e.preventDefault();
      }
      this.initAudio();
      this.state = STATE_IDLE;
      this.tutorialOverlay.classList.remove('active');
      this.tutorialOverlay.style.display = 'none'; // Instant bulletproof physical hide
    };
    this.btnStart.addEventListener('click', handleStart);
    this.btnStart.addEventListener('touchstart', handleStart, { passive: false });

    // Sound toggle
    this.soundToggle.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      if (this.isMuted) {
        this.soundToggle.classList.add('muted');
        this.soundToggle.querySelector('.icon').innerText = '🔇';
        this.stopChargeSound();
      } else {
        this.soundToggle.classList.remove('muted');
        this.soundToggle.querySelector('.icon').innerText = '🔊';
        this.initAudio();
      }
    });

    // Handle interactive throw input: hold starts charging, release throws
    const startChargeHandler = (e) => {
      if (this.state !== STATE_IDLE) return;
      if (e.cancelable) e.preventDefault();
      this.state = STATE_CHARGING;
      this.power = 0;
      this.powerDirection = 1;
      this.btnThrow.classList.add('charging');
      this.startChargeSound();
    };

    const releaseThrowHandler = (e) => {
      if (this.state !== STATE_CHARGING) return;
      if (e.cancelable) e.preventDefault();
      this.stopChargeSound();
      this.fireMoai();
    };

    // Button & Canvas mouse/touch triggers to support both desktop and mobile hold
    this.btnThrow.addEventListener('mousedown', startChargeHandler);
    this.btnThrow.addEventListener('touchstart', startChargeHandler, { passive: false });
    this.canvas.addEventListener('mousedown', startChargeHandler);
    this.canvas.addEventListener('touchstart', startChargeHandler, { passive: false });

    // Tap canvas to start game when in tutorial
    this.canvas.addEventListener('click', () => {
      if (this.state === STATE_TUTORIAL) {
        this.btnStart.click();
      }
    });

    window.addEventListener('mouseup', releaseThrowHandler);
    window.addEventListener('touchend', releaseThrowHandler);

    // Keyboard controls (Spacebar)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        if (this.state === STATE_TUTORIAL) {
          this.btnStart.click();
        } else if (this.state === STATE_IDLE) {
          startChargeHandler(e);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && this.state === STATE_CHARGING) {
        releaseThrowHandler(e);
      }
    });

    // Success modal close button (Supports both click and touchstart)
    const handleCloseModal = (e) => {
      if (e) {
        if (e.cancelable) e.preventDefault();
      }
      this.successModal.classList.remove('active');
      this.successModal.style.display = 'none'; // Instant bulletproof physical hide
      this.state = STATE_IDLE;
    };
    this.btnCloseModal.addEventListener('click', handleCloseModal);
    this.btnCloseModal.addEventListener('touchstart', handleCloseModal, { passive: false });

    // Peek Sea Floor Modal Bindings
    const btnPeekSea = document.getElementById('btn-peek-sea');
    const btnPeekSeaControls = document.getElementById('btn-peek-sea-controls');
    const seaFloorModal = document.getElementById('sea-floor-modal');
    const btnCloseSeaFloor = document.getElementById('btn-close-sea-floor');

    const openSeaFloor = (e) => {
      if (e && e.cancelable) e.preventDefault();
      this.initAudio();
      this.playGoddessEmergenceSound(); // play magical chime!
      
      seaFloorModal.style.display = 'flex';
      seaFloorModal.classList.add('active');
      document.getElementById('sunken-count-badge').innerText = `沈んだモアイ: ${this.sunkenMoais.length} 基`;

      const statusText = document.getElementById('sea-floor-status');
      if (this.sunkenMoais.length === 0) {
        statusText.innerText = "海の底はとっても綺麗です！モアイは1基も沈んでいません。";
      } else if (this.sunkenMoais.length < 5) {
        statusText.innerText = "落としてしまったモアイたちが、寂しそうに静かに海底で眠っています...";
      } else if (this.sunkenMoais.length < 15) {
        statusText.innerText = "そこそこの数のモアイが沈んでいます。海の生物たちがちょっと困惑しているようです。";
      } else {
        statusText.innerText = "おすわりモアイで海の底が埋め尽くされています！モアイの海底都市ができそうです！";
      }

      this.isPeekingSeaFloor = true;
      this.animateSeaFloor();
    };

    const closeSeaFloor = (e) => {
      if (e && e.cancelable) e.preventDefault();
      seaFloorModal.classList.remove('active');
      seaFloorModal.style.display = 'none';
      this.isPeekingSeaFloor = false;
    };

    if (btnPeekSea) {
      btnPeekSea.addEventListener('click', openSeaFloor);
      btnPeekSea.addEventListener('touchstart', openSeaFloor, { passive: false });
    }
    
    if (btnPeekSeaControls) {
      btnPeekSeaControls.addEventListener('click', openSeaFloor);
      btnPeekSeaControls.addEventListener('touchstart', openSeaFloor, { passive: false });
    }
    
    btnCloseSeaFloor.addEventListener('click', closeSeaFloor);
    btnCloseSeaFloor.addEventListener('touchstart', closeSeaFloor, { passive: false });

    // Click on Sea Floor Canvas triggers playful reactions
    this.seaFloorCanvas.addEventListener('mousedown', (e) => {
      if (!this.isPeekingSeaFloor) return;
      const rect = this.seaFloorCanvas.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * this.seaFloorCanvas.width;
      const clickY = ((e.clientY - rect.top) / rect.height) * this.seaFloorCanvas.height;

      // Check hit on glasses (2016 boat fishing easter egg!)
      const glassesDist = Math.hypot(this.seaFloorGlasses.x - clickX, this.seaFloorGlasses.y - clickY);
      if (glassesDist < 25) {
        const gl = this.seaFloorGlasses;
        gl.wiggleTime = Math.PI * 3;
        const glassesComments = [
          "2016年、船釣り中に針に引っかかって沈められたメガネです👓🎣",
          "主人が竿を振りかざした瞬間に引っかかって海の底へ…🌊",
          "あれからずっとここに沈んでいます。冷たくて静かですよ。🐚",
          "釣られるはずが釣られてしまった、悲劇のメガネが私です👓",
          "あの日、主人の竿の振り方はダイナミックでした…💥",
          "ついに発見されたか！主人、また船釣りに連れてって👓"
        ];
        gl.message = glassesComments[Math.floor(Math.random() * glassesComments.length)];
        gl.messageTimer = 130;
        this.playTone(800 + Math.random() * 200, 'sine', 0.15, 0.08);
        for (let i = 0; i < 6; i++) {
          this.seaFloorBubbles.push({
            x: gl.x + (Math.random() - 0.5) * 10,
            y: gl.y - 10,
            size: 2 + Math.random() * 3,
            speed: 0.8 + Math.random() * 1.5
          });
        }
        return;
      }

      let hitMoai = null;
      for (let moai of this.sunkenMoais) {
        const dist = Math.hypot(moai.x - clickX, moai.y - clickY);
        if (dist < 28) {
          hitMoai = moai;
          break;
        }
      }

      if (hitMoai) {
        hitMoai.wiggleTime = Math.PI * 3;
        let MoaiComments;
        if (hitMoai.type === 'ufo') {
          MoaiComments = [
            "宇宙へ帰りたい...🛸",
            "モアイ硬すぎ👽",
            "UFOキャッチャー？🕹️",
            "宇宙船修理中🔧",
            "いてて...💥",
            "星がきれいですね🌟",
            "交信中...📡",
            "何キロで投げてんの？🚀"
          ];
        } else if (hitMoai.type === 'vietnam') {
          MoaiComments = [
            "ここはベトナム？🇻🇳",
            "Xin chào! 🇻🇳",
            "Phở ngon quá! 🍜",
            "Đau đầu quá 🤕",
            "お土産のモアイ🗿",
            "シンチャオ！☕",
            "バイク多すぎ！🏍️",
            "フォー食べたい😋"
          ];
        } else {
          MoaiComments = [
            "冷たっ！🌊",
            "台湾はどっち？🧭",
            "ポチャリ...💧",
            "水深200m...🐟",
            "タピオカ飲みたい🧋",
            "モ太郎...元気かな🤗",
            "Zzz...😴",
            "底ですが何か？🗿",
            "こらー！💢",
            "息ができない😶",
            "ここ、どこ？🗺️",
            "流れ星かな？💫"
          ];
        }
        hitMoai.message = MoaiComments[Math.floor(Math.random() * MoaiComments.length)];
        hitMoai.messageTimer = 100;
        this.playTone(600 + Math.random() * 400, 'sine', 0.15, 0.08);
        for (let i = 0; i < 6; i++) {
          this.seaFloorBubbles.push({
            x: hitMoai.x + (Math.random() - 0.5) * 10,
            y: hitMoai.y - 12,
            size: 2 + Math.random() * 3,
            speed: 0.8 + Math.random() * 1.5
          });
        }
      } else {
        this.playTone(1000, 'sine', 0.06, 0.03);
        this.seaFloorBubbles.push({
          x: clickX,
          y: clickY,
          size: 3 + Math.random() * 2,
          speed: 1 + Math.random() * 1.5
        });
      }
    });

    this.seaFloorCanvas.addEventListener('touchstart', (e) => {
      if (!this.isPeekingSeaFloor) return;
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = this.seaFloorCanvas.getBoundingClientRect();
      const clickX = ((touch.clientX - rect.left) / rect.width) * this.seaFloorCanvas.width;
      const clickY = ((touch.clientY - rect.top) / rect.height) * this.seaFloorCanvas.height;

      // Check hit on glasses (2016 boat fishing easter egg!)
      const glassesDist = Math.hypot(this.seaFloorGlasses.x - clickX, this.seaFloorGlasses.y - clickY);
      if (glassesDist < 25) {
        const gl = this.seaFloorGlasses;
        gl.wiggleTime = Math.PI * 3;
        const glassesComments = [
          "2016年、船釣り中に針に引っかかって沈められたメガネです👓🎣",
          "主人が竿を振りかざした瞬間に引っかかって海の底へ…🌊",
          "あれからずっとここに沈んでいます。冷たくて静かですよ。🐚",
          "釣られるはずが釣られてしまった、悲劇のメガネが私です👓",
          "あの日、主人の竿の振り方はダイナミックでした…💥",
          "ついに発見されたか！主人、また船釣りに連れてって👓"
        ];
        gl.message = glassesComments[Math.floor(Math.random() * glassesComments.length)];
        gl.messageTimer = 130;
        this.playTone(800 + Math.random() * 200, 'sine', 0.15, 0.08);
        for (let i = 0; i < 6; i++) {
          this.seaFloorBubbles.push({
            x: gl.x + (Math.random() - 0.5) * 10,
            y: gl.y - 10,
            size: 2 + Math.random() * 3,
            speed: 0.8 + Math.random() * 1.5
          });
        }
        return;
      }

      let hitMoai = null;
      for (let moai of this.sunkenMoais) {
        const dist = Math.hypot(moai.x - clickX, moai.y - clickY);
        if (dist < 28) {
          hitMoai = moai;
          break;
        }
      }

      if (hitMoai) {
        hitMoai.wiggleTime = Math.PI * 3;
        let MoaiComments;
        if (hitMoai.type === 'ufo') {
          MoaiComments = [
            "宇宙へ帰りたい...🛸",
            "モアイ硬すぎ👽",
            "UFOキャッチャー？🕹️",
            "宇宙船修理中🔧",
            "いてて...💥",
            "星がきれいですね🌟",
            "交信中...📡",
            "何キロで投げてんの？🚀"
          ];
        } else if (hitMoai.type === 'vietnam') {
          MoaiComments = [
            "ここはベトナム？🇻🇳",
            "Xin chào! 🇻🇳",
            "Phở ngon quá! 🍜",
            "Đau đầu quá 🤕",
            "お土産のモアイ🗿",
            "シンチャオ！☕",
            "バイク多すぎ！🏍️",
            "フォー食べたい😋"
          ];
        } else {
          MoaiComments = [
            "冷たっ！🌊",
            "台湾はどっち？🧭",
            "ポチャリ...💧",
            "水深200m...🐟",
            "タピオ加飲みたい🧋",
            "モ太郎...元気かな🤗",
            "Zzz...😴",
            "底ですが何か？🗿",
            "こらー！💢",
            "息ができない😶",
            "ここ、どこ？🗺️",
            "流れ星かな？💫"
          ];
        }
        hitMoai.message = MoaiComments[Math.floor(Math.random() * MoaiComments.length)];
        hitMoai.messageTimer = 100;
        this.playTone(600 + Math.random() * 400, 'sine', 0.15, 0.08);
        for (let i = 0; i < 6; i++) {
          this.seaFloorBubbles.push({
            x: hitMoai.x + (Math.random() - 0.5) * 10,
            y: hitMoai.y - 12,
            size: 2 + Math.random() * 3,
            speed: 0.8 + Math.random() * 1.5
          });
        }
      } else {
        this.playTone(1000, 'sine', 0.06, 0.03);
        this.seaFloorBubbles.push({
          x: clickX,
          y: clickY,
          size: 3 + Math.random() * 2,
          speed: 1 + Math.random() * 1.5
        });
      }
    }, { passive: true });
  }

  // ==========================================================================
  // Save & Storage System
  // ==========================================================================
  loadSaveData() {
    try {
      const savedScore = localStorage.getItem('moai_high_score');
      if (savedScore) {
        this.highScore = parseInt(savedScore, 10);
        this.highScoreVal.innerText = this.highScore;
      }
      
      const savedUnlocked = localStorage.getItem('moai_unlocked_ids');
      if (savedUnlocked) {
        const ids = JSON.parse(savedUnlocked);
        ids.forEach(id => this.unlockedIds.add(id));
      }

      const savedSunken = localStorage.getItem('moai_sunken_moais');
      if (savedSunken) {
        this.sunkenMoais = JSON.parse(savedSunken);
      }

      this.updateCollectionCountUI();
    } catch(e) {
      console.warn("Storage access restricted or unavailable.");
    }
  }

  saveData() {
    try {
      localStorage.setItem('moai_high_score', this.highScore.toString());
      localStorage.setItem('moai_unlocked_ids', JSON.stringify(Array.from(this.unlockedIds)));
      localStorage.setItem('moai_sunken_moais', JSON.stringify(this.sunkenMoais));
    } catch(e) {
      console.warn("Failed to write to local storage.");
    }
  }

  // ==========================================================================
  // Core Game Logic
  // ==========================================================================
  fireMoai() {
    this.state = STATE_THROWN;
    this.btnThrow.classList.remove('charging');
    this.playThrowSound();
    
    this.attackFrameCounter = 30; // Display throwing sprite for 30 frames
    
    // Projectile init
    this.projectile.x = this.authorX + 40;
    this.projectile.y = this.authorY + 20;
    
    // Convert power percentage to launch velocity
    // Angle: 43 degrees
    const angle = -43 * Math.PI / 180;
    
    // Power scale map (power goes 0 to 100)
    // Adjust power range so target area (~730 px distance) matches around 70-75% charge
    const minVel = 4;
    const maxVel = 26;
    const launchSpeed = minVel + (this.power / 100) * (maxVel - minVel);
    
    this.projectile.vx = launchSpeed * Math.cos(angle);
    this.projectile.vy = launchSpeed * Math.sin(angle);
    this.projectile.rotation = 0;
    this.projectile.rotationSpeed = 0.05 + (this.power / 100) * 0.15;
    this.projectile.trail = [];
  }

  // ==========================================================================
  // Canvas Map Rendering
  // ==========================================================================
  drawSky(width, height) {
    // Beautiful dynamic sky with stars
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#06040d');
    gradient.addColorStop(0.5, '#120c2b');
    gradient.addColorStop(1, '#1b133b');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);

    // Stars
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let i = 0; i < 40; i++) {
      const starX = (Math.sin(i * 123) * 0.5 + 0.5) * width;
      const starY = (Math.cos(i * 456) * 0.5 + 0.5) * (this.japanHeight - 50);
      const size = (Math.sin(i + this.wavePhase * 0.05) * 0.5 + 0.5) * 1.5 + 0.5;
      this.ctx.beginPath();
      this.ctx.arc(starX, starY, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawMap(width, height) {
    // 0. Draw a cruising high-altitude Airplane (飛行機) in the sky!
    this.ctx.save();
    const planeX = ((this.wavePhase * 25) % (width + 300)) - 150;
    const planeY = 65 + Math.sin(this.wavePhase * 0.05) * 8;
    this.ctx.translate(planeX, planeY);
    this.ctx.rotate(-0.04);
    
    const sprite = this.processedImages.cyberAirplane || this.images.cyberAirplane;
    if (this.images.cyberAirplane.complete && this.images.cyberAirplane.naturalWidth !== 0) {
      // Draw flat cartoon airplane centered
      this.ctx.drawImage(sprite, -26, -14, 52, 28);
    } else {
      // Cyan electric glow fallback emoji
      this.ctx.shadowColor = '#00f0ff';
      this.ctx.shadowBlur = 10;
      this.ctx.font = '18px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText("✈️", 0, 0);
    }
    
    // Draw plane speech bubble if hit
    if (this.planeHitTimer > 0) {
      this.planeHitTimer--;
      this.ctx.save();
      
      this.ctx.font = 'bold 11px "Noto Sans JP", sans-serif';
      const text = "こらー！！💢";
      const textWidth = this.ctx.measureText(text).width;
      const bubbleW = textWidth + 14;
      const bubbleH = 22;
      const bubbleX = -bubbleW / 2;
      const bubbleY = 20; // below the plane
      
      // Bubble tail pointing up to plane
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#08060f';
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      this.ctx.moveTo(-5, bubbleY + 1);
      this.ctx.lineTo(0, 14);
      this.ctx.lineTo(5, bubbleY + 1);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Bubble body
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 4);
      } else {
        this.ctx.rect(bubbleX, bubbleY, bubbleW, bubbleH);
      }
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#08060f';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(text, 0, bubbleY + 14);
      this.ctx.restore();
    }
    
    this.ctx.restore();

    // ------------------------------------------------------------------------
    // JAPAN LANDSCAPE DECORATIONS (Left)
    // ------------------------------------------------------------------------
    // 1. Stylized Golden-Pink Cyber Rising Sun (日の出)
    this.ctx.save();
    const sunGrad = this.ctx.createLinearGradient(0, 160, 0, this.japanHeight);
    sunGrad.addColorStop(0, '#ff2a7a'); // Cyber Pink
    sunGrad.addColorStop(1, '#ffd700'); // Cyber Gold
    this.ctx.fillStyle = sunGrad;
    this.ctx.shadowColor = '#ff2a7a';
    this.ctx.shadowBlur = 25;
    this.ctx.globalAlpha = 0.22;
    this.ctx.beginPath();
    this.ctx.arc(80, this.japanHeight - 20, 65, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // 2. Mount Fuji Silhouette
    this.ctx.save();
    // Fuji base
    this.ctx.fillStyle = "rgba(22, 17, 52, 0.75)";
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.japanHeight);
    this.ctx.lineTo(75, 195);
    this.ctx.lineTo(125, 195);
    this.ctx.lineTo(205, this.japanHeight);
    this.ctx.closePath();
    this.ctx.fill();

    // Fuji Snowcap (glowing white overlay)
    const capGrad = this.ctx.createLinearGradient(0, 195, 0, 235);
    capGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    capGrad.addColorStop(1, 'rgba(255, 42, 122, 0.15)'); // bleeds into cyber pink
    this.ctx.fillStyle = capGrad;
    this.ctx.beginPath();
    this.ctx.moveTo(56, 230);
    this.ctx.lineTo(75, 195);
    this.ctx.lineTo(125, 195);
    this.ctx.lineTo(144, 230);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    // 3. Falling Cherry Blossom (Sakura) Petals over Japan
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 183, 197, 0.85)';
    this.ctx.shadowColor = '#ffb7c5';
    this.ctx.shadowBlur = 4;
    
    // Animate 4 floating petals based on wavePhase
    const petals = [
      { bx: 25, by: 160, rx: 12, ry: 150, scale: 3.5 },
      { bx: 80, by: 130, rx: 18, ry: 190, scale: 4.5 },
      { bx: 135, by: 150, rx: 14, ry: 160, scale: 3.0 },
      { bx: 50, by: 180, rx: 10, ry: 120, scale: 4.0 }
    ];
    
    petals.forEach((p, idx) => {
      const px = p.bx + Math.sin(this.wavePhase * 0.4 + idx) * p.rx;
      const py = p.by + ((this.wavePhase * p.scale) % p.ry);
      this.ctx.save();
      this.ctx.translate(px, py);
      this.ctx.rotate(this.wavePhase * 0.12 + idx);
      this.ctx.beginPath();
      // Draw lovely sakura leaf/petal shape
      this.ctx.ellipse(0, 0, 4.5, 2.5, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
    this.ctx.restore();

    // 4. Draw JAPAN ISLAND base (Organic sloping island!)
    this.ctx.save();
    
    // Earth/Stone base gradient
    const japanBaseGrad = this.ctx.createLinearGradient(0, this.japanHeight, 0, height);
    japanBaseGrad.addColorStop(0, '#2b1e56');
    japanBaseGrad.addColorStop(1, '#0e0821');
    this.ctx.fillStyle = japanBaseGrad;
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.japanHeight);
    this.ctx.lineTo(130, this.japanHeight);
    // Slope down to the water line organically
    this.ctx.quadraticCurveTo(150, this.japanHeight + 10, 160, this.waterHeight);
    this.ctx.lineTo(160, height);
    this.ctx.lineTo(0, height);
    this.ctx.closePath();
    this.ctx.fill();

    // Grassy lush top layer (beautiful neon pink grass top!)
    const japanGrassGrad = this.ctx.createLinearGradient(0, this.japanHeight - 4, 0, this.japanHeight + 8);
    japanGrassGrad.addColorStop(0, '#ff4081'); // Neon Pink grass top
    japanGrassGrad.addColorStop(1, '#3f1c56');
    this.ctx.fillStyle = japanGrassGrad;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.japanHeight - 4);
    this.ctx.lineTo(130, this.japanHeight - 4);
    this.ctx.quadraticCurveTo(148, this.japanHeight + 6, 156, this.japanHeight + 16);
    this.ctx.lineTo(148, this.japanHeight + 16);
    this.ctx.lineTo(125, this.japanHeight + 8);
    this.ctx.lineTo(0, this.japanHeight + 8);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Land top rim glowing laser pink line
    this.ctx.strokeStyle = varColor('--cyber-pink');
    this.ctx.lineWidth = 3.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.japanHeight - 4);
    this.ctx.lineTo(130, this.japanHeight - 4);
    this.ctx.stroke();
    this.ctx.restore();

    // Sign "JAPAN" (drawn inside ground face)
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.font = 'bold 10px ' + varColor('--font-display');
    this.ctx.shadowColor = '#000000';
    this.ctx.shadowBlur = 4;
    this.ctx.fillText("📍 JAPAN / 日本", 18, this.japanHeight + 35);
    this.ctx.restore();

    // ------------------------------------------------------------------------
    // TAIWAN LANDSCAPE DECORATIONS (Right)
    // ------------------------------------------------------------------------
    // 1. Stylized overlapping Mountain Silhouette
    this.ctx.save();
    this.ctx.fillStyle = "rgba(8, 30, 36, 0.7)";
    this.ctx.beginPath();
    this.ctx.moveTo(630, this.taiwanHeight);
    this.ctx.quadraticCurveTo(690, 240, 750, this.taiwanHeight);
    this.ctx.moveTo(710, this.taiwanHeight);
    this.ctx.quadraticCurveTo(775, 220, 840, this.taiwanHeight);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();

    // 2. Premium Detailed Taipei 101 tower silhouette
    const tX = 775;
    this.ctx.save();
    this.ctx.fillStyle = "rgba(10, 38, 45, 0.9)";
    this.ctx.beginPath();
    this.ctx.moveTo(tX, this.taiwanHeight);
    this.ctx.lineTo(tX, this.taiwanHeight - 110);
    this.ctx.lineTo(tX - 3, this.taiwanHeight - 105);
    this.ctx.lineTo(tX - 3, this.taiwanHeight - 96);
    for (let step = 0; step < 5; step++) {
      const topy = this.taiwanHeight - 20 - (step * 14);
      this.ctx.lineTo(tX - 10, topy);
      this.ctx.lineTo(tX - 10, topy + 8);
      this.ctx.lineTo(tX - 4, topy + 14);
    }
    this.ctx.lineTo(tX - 15, this.taiwanHeight);
    this.ctx.closePath();
    this.ctx.fill();

    // Glowing golden lights on Taipei 101 sections
    this.ctx.fillStyle = '#ffd700';
    this.ctx.shadowColor = '#ffd700';
    this.ctx.shadowBlur = 6;
    // Section center window dots
    for (let step = 0; step < 5; step++) {
      const topy = this.taiwanHeight - 14 - (step * 14);
      this.ctx.fillRect(tX - 8, topy, 2, 2);
      this.ctx.fillRect(tX - 6, topy, 2, 2);
      this.ctx.fillRect(tX - 4, topy, 2, 2);
    }
    // Beacon light at the very tip!
    this.ctx.beginPath();
    this.ctx.arc(tX - 2, this.taiwanHeight - 108, 2.5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // 3. Floating Pingxi Sky Lanterns (天燈) over Taiwan
    this.ctx.save();
    const lanterns = [
      { bx: 660, by: 270, rx: 12, ry: 220, scale: 2.2, size: 7 },
      { bx: 815, by: 210, rx: 18, ry: 180, scale: 1.8, size: 9 },
      { bx: 735, by: 250, rx: 10, ry: 200, scale: 2.0, size: 8 }
    ];
    
    lanterns.forEach((l, idx) => {
      const lx = l.bx + Math.sin(this.wavePhase * 0.35 + idx) * l.rx;
      const ly = l.by - ((this.wavePhase * l.scale * 8) % l.ry);
      if (ly > 20) { // Keep above sea level and inside frame
        this.ctx.save();
        this.ctx.translate(lx, ly);
        
        // Glow shadow
        this.ctx.shadowColor = '#ff5722';
        this.ctx.shadowBlur = 12;
        
        // Lantern body gradient (orange-red warm glow)
        const lg = this.ctx.createLinearGradient(0, -l.size, 0, l.size);
        lg.addColorStop(0, '#ff3d00'); // top red
        lg.addColorStop(0.7, '#ff9100'); // mid orange
        lg.addColorStop(1, '#ffea00'); // bottom yellow glow
        
        this.ctx.fillStyle = lg;
        this.ctx.beginPath();
        // Traditional trapezoidal sky lantern shape
        this.ctx.moveTo(-l.size * 0.7, -l.size);
        this.ctx.lineTo(l.size * 0.7, -l.size);
        this.ctx.lineTo(l.size * 0.9, l.size);
        this.ctx.lineTo(-l.size * 0.9, l.size);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Tiny fire base flame glow
        this.ctx.shadowColor = '#ffd700';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, l.size + 1, 1.8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }
    });
    this.ctx.restore();

    // 4. Draw TAIWAN ISLAND base (Organic sloping island shape!)
    this.ctx.save();
    
    // Earth/Stone base gradient (Taiwan deep teal earth)
    const taiwanBaseGrad = this.ctx.createLinearGradient(0, this.taiwanHeight, 0, height);
    taiwanBaseGrad.addColorStop(0, '#0c3533');
    taiwanBaseGrad.addColorStop(1, '#031414');
    this.ctx.fillStyle = taiwanBaseGrad;
    
    this.ctx.beginPath();
    // Start on the water line on the left
    this.ctx.moveTo(this.taiwanStartX - 35, this.waterHeight);
    // Slope up to the plateau
    this.ctx.quadraticCurveTo(this.taiwanStartX - 10, this.taiwanHeight + 10, this.taiwanStartX + 10, this.taiwanHeight);
    this.ctx.lineTo(this.taiwanEndX, this.taiwanHeight);
    // Slope down to the water line on the right
    this.ctx.quadraticCurveTo(this.taiwanEndX + 20, this.taiwanHeight + 10, this.taiwanEndX + 45, this.waterHeight);
    this.ctx.lineTo(this.taiwanEndX + 45, height);
    this.ctx.lineTo(this.taiwanStartX - 35, height);
    this.ctx.closePath();
    this.ctx.fill();

    // Grassy lush top layer (beautiful emerald green!)
    const taiwanGrassGrad = this.ctx.createLinearGradient(0, this.taiwanHeight - 4, 0, this.taiwanHeight + 8);
    taiwanGrassGrad.addColorStop(0, '#00ffaa'); // Emerald green grass top
    taiwanGrassGrad.addColorStop(1, '#052c28');
    this.ctx.fillStyle = taiwanGrassGrad;
    this.ctx.beginPath();
    this.ctx.moveTo(this.taiwanStartX - 15, this.taiwanHeight + 10);
    this.ctx.quadraticCurveTo(this.taiwanStartX - 5, this.taiwanHeight - 4, this.taiwanStartX + 10, this.taiwanHeight - 4);
    this.ctx.lineTo(this.taiwanEndX, this.taiwanHeight - 4);
    this.ctx.quadraticCurveTo(this.taiwanEndX + 15, this.taiwanHeight - 4, this.taiwanEndX + 25, this.taiwanHeight + 10);
    this.ctx.lineTo(this.taiwanEndX + 10, this.taiwanHeight + 8);
    this.ctx.lineTo(this.taiwanStartX + 5, this.taiwanHeight + 8);
    this.ctx.closePath();
    this.ctx.fill();

    // Taiwan Island Glow Top Rim (Cyan Neon Laser Edge)
    this.ctx.strokeStyle = varColor('--cyber-blue');
    this.ctx.lineWidth = 3.5;
    this.ctx.beginPath();
    this.ctx.moveTo(this.taiwanStartX + 10, this.taiwanHeight - 4);
    this.ctx.lineTo(this.taiwanEndX, this.taiwanHeight - 4);
    this.ctx.stroke();
    this.ctx.restore();

    // Sign "TAIWAN" (drawn inside ground face)
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.font = 'bold 10px ' + varColor('--font-display');
    this.ctx.shadowColor = '#000000';
    this.ctx.shadowBlur = 4;
    this.ctx.fillText("📍 TAIWAN / 台湾", this.taiwanStartX + 20, this.taiwanHeight + 35);
    this.ctx.restore();

    // 3. TARGET LANDING PAD (Glowing emerald green)
    const landingPadGrad = this.ctx.createLinearGradient(this.targetStartX, 0, this.targetEndX, 0);
    landingPadGrad.addColorStop(0, 'rgba(0, 255, 170, 0.1)');
    landingPadGrad.addColorStop(0.5, 'rgba(0, 255, 170, 0.7)');
    landingPadGrad.addColorStop(1, 'rgba(0, 255, 170, 0.1)');
    
    this.ctx.fillStyle = landingPadGrad;
    this.ctx.fillRect(this.targetStartX, this.taiwanHeight - 6, this.targetEndX - this.targetStartX, 6);

    // Target pad neon border
    this.ctx.strokeStyle = varColor('--success-green');
    this.ctx.lineWidth = 2.5;
    this.ctx.shadowColor = varColor('--success-green');
    this.ctx.shadowBlur = 10;
    this.ctx.strokeRect(this.targetStartX, this.taiwanHeight - 6, this.targetEndX - this.targetStartX, 6);
    this.ctx.shadowBlur = 0; // Reset shadow

    // "LAND HERE" Text floating
    this.ctx.fillStyle = varColor('--success-green');
    this.ctx.font = '900 8.5px ' + varColor('--font-display');
    this.ctx.textAlign = 'center';
    this.ctx.fillText("PINKOI SHOT🎯", (this.targetStartX + this.targetEndX) / 2, this.taiwanHeight - 14);
    this.ctx.textAlign = 'left'; // Reset
  }

  drawOcean(width, height) {
    // Animated fluids waving
    const fluidGrad = this.ctx.createLinearGradient(0, this.waterHeight, 0, height);
    fluidGrad.addColorStop(0, 'rgba(11, 41, 102, 0.85)');
    fluidGrad.addColorStop(1, 'rgba(5, 18, 48, 0.95)');
    
    this.ctx.fillStyle = fluidGrad;
    
    // Wave 1
    this.ctx.beginPath();
    this.ctx.moveTo(150, height);
    this.ctx.lineTo(150, this.waterHeight);
    
    for (let x = 150; x <= width; x += 10) {
      const waveAmplitude = 5;
      const waveFreq = 0.02;
      const y = this.waterHeight + Math.sin(x * waveFreq + this.wavePhase) * waveAmplitude;
      this.ctx.lineTo(x, y);
    }
    
    this.ctx.lineTo(width, height);
    this.ctx.closePath();
    this.ctx.fill();

    // Wave 2 (foreground overlay for depth)
    this.ctx.fillStyle = 'rgba(0, 240, 255, 0.07)';
    this.ctx.beginPath();
    this.ctx.moveTo(150, height);
    this.ctx.lineTo(150, this.waterHeight + 5);
    
    for (let x = 150; x <= width; x += 15) {
      const waveAmplitude = 4;
      const waveFreq = 0.015;
      const y = (this.waterHeight + 4) + Math.cos(x * waveFreq + this.wavePhase * 1.3) * waveAmplitude;
      this.ctx.lineTo(x, y);
    }
    
    this.ctx.lineTo(width, height);
    this.ctx.closePath();
    this.ctx.fill();

    // 3. Draw a bobbing cruise Ship (船) cruising between Japan and Taiwan!
    this.ctx.save();
    const shipX = 320 + Math.sin(this.wavePhase * 0.08) * 90;
    const shipY = this.waterHeight - 8 + Math.sin(this.wavePhase * 0.4) * 2;
    const shipRotation = Math.cos(this.wavePhase * 0.4) * 0.03;
    
    this.ctx.translate(shipX, shipY);
    this.ctx.rotate(shipRotation);
    
    const shipDir = Math.cos(this.wavePhase * 0.08) > 0 ? 1 : -1;
    if (shipDir === -1) {
      this.ctx.scale(-1, 1);
    }
    
    const shipSprite = this.processedImages.cyberShip || this.images.cyberShip;
    if (this.images.cyberShip.complete && this.images.cyberShip.naturalWidth !== 0) {
      // Draw flat cartoon ship centered on the water line (y offset adjusted to sit nicely)
      this.ctx.drawImage(shipSprite, -27, -24, 54, 30);
    } else {
      // Premium neon orange-glow shadow fallback emoji
      this.ctx.shadowColor = '#ffb74d';
      this.ctx.shadowBlur = 8;
      this.ctx.font = '20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText("🚢", 0, 0);
    }
    
    // Draw ship speech bubble if hit
    if (this.shipHitTimer > 0) {
      this.shipHitTimer--;
      this.ctx.save();
      
      // Make sure the bubble doesn't inherit the scale(-1, 1) flip of the ship!
      if (shipDir === -1) {
        this.ctx.scale(-1, 1);
      }
      
      this.ctx.font = 'bold 11px "Noto Sans JP", sans-serif';
      const text = "こらー！！💢";
      const textWidth = this.ctx.measureText(text).width;
      const bubbleW = textWidth + 14;
      const bubbleH = 22;
      const bubbleX = -bubbleW / 2;
      const bubbleY = -48; // above the ship
      
      // Bubble tail pointing down to ship
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#08060f';
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      this.ctx.moveTo(-5, bubbleY + bubbleH - 1);
      this.ctx.lineTo(0, -26);
      this.ctx.lineTo(5, bubbleY + bubbleH - 1);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Bubble body
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 4);
      } else {
        this.ctx.rect(bubbleX, bubbleY, bubbleW, bubbleH);
      }
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#08060f';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(text, 0, bubbleY + 14);
      this.ctx.restore();
    }
    
    this.ctx.restore();
  }

  // ==========================================================================
  // Sprite Rendering
  // ==========================================================================
  drawAuthor() {
    let sprite = this.images.authorNormal;
    let width = 72;
    let height = 90;
    let xOffset = 0;
    let yOffset = 0;
    
    if (this.state === STATE_CHARGING) {
      sprite = this.images.authorCharge;
      // Charging body shake vibration
      xOffset = (Math.random() - 0.5) * (this.power / 25);
      yOffset = (Math.random() - 0.5) * (this.power / 25);
    } else if (this.state === STATE_THROWN && this.attackFrameCounter > 0) {
      sprite = this.images.authorAttack;
    }

    // Verify if image is loaded, otherwise render high quality fallback vectors
    if (sprite.complete && sprite.naturalWidth !== 0) {
      this.ctx.drawImage(sprite, this.authorX + xOffset, this.authorY + yOffset, width, height);
    } else {
      // High-quality modern replacement avatar
      this.ctx.save();
      this.ctx.translate(this.authorX + width/2 + xOffset, this.authorY + height/2 + yOffset);
      
      // Face/Body
      this.ctx.fillStyle = varColor('--cyber-pink');
      this.ctx.beginPath();
      this.ctx.arc(0, -10, 24, 0, Math.PI*2);
      this.ctx.fill();
      
      // Torso
      this.ctx.fillStyle = varColor('--bg-card');
      this.ctx.strokeStyle = varColor('--cyber-pink');
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(-20, 20);
      this.ctx.lineTo(20, 20);
      this.ctx.lineTo(15, 45);
      this.ctx.lineTo(-15, 45);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Fun hair/glasses detail
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 10px ' + varColor('--font-display');
      this.ctx.textAlign = 'center';
      this.ctx.fillText("AUTHOR", 0, -8);
      
      this.ctx.restore();
    }
  }

  drawUFO() {
    if (!this.ufoEventActive) return;
    
    // UFO is in outer space (off-screen) during hit, only draw it when falling!
    if (this.ufoState === 'falling') {
      this.ctx.save();
      this.ctx.translate(this.ufoX, this.ufoY);
      this.ctx.rotate(this.ufoRotation);
      
      // Premium cyan neon glow for maximum high-contrast visibility!
      this.ctx.shadowColor = '#00f0ff';
      this.ctx.shadowBlur = 24;
      
      this.ctx.font = 'bold 54px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText("🛸", 0, 0);
      
      // Thick high-contrast dark drop outline behind the emoji to pop against dynamic backgrounds
      this.ctx.strokeStyle = '#08060f';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeText("🛸", 0, 0);
      
      this.ctx.restore();
    }
    
    // "いてっ！" Speech Bubble appearing at screen top, pointing UP to the space hit
    if (this.ufoState === 'hit') {
      this.ctx.save();
      this.ctx.font = 'bold 13px "Noto Sans JP", sans-serif';
      const text = "いてっ！";
      const textWidth = this.ctx.measureText(text).width;
      const bubbleW = textWidth + 18;
      const bubbleH = 26;
      const bubbleX = this.ufoX - bubbleW / 2;
      const bubbleY = 24; // Standard position at top ceiling
      
      // bubble tail pointing UPWARDS to space
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#08060f';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(this.ufoX - 6, bubbleY + 1);
      this.ctx.lineTo(this.ufoX, 4);
      this.ctx.lineTo(this.ufoX + 6, bubbleY + 1);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // bubble body
      this.ctx.beginPath();
      const r = 6;
      this.ctx.moveTo(bubbleX + r, bubbleY);
      this.ctx.lineTo(bubbleX + bubbleW - r, bubbleY);
      this.ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r);
      this.ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r);
      this.ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH);
      this.ctx.lineTo(bubbleX + r, bubbleY + bubbleH);
      this.ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - r);
      this.ctx.lineTo(bubbleX, bubbleY + r);
      this.ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + r, bubbleY);
      this.ctx.closePath();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#08060f';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(text, this.ufoX, bubbleY + 17);
      this.ctx.restore();
    }
  }

  drawVietnamEvent() {
    if (!this.vietnamEventActive) return;
    
    // 1. Draw the Vietnamese curly haired man face emoji peeking in diagonally
    this.ctx.save();
    this.ctx.translate(this.vietnamX, this.vietnamY);
    this.ctx.rotate(-0.45); // Tilted sideways to look like peeking around the corner!
    
    this.ctx.shadowColor = '#ff2a7a';
    this.ctx.shadowBlur = 12;
    
    this.ctx.font = '40px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText("👨", 0, 0);
    
    this.ctx.strokeStyle = '#08060f';
    this.ctx.lineWidth = 1.0;
    this.ctx.strokeText("👨", 0, 0);
    
    this.ctx.restore();
    
    // 2. Draw speech bubble left of the person
    if (this.vietnamX < 900) {
      this.ctx.save();
      this.ctx.font = 'bold 13px "Noto Sans JP", sans-serif';
      const text = "Ui da! Đau quá! 💢"; // Vietnamese for "Ouch! It hurts! 痛い💢"
      const textWidth = this.ctx.measureText(text).width;
      const bubbleW = textWidth + 18;
      const bubbleH = 26;
      const bubbleX = this.vietnamX - bubbleW - 24; // positioned to the left of the face
      const bubbleY = this.vietnamY - bubbleH / 2;
      
      // bubble tail pointing right to the sliding person
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#08060f';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(this.vietnamX - 25, this.vietnamY - 6);
      this.ctx.lineTo(this.vietnamX - 12, this.vietnamY);
      this.ctx.lineTo(this.vietnamX - 25, this.vietnamY + 6);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // bubble body
      this.ctx.beginPath();
      const r = 6;
      this.ctx.moveTo(bubbleX + r, bubbleY);
      this.ctx.lineTo(bubbleX + bubbleW - r, bubbleY);
      this.ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r);
      this.ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r);
      this.ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH);
      this.ctx.lineTo(bubbleX + r, bubbleY + bubbleH);
      this.ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - r);
      this.ctx.lineTo(bubbleX, bubbleY + r);
      this.ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + r, bubbleY);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#08060f';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(text, bubbleX + bubbleW / 2, bubbleY + 17);
      this.ctx.restore();
    }
  }

  drawMoaiProjectile() {
    if (this.state !== STATE_THROWN && this.state !== STATE_RESULT) return;
    
    // If an ocean event, Vietnam peeking, or UFO event is active, the Moai is hidden!
    if (this.activeCreature || this.vietnamEventActive || this.ufoEventActive) return;
    
    const sprite = this.images.moaiShot;
    const width = 45;
    const height = 45;
    
    this.ctx.save();
    this.ctx.translate(this.projectile.x, this.projectile.y);
    this.ctx.rotate(this.projectile.rotation);
    
    if (sprite.complete && sprite.naturalWidth !== 0) {
      // Draw standard Moai centered
      this.ctx.drawImage(sprite, -width/2, -height/2, width, height);
    } else {
      // High-quality vector Moai projectile fallback
      this.ctx.fillStyle = '#9e9bb0';
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2.5;
      
      // Moai head polygon shape
      this.ctx.beginPath();
      this.ctx.moveTo(-12, -22);
      this.ctx.lineTo(10, -22);
      this.ctx.lineTo(10, 8);
      this.ctx.lineTo(18, 14); // Nose
      this.ctx.lineTo(18, 18);
      this.ctx.lineTo(10, 18);
      this.ctx.lineTo(6, 24);  // Chin
      this.ctx.lineTo(-12, 24);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Eye line
      this.ctx.fillStyle = '#1c192d';
      this.ctx.fillRect(-2, -8, 8, 3);
    }
    
    this.ctx.restore();
  }

  drawAngryCreature() {
    if (!this.activeCreature) return;
    
    const c = this.activeCreature;
    this.ctx.save();
    
    // Set transparency
    this.ctx.globalAlpha = c.alpha;
    
    if (c.type === 'goddess') {
      // 1. Draw "あなたが落としたのは、この金のモアイですか？" Speech Bubble
      this.ctx.font = '900 11px "Noto Sans JP", "Noto Sans TC", sans-serif';
      const text = "あなたが落としたのは、この金のモアイですか？";
      const textWidth = this.ctx.measureText(text).width;
      const bubbleW = textWidth + 18;
      const bubbleH = 26;
      const bubbleX = c.x - bubbleW / 2;
      const bubbleY = c.y - 50;
      
      // Draw speech bubble tail pointing down to the Goddess (offset to left)
      this.ctx.fillStyle = '#ffd700'; // Rich Gold
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(c.x - 26, bubbleY + bubbleH - 1);
      this.ctx.lineTo(c.x - 20, bubbleY + bubbleH + 6);
      this.ctx.lineTo(c.x - 14, bubbleY + bubbleH - 1);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Draw rounded rectangle for bubble body
      this.ctx.beginPath();
      const r = 8;
      this.ctx.moveTo(bubbleX + r, bubbleY);
      this.ctx.lineTo(bubbleX + bubbleW - r, bubbleY);
      this.ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r);
      this.ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r);
      this.ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH);
      this.ctx.lineTo(bubbleX + r, bubbleY + bubbleH);
      this.ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - r);
      this.ctx.lineTo(bubbleX, bubbleY + r);
      this.ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + r, bubbleY);
      this.ctx.closePath();
      this.ctx.fillStyle = '#ffd700';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.8;
      this.ctx.fill();
      this.ctx.stroke();
      
      // Draw text inside bubble
      this.ctx.fillStyle = '#08060f'; // dark text on gold background
      this.ctx.textAlign = 'center';
      this.ctx.fillText(text, c.x, bubbleY + 17);
      
      // 2. Draw Goddess Emoji (left)
      this.ctx.save();
      this.ctx.translate(c.x - 20, c.y);
      this.ctx.scale(c.scale, c.scale);
      this.ctx.font = '38px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(c.emoji, 0, 0);
      this.ctx.restore();
      
      // 3. Draw Golden Moai (right, glowing gold actual Moai sprite!)
      this.ctx.save();
      this.ctx.translate(c.x + 22, c.y);
      this.ctx.scale(c.scale * 1.0, c.scale * 1.0);
      
      // Bright Golden Glow Shadow effect
      this.ctx.shadowColor = '#ffd700';
      this.ctx.shadowBlur = 18;
      
      // Apply professional real-time golden metallic filter!
      this.ctx.filter = 'sepia(1) saturate(6) hue-rotate(15deg) brightness(1.2) contrast(1.1)';
      
      const sprite = this.images.moaiShot;
      const width = 45;
      const height = 45;
      
      if (sprite.complete && sprite.naturalWidth !== 0) {
        // Draw actual Moai image (now colored in shiny gold!) centered
        this.ctx.drawImage(sprite, -width/2, -height/2, width, height);
      } else {
        // Fallback to golden emoji if image fails to load
        this.ctx.font = '36px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText("🗿", 0, 0);
      }
      
      // Reset filter
      this.ctx.filter = 'none';
      this.ctx.restore();
      
    } else {
      // 1. Draw "こらー！！💢" Speech Bubble
      this.ctx.font = '900 12px "Noto Sans JP", "Noto Sans TC", sans-serif';
      const text = "こらー！！💢";
      const textWidth = this.ctx.measureText(text).width;
      const bubbleW = textWidth + 16;
      const bubbleH = 25;
      const bubbleX = c.x - bubbleW / 2;
      const bubbleY = c.y - 46;
      
      // Draw bubble tail pointing down
      this.ctx.fillStyle = '#ff2a7a';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(c.x - 6, bubbleY + bubbleH - 1);
      this.ctx.lineTo(c.x, bubbleY + bubbleH + 6);
      this.ctx.lineTo(c.x + 6, bubbleY + bubbleH - 1);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Draw rounded rectangle for bubble body
      this.ctx.beginPath();
      const r = 8;
      this.ctx.moveTo(bubbleX + r, bubbleY);
      this.ctx.lineTo(bubbleX + bubbleW - r, bubbleY);
      this.ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r);
      this.ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r);
      this.ctx.quadraticCurveTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH);
      this.ctx.lineTo(bubbleX + r, bubbleY + bubbleH);
      this.ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - r);
      this.ctx.lineTo(bubbleX, bubbleY + r);
      this.ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + r, bubbleY);
      this.ctx.closePath();
      this.ctx.fillStyle = '#ff2a7a';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.8;
      this.ctx.fill();
      this.ctx.stroke();
      
      // Draw text inside bubble
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(text, c.x, bubbleY + 16);
      
      // 2. Draw Angry Creature Emoji
      this.ctx.translate(c.x, c.y);
      this.ctx.scale(c.scale, c.scale);
      
      this.ctx.font = '38px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(c.emoji, 0, 0);
    }
    
    this.ctx.restore();
  }

  // ==========================================================================
  // Particle Systems
  // ==========================================================================
  spawnChargeParticles() {
    // Sparks sucking into player center
    if (Math.random() > 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 80;
      this.particles.push({
        type: 'charge',
        x: this.authorX + 40 + Math.cos(angle) * radius,
        y: this.authorY + 45 + Math.sin(angle) * radius,
        targetX: this.authorX + 40,
        targetY: this.authorY + 45,
        speed: 2 + Math.random() * 4,
        size: 1.5 + Math.random() * 3,
        color: this.power > 75 ? varColor('--cyber-pink') : (this.power > 45 ? varColor('--cyber-gold') : varColor('--cyber-blue'))
      });
    }
  }

  spawnTrailParticle() {
    // Flying smoke trail
    this.particles.push({
      type: 'trail',
      x: this.projectile.x,
      y: this.projectile.y,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      alpha: 0.7,
      size: 4 + Math.random() * 6,
      color: 'rgba(160, 155, 180, 0.4)'
    });
  }

  spawnSplashParticles(originX, originY) {
    // Droplet burst for splash
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI + Math.random() * Math.PI) - (Math.PI / 2); // mostly up
      const force = 3 + Math.random() * 8;
      this.particles.push({
        type: 'splash',
        x: originX,
        y: originY,
        vx: Math.cos(angle) * force * 0.5,
        vy: Math.sin(angle) * force - 2, // strong upward thrust
        alpha: 1.0,
        size: 2.5 + Math.random() * 4,
        gravity: 0.35,
        color: Math.random() > 0.4 ? varColor('--cyber-blue') : '#fff'
      });
    }
  }

  spawnConfettiParticles(originX, originY) {
    // Beautiful massive color confetti explosion
    const colors = [varColor('--success-green'), varColor('--cyber-blue'), varColor('--cyber-pink'), varColor('--cyber-gold'), '#ffffff'];
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const force = 2 + Math.random() * 10;
      this.particles.push({
        type: 'confetti',
        x: originX,
        y: originY,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force - 3,
        alpha: 1.0,
        size: 4 + Math.random() * 6,
        gravity: 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }
  }

  updateAndDrawParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      if (p.type === 'charge') {
        // Move towards target center
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < 5) {
          this.particles.splice(i, 1);
          continue;
        }
        
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;
        
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        
      } else if (p.type === 'trail') {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        p.size *= 0.96;
        
        if (p.alpha <= 0 || p.size < 0.5) {
          this.particles.splice(i, 1);
          continue;
        }
        
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.alpha;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1.0;
        
      } else if (p.type === 'splash' || p.type === 'confetti') {
        p.x += p.vx;
        p.y += p.vy;
        if (p.gravity) p.vy += p.gravity;
        p.alpha -= 0.015;
        
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.alpha;
        
        if (p.type === 'confetti') {
          this.ctx.save();
          this.ctx.translate(p.x, p.y);
          p.rotation += p.rotationSpeed;
          this.ctx.rotate(p.rotation * Math.PI / 180);
          this.ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
          this.ctx.restore();
        } else {
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          this.ctx.fill();
        }
        this.ctx.globalAlpha = 1.0;
      }
    }
  }

  // ==========================================================================
  // Game Loop and State Management
  // ==========================================================================
  loop(timestamp) {
    this.wavePhase += 0.025; // wave animation speed
    
    // Clear & Draw base sky, maps and fluids
    this.drawSky(this.canvas.width, this.canvas.height);
    this.drawMap(this.canvas.width, this.canvas.height);
    this.drawOcean(this.canvas.width, this.canvas.height);
    
    // Process game frames based on current state
    this.updateState();
    
    // Render author and projectiles
    this.drawAuthor();
    this.drawMoaiProjectile();
    this.drawUFO();
    this.drawVietnamEvent();
    
    // Render angry sea creature on ocean hits
    this.drawAngryCreature();
    
    // Process trailing and exploding particles
    this.updateAndDrawParticles();

    // Render screen UI Text (Canvas)
    this.drawCanvasUI();

    requestAnimationFrame((t) => this.loop(t));
  }

  updateState() {
    if (this.vietnamEventActive) {
      this.vietnamTimer--;
      
      const elapsed = 55 - this.vietnamTimer;
      if (elapsed < 12) {
        this.vietnamX = 920 - (elapsed / 12) * 35;
      } else if (this.vietnamTimer < 12) {
        const slideOutElapsed = 12 - this.vietnamTimer;
        this.vietnamX = 885 + (slideOutElapsed / 12) * 35;
      } else {
        this.vietnamX = 885;
      }
      
      if (this.vietnamTimer <= 0) {
        this.vietnamEventActive = false;
        
        // Add Moai that hit Vietnam to seabed graveyard!
        this.sunkenMoais.push({
          type: 'vietnam',
          x: 480 + (Math.random() - 0.5) * 40, // far right
          y: 258 + (Math.random() - 0.5) * 10,
          rotation: (Math.random() - 0.5) * 0.4
        });
        this.saveData();

        this.state = STATE_RESULT;
        this.resultDelayCounter = 70;
        this.resultMessage = "飛ばしすぎ！台湾を越えてベトナムへ... Vietnam! 🇻🇳";
        this.resultType = "overshot";
        this.score = 0;
        this.scoreVal.innerText = this.score;
      }
      return;
    }

    if (this.ufoEventActive) {
      if (this.ufoState === 'hit') {
        this.ufoTimer--;
        if (this.ufoTimer <= 0) {
          this.ufoState = 'falling';
          this.ufoVx = 2.5 + Math.random() * 2;
          this.ufoVy = -3.5;
        }
      } else if (this.ufoState === 'falling') {
        this.ufoVy += this.gravity * 0.8;
        this.ufoX += this.ufoVx;
        this.ufoY += this.ufoVy;
        this.ufoRotation += 0.15;
        
        if (Math.random() > 0.5) {
          this.particles.push({
            type: 'trail',
            x: this.ufoX,
            y: this.ufoY,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            alpha: 0.6,
            size: 3 + Math.random() * 4,
            color: 'rgba(0, 240, 255, 0.4)'
          });
        }
        
        if (this.ufoY >= this.waterHeight - 8) {
          this.ufoEventActive = false;
          this.spawnSplashParticles(this.ufoX, this.waterHeight);
          this.playSplashSound();
          
          const mappedX = (this.ufoX / this.canvas.width) * 560;
          this.sunkenMoais.push({
            type: 'ufo',
            x: Math.min(520, Math.max(40, mappedX)),
            y: 260 + (Math.random() - 0.5) * 8,
            rotation: (Math.random() - 0.5) * 0.4
          });
          this.saveData();
          
          this.state = STATE_RESULT;
          this.resultDelayCounter = 75;
          this.resultMessage = "飛ばしすぎ！UFOに激突して落下... Crash! 🛸💥";
          this.resultType = "overshot";
          this.score = 0;
          this.scoreVal.innerText = this.score;
        }
      }
      return;
    }

    if (this.state === STATE_CHARGING) {
      // Oscillate power between 0 and 100
      this.power += this.powerSpeed * this.powerDirection;
      if (this.power >= 100) {
        this.power = 100;
        this.powerDirection = -1; // bounce down
      } else if (this.power <= 0) {
        this.power = 0;
        this.powerDirection = 1; // bounce up
      }
      
      // Update HTML UI and Synth audio frequency
      this.powerFill.style.width = this.power + '%';
      this.updateChargeSound(this.power);
      
      // Spark particles effect
      this.spawnChargeParticles();
    }
    
    if (this.state === STATE_THROWN) {
      if (this.attackFrameCounter > 0) this.attackFrameCounter--;
      
      // Flying mechanics with gravity
      this.projectile.x += this.projectile.vx;
      this.projectile.y += this.projectile.vy;
      this.projectile.vy += this.gravity;
      this.projectile.rotation += this.projectile.rotationSpeed;
      
      // Generate smoke smoke behind Moai
      this.spawnTrailParticle();
      
      // Check collision
      this.checkCollision();
    }

    if (this.state === STATE_RESULT) {
      this.resultDelayCounter--;
      
      // Animate angry sea creature
      if (this.activeCreature) {
        this.activeCreature.timer++;
        const maxFrames = this.activeCreature.maxTime;
        
        if (this.activeCreature.timer < 20) {
          const t = this.activeCreature.timer / 20;
          const ease = Math.sin(t * Math.PI / 2);
          this.activeCreature.y = this.waterHeight + 20 - ease * 46;
          this.activeCreature.scale = ease * 1.35;
          this.activeCreature.alpha = ease;
        } else if (this.activeCreature.timer > maxFrames - 20) {
          const t = (maxFrames - this.activeCreature.timer) / 20;
          this.activeCreature.alpha = Math.max(0, t);
          this.activeCreature.y += 0.3; // drift down
        } else {
          this.activeCreature.y = this.waterHeight - 26 + Math.sin(this.activeCreature.timer * 0.15) * 3;
          this.activeCreature.scale = 1.0 + Math.sin(this.activeCreature.timer * 0.1) * 0.05;
          this.activeCreature.alpha = 1.0;
        }
      }

      if (this.resultDelayCounter <= 0) {
        this.activeCreature = null; // Clean up
        if (this.resultType === 'perfect') {
          // Unlocking card and scoring triggers Success Modal Popup
          this.triggerSuccess();
        } else {
          // Reset directly for failure drops
          this.state = STATE_IDLE;
        }
      }
    }
  }

  checkCollision() {
    const p = this.projectile;
    
    // Check hit on Airplane (飛行機)
    const planeX = ((this.wavePhase * 25) % (this.canvas.width + 300)) - 150;
    const planeY = 65 + Math.sin(this.wavePhase * 0.05) * 8;
    const distToPlane = Math.hypot(p.x - planeX, p.y - planeY);
    if (distToPlane < 26 && this.planeHitTimer <= 0) {
      this.planeHitTimer = 90;
      // Deflect the Moai downwards and backwards!
      p.vx = -Math.abs(p.vx) * 0.35;
      p.vy = 2.5;
      this.playTone(450, 'triangle', 0.12, 0.12);
      this.spawnConfettiParticles(p.x, p.y);
    }

    // Check hit on cruise Ship (船)
    const shipX = 320 + Math.sin(this.wavePhase * 0.08) * 90;
    const shipY = this.waterHeight - 8 + Math.sin(this.wavePhase * 0.4) * 2;
    const distToShip = Math.hypot(p.x - shipX, p.y - shipY);
    if (distToShip < 24 && this.shipHitTimer <= 0) {
      this.shipHitTimer = 90;
      // Bounce the Moai upwards and backwards!
      p.vx = -Math.abs(p.vx) * 0.35;
      p.vy = -3.2;
      this.playTone(450, 'triangle', 0.12, 0.12);
      this.spawnConfettiParticles(p.x, p.y);
    }
    
    // UFO space impact easter egg
    if (this.power >= 93 && p.y < -25 && !this.ufoEventActive) {
      this.ufoEventActive = true;
      this.ufoX = Math.min(this.canvas.width - 150, Math.max(200, p.x));
      this.ufoY = -45; // Start completely off-screen in outer space!
      this.ufoState = 'hit';
      this.ufoTimer = 55;
      this.ufoVx = 0;
      this.ufoVy = 0;
      this.ufoRotation = 0;
      
      p.vx = 0;
      p.vy = 0;
      
      this.playTone(720, 'sawtooth', 0.22, 0.2);
      this.playTone(360, 'triangle', 0.3, 0.25);
      
      // Star sparkles showering down from the top ceiling where the collision happened!
      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI / 4) + Math.random() * (Math.PI / 2); // mostly downwards
        const force = 2.5 + Math.random() * 6;
        this.particles.push({
          type: 'confetti',
          x: this.ufoX,
          y: 4, // screen top edge
          vx: Math.cos(angle) * force,
          vy: Math.sin(angle) * force,
          alpha: 1.0,
          size: 3 + Math.random() * 4,
          gravity: 0.16,
          color: varColor('--cyber-gold'),
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8
        });
      }
      return;
    }
    
    // Vietnam far-right edge impact easter egg
    if (p.x >= 890 && !this.ufoEventActive && !this.vietnamEventActive) {
      this.vietnamEventActive = true;
      this.vietnamY = p.y;
      this.vietnamX = 920; // starts offscreen
      this.vietnamTimer = 55;
      
      p.vx = 0;
      p.vy = 0;
      
      // Comic hit sound
      this.playTone(600, 'sawtooth', 0.2, 0.16);
      
      // Spawn star sparks bursting leftwards from the right edge!
      for (let i = 0; i < 15; i++) {
        const angle = Math.PI - (Math.PI / 4) + (Math.random() - 0.5) * (Math.PI / 2); // leftwards
        const force = 3 + Math.random() * 5;
        this.particles.push({
          type: 'confetti',
          x: 895, // screen right edge
          y: this.vietnamY,
          vx: Math.cos(angle) * force,
          vy: Math.sin(angle) * force,
          alpha: 1.0,
          size: 3 + Math.random() * 4,
          gravity: 0.15,
          color: varColor('--cyber-pink'),
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 8
        });
      }
      return;
    }
    
    // 1. Landing in the Ocean (Splash)
    // Left ocean (Japan to Taiwan) or far Right ocean (past Taiwan)
    const isOverWater = (p.x >= 160 && p.x <= this.taiwanStartX - 15) || (p.x >= this.taiwanEndX + 25);
    
    if (isOverWater && p.y >= this.waterHeight - 8) {
      this.state = STATE_RESULT;
      this.spawnSplashParticles(p.x, this.waterHeight);
      
      // Spawn an ocean splash event (either an angry sea creature or the highly frequent Sea Goddess!)
      const OCEAN_EVENTS = [
        { type: "goddess", name: "海の女神", emoji: "🧜‍♀️" },
        { type: "creature", name: "たこ", emoji: "🐙" },
        { type: "goddess", name: "海の女神", emoji: "🧜‍♀️" },
        { type: "creature", name: "イカ", emoji: "🦑" },
        { type: "goddess", name: "海の女神", emoji: "🧜‍♀️" },
        { type: "creature", name: "カニ", emoji: "🦀" }
      ];
      
      const event = OCEAN_EVENTS[Math.floor(Math.random() * OCEAN_EVENTS.length)];
      const isGoddess = event.type === 'goddess';
      const delayTime = isGoddess ? 155 : 110; // goddess stays longer to read long speech bubble
      
      this.resultDelayCounter = delayTime;
      
      this.activeCreature = {
        type: event.type,
        emoji: event.emoji,
        name: event.name,
        x: p.x,
        y: this.waterHeight + 20,
        targetY: this.waterHeight - 26,
        scale: 0.1,
        alpha: 0,
        timer: 0,
        maxTime: delayTime
      };

      // Add a sunken Moai to our graveyard heap
      this.sunkenMoais.push({
        x: 45 + Math.random() * 470, // random scatter horizontally (W = 560)
        y: 255 + (Math.random() - 0.5) * 15, // random depth scatter
        rotation: (Math.random() - 0.5) * Math.PI // random tipped rotation!
      });
      this.saveData();

      // Play matching hit/goddess sounds
      if (isGoddess) {
        this.playGoddessEmergenceSound();
      } else {
        this.playCreatureHitSound();
      }
      
      if (p.x >= this.taiwanEndX + 25) {
        this.resultMessage = "飛ばしすぎ！宇宙の彼方へ消えた... Overshot! 🚀";
        this.resultType = "overshot";
        this.score = 0; // reset combo
      } else {
        this.resultMessage = "飛距離不足！海にポチャリ... Splash! 🌊";
        this.resultType = "short";
        this.score = 0; // reset combo
      }
      this.scoreVal.innerText = this.score;
    }
    
    // 2. Landing on Taiwan Island Top cliff
    if (p.x >= this.taiwanStartX - 15 && p.x <= this.taiwanEndX + 25 && p.y >= this.taiwanHeight - 12) {
      this.state = STATE_RESULT;
      this.resultDelayCounter = 70;
      
      // Check if inside the Target Box (700 to 760)
      if (p.x >= this.targetStartX && p.x <= this.targetEndX) {
        this.resultMessage = "✨ 大成功！モアイが台湾に届いた！ PERFECT! ✨";
        this.resultType = "perfect";
        
        // 得点加算とハイスコア更新
        this.score++;
        this.scoreVal.innerText = this.score;
        if (this.score > this.highScore) {
          this.highScore = this.score;
          this.highScoreVal.innerText = this.highScore;
        }
        
        this.spawnConfettiParticles(p.x, p.y);
        this.playSuccessSound();
        this.saveData();
      } else {
        // Safe landed on Taiwan but outside the ideal target box
        this.resultMessage = "着陸成功！でも狙いが惜しい！ Try Target! 🎯";
        this.resultType = "short"; // resets combo, doesn't show win modal
        this.score = 0;
        this.scoreVal.innerText = this.score;
        this.playOvershootSound();
      }
    }

    // 3. Left cliff collision (Overshot/short reset safety fallback)
    if (p.y > this.canvas.height + 100) {
      this.state = STATE_IDLE;
      this.score = 0;
      this.scoreVal.innerText = this.score;
    }
  }

  triggerSuccess() {
    // Unlock a random Moai card that isn't unlocked yet
    const lockedItems = MOAI_COLLECTION.filter(item => !this.unlockedIds.has(item.id));
    let unlockedItem;
    
    if (lockedItems.length > 0) {
      // Pick a random locked item
      unlockedItem = lockedItems[Math.floor(Math.random() * lockedItems.length)];
      this.unlockedIds.add(unlockedItem.id);
      this.saveData();
      this.renderCollectionGrid();
      this.updateCollectionCountUI();
      
      // Populate success modal info
      document.getElementById('unlocked-emoji').innerText = unlockedItem.emoji;
      document.getElementById('unlocked-title').innerText = unlockedItem.name;
      document.getElementById('unlocked-desc').innerText = unlockedItem.desc;
      document.getElementById('pinkoi-item-link').href = unlockedItem.link;
    } else {
      // All items already unlocked, just show a random unlocked card
      unlockedItem = MOAI_COLLECTION[Math.floor(Math.random() * MOAI_COLLECTION.length)];
      document.getElementById('unlocked-emoji').innerText = unlockedItem.emoji;
      document.getElementById('unlocked-title').innerText = unlockedItem.name + " (獲得済み)";
      document.getElementById('unlocked-desc').innerText = unlockedItem.desc;
      document.getElementById('pinkoi-item-link').href = unlockedItem.link;
    }
    
    // Open glassmorphism Modal Popup
    this.successModal.style.display = 'flex'; // Restore display flex
    this.successModal.classList.add('active');
  }

  // ==========================================================================
  // DOM UI Rendering & Display Update
  // ==========================================================================
  renderCollectionGrid() {
    this.collectionGrid.innerHTML = '';
    
    MOAI_COLLECTION.forEach(item => {
      const isUnlocked = this.unlockedIds.has(item.id);
      const card = document.createElement('div');
      card.className = `collection-item ${isUnlocked ? '' : 'locked'}`;
      card.title = isUnlocked ? `${item.name}\n${item.desc}` : "未獲得のモアイ";
      
      card.innerHTML = `
        <span class="item-emoji">${item.emoji}</span>
        ${isUnlocked ? '' : '<span class="lock-icon">🔒</span>'}
      `;
      
      // Clicking unlocked card shows the popup info for viewing/buying anytime
      if (isUnlocked) {
        card.addEventListener('click', () => {
          document.getElementById('unlocked-emoji').innerText = item.emoji;
          document.getElementById('unlocked-title').innerText = item.name;
          document.getElementById('unlocked-desc').innerText = item.desc;
          document.getElementById('pinkoi-item-link').href = item.link;
          this.successModal.style.display = 'flex'; // Restore display flex
          this.successModal.classList.add('active');
        });
      }
      
      this.collectionGrid.appendChild(card);
    });
  }

  updateCollectionCountUI() {
    this.collectionCount.innerText = `${this.unlockedIds.size} / ${MOAI_COLLECTION.length}`;
  }

  drawCanvasUI() {
    // Render visual status descriptions directly on top of the Canvas screen
    if (this.state === STATE_RESULT) {
      this.ctx.fillStyle = 'rgba(8, 6, 15, 0.7)';
      this.ctx.fillRect(0, 180, this.canvas.width, 70);
      
      this.ctx.font = 'bold 18px ' + varColor('--font-body');
      this.ctx.fillStyle = this.resultType === 'perfect' ? varColor('--success-green') : (this.resultType === 'overshot' ? varColor('--cyber-pink') : '#fff');
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.resultMessage, this.canvas.width / 2, 222);
      this.ctx.textAlign = 'left';
    }
    
    if (this.state === STATE_CHARGING) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.font = 'bold 12px ' + varColor('--font-display');
      this.ctx.fillText("CHARGING POWER: " + Math.floor(this.power) + "%", this.authorX - 25, this.authorY - 20);
    }
  }

  animateSeaFloor() {
    if (!this.isPeekingSeaFloor) return;

    const ctx = this.seaFloorCtx;
    const canvas = this.seaFloorCanvas;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw Deep Sea Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#020813'); 
    bgGrad.addColorStop(0.6, '#051833'); 
    bgGrad.addColorStop(1, '#020b18'); 
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw God Rays (Light rays from surface)
    ctx.save();
    const time = Date.now() * 0.0015;
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 4; i++) {
      const rayX = (w * 0.15) + (w * 0.22 * i) + Math.sin(time + i * 2) * 25;
      const rayWidth = 25 + Math.sin(time * 0.5 + i) * 12;
      
      const rayGrad = ctx.createLinearGradient(rayX, 0, rayX - 40, h);
      rayGrad.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
      rayGrad.addColorStop(0.5, 'rgba(0, 200, 255, 0.04)');
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(rayX - rayWidth, 0);
      ctx.lineTo(rayX + rayWidth, 0);
      ctx.lineTo(rayX + rayWidth - 60, h);
      ctx.lineTo(rayX - rayWidth - 60, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 3. Draw Waving Seaweed
    ctx.save();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const weedX = 25 + i * 65 + Math.sin(i) * 10;
      const weedH = 50 + Math.sin(i * 1.5) * 18;
      const sway = Math.sin(time + i) * 10;
      
      ctx.strokeStyle = `rgba(0, ${160 + Math.sin(i) * 60}, ${140 + Math.cos(i) * 40}, 0.55)`;
      ctx.beginPath();
      ctx.moveTo(weedX, h);
      ctx.quadraticCurveTo(weedX + sway * 0.4, h - weedH * 0.5, weedX + sway, h - weedH);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Draw Sunken Moais
    this.sunkenMoais.forEach((moai) => {
      ctx.save();
      ctx.translate(moai.x, moai.y);
      
      if (moai.wiggleTime === undefined) moai.wiggleTime = 0;
      
      ctx.rotate(moai.rotation + (moai.wiggleTime > 0 ? Math.sin(moai.wiggleTime * 4) * 0.15 : 0));
      
      if (moai.wiggleTime > 0) {
        moai.wiggleTime -= 0.08;
        if (moai.wiggleTime < 0) moai.wiggleTime = 0;
      }

      if (moai.type === 'ufo') {
        ctx.save();
        
        // Beautiful bioluminescent deep-sea glowing cyan aura
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("🛸", 0, 0);
        
        // High-contrast dark outline
        ctx.strokeStyle = '#020b18';
        ctx.lineWidth = 1.2;
        ctx.strokeText("🛸", 0, 0);
        
        ctx.restore();
      } else {
        const sprite = this.images.moaiShot;
        const mw = 32;
        const mh = 32;
        
        if (sprite.complete && sprite.naturalWidth !== 0) {
          ctx.filter = 'contrast(0.85) brightness(0.65) sepia(0.2) hue-rotate(185deg)';
          ctx.drawImage(sprite, -mw/2, -mh/2, mw, mh);
          ctx.filter = 'none';
        } else {
          ctx.fillStyle = '#4c5270';
          ctx.strokeStyle = '#7c86b3';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-8, -14);
          ctx.lineTo(6, -14);
          ctx.lineTo(6, 4);
          ctx.lineTo(12, 8);
          ctx.lineTo(12, 11);
          ctx.lineTo(6, 11);
          ctx.lineTo(4, 15);
          ctx.lineTo(-8, 15);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

      }

      ctx.restore();

      // Thought/speech bubble for Moai comments
      if (moai.message && moai.messageTimer > 0) {
        moai.messageTimer--;
        ctx.save();
        ctx.fillStyle = 'rgba(10, 25, 50, 0.85)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.font = 'bold 9.5px "Noto Sans JP", sans-serif';
        const txtW = ctx.measureText(moai.message).width;
        const bx = moai.x - txtW/2 - 6;
        const by = moai.y - 34;
        
        // Draw small rounded bubble
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bx, by, txtW + 12, 16, 5);
        } else {
          ctx.rect(bx, by, txtW + 12, 16);
        }
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(moai.message, bx + 6, by + 11.5);
        ctx.restore();
      }
    });

    // 4b. Draw Sunken Glasses (2016 Boat Fishing Easter Egg!)
    const gl = this.seaFloorGlasses;
    ctx.save();
    ctx.translate(gl.x, gl.y);
    if (gl.wiggleTime === undefined) gl.wiggleTime = 0;
    ctx.rotate(gl.rotation + (gl.wiggleTime > 0 ? Math.sin(gl.wiggleTime * 4) * 0.15 : 0));
    if (gl.wiggleTime > 0) {
      gl.wiggleTime -= 0.08;
      if (gl.wiggleTime < 0) gl.wiggleTime = 0;
    }
    
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("👓", 0, 0);
    ctx.restore();

    // Glasses thought/speech bubble
    if (gl.message && gl.messageTimer > 0) {
      gl.messageTimer--;
      ctx.save();
      ctx.fillStyle = 'rgba(10, 20, 45, 0.9)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.font = 'bold 9px "Noto Sans JP", sans-serif';
      const txtW = ctx.measureText(gl.message).width;
      const bx = gl.x - txtW/2 - 6;
      const by = gl.y - 30;
      
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx, by, txtW + 12, 16, 5);
      } else {
        ctx.rect(bx, by, txtW + 12, 16);
      }
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(gl.message, bx + 6, by + 11.5);
      ctx.restore();
    }

    // 5. Update and Draw Sea Floor Bubbles
    ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
    this.seaFloorBubbles.forEach(b => {
      b.y -= b.speed;
      b.x += Math.sin(b.y * 0.04) * 0.4;
      
      if (b.y < -10) {
        b.y = h + 10;
        b.x = Math.random() * w;
      }
      
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(b.x - b.size*0.25, b.y - b.size*0.25, b.size*0.25, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
    });

    // 6. Draw UNDERSEA FISH
    if (!this.seaFish) {
      this.seaFish = {
        x: -40,
        y: 40 + Math.random() * 140,
        speed: 0.7 + Math.random() * 0.7,
        emoji: '🐠',
        scale: 1,
        dir: 1
      };
    }
    
    const fish = this.seaFish;
    fish.x += fish.speed * fish.dir;
    
    ctx.save();
    ctx.translate(fish.x, fish.y);
    if (fish.dir === -1) {
      ctx.scale(-1, 1);
    }
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fish.emoji, 0, 0);
    ctx.restore();
    
    if ((fish.dir === 1 && fish.x > w + 40) || (fish.dir === -1 && fish.x < -40)) {
      fish.dir = Math.random() > 0.5 ? 1 : -1;
      fish.x = fish.dir === 1 ? -40 : w + 40;
      fish.y = 40 + Math.random() * 140;
      fish.emoji = ['🐠', '🐡', '🐙', '🦑', '🦈', '🦐'][Math.floor(Math.random() * 6)];
      fish.speed = 0.6 + Math.random() * 0.9;
    }

    requestAnimationFrame(() => this.animateSeaFloor());
  }
}

// Utility to read CSS custom properties dynamically with a safe try-catch wrapper
function varColor(varName) {
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return val ? val.trim() : '';
  } catch (e) {
    return '';
  }
}

// Instantiate engine when DOM content loads
window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new GameEngine();
});
