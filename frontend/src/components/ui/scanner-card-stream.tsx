"use client";

import { ArrowLeftRight, Gauge, Pause, Play, RotateCcw } from "lucide-react";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

const createTelemetryCardSvg = (title: string, station: string, val: string, status: string, color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="bg_${encodeURIComponent(station)}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d14"/>
        <stop offset="60%" stop-color="#05070a"/>
        <stop offset="100%" stop-color="#0f1522"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="800" height="500" rx="24" fill="url(#bg_${encodeURIComponent(station)})"/>
    <rect width="800" height="500" rx="24" fill="url(#grid)"/>
    <rect x="2" y="2" width="796" height="496" rx="22" fill="none" stroke="${color}" stroke-opacity="0.35" stroke-width="2"/>
    <circle cx="680" cy="250" r="140" fill="none" stroke="${color}" stroke-opacity="0.12" stroke-width="1.5" stroke-dasharray="6,6"/>
    <circle cx="680" cy="250" r="80" fill="none" stroke="${color}" stroke-opacity="0.2" stroke-width="1.5"/>
    <circle cx="680" cy="250" r="20" fill="${color}" fill-opacity="0.35"/>
    <text x="50" y="80" font-family="monospace" font-size="18" font-weight="bold" fill="${color}" letter-spacing="3">${station}</text>
    <text x="50" y="140" font-family="system-ui, sans-serif" font-size="34" font-weight="bold" fill="#ffffff">${title}</text>
    <text x="50" y="250" font-family="monospace" font-size="54" font-weight="900" fill="#ffffff">${val}</text>
    <text x="50" y="320" font-family="system-ui, sans-serif" font-size="18" fill="#8899aa">CMEMS INCOIS BASIN TELEMETRY</text>
    <rect x="50" y="385" width="140" height="38" rx="8" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>
    <text x="75" y="410" font-family="monospace" font-size="14" font-weight="bold" fill="${color}">${status}</text>
    <text x="600" y="440" font-family="monospace" font-size="14" fill="#556677">LEHER-NAV // v2.4</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const defaultCardImages = [
  createTelemetryCardSvg("Surface Temperature", "STATION AR-01 // 15.4°N 71.2°E", "28.4°C", "NOMINAL", "#dfc58d"),
  createTelemetryCardSvg("Mixed Layer Salinity", "BUOY BOB-04 // 14.0°N 86.5°E", "35.95 PSU", "OPTIMAL", "#38bdf8"),
  createTelemetryCardSvg("Current Velocity", "ARGO FLOAT 5906 // EQUATOR", "0.84 m/s", "ACTIVE", "#34d399"),
  createTelemetryCardSvg("Bathymetric Depth", "DEEP BASIN SLICE // 150m ISO", "150 METERS", "LOCKED", "#f59e0b"),
  createTelemetryCardSvg("Acoustic Sound Speed", "SONAR SECTOR 4 // ADEN", "1,535 m/s", "VERIFIED", "#dfc58d"),
];

const ASCII_CHARS =
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789(){}[]<>;:,._-+=!@#$%^&*|\\/\"'`~?";
const generateCode = (width: number, height: number): string => {
	let text = "";
	for (let i = 0; i < width * height; i++) {
		text += ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
	}
	let out = "";
	for (let i = 0; i < height; i++) {
		out += `${text.substring(i * width, (i + 1) * width)}\n`;
	}
	return out;
};

export type ScannerCardStreamProps = {
	className?: string;
	showControls?: boolean;
	showSpeed?: boolean;
	initialSpeed?: number;
	direction?: -1 | 1;
	cardImages?: string[];
	repeat?: number;
	cardGap?: number;
	friction?: number;
	scanEffect?: "clip" | "scramble";
};

const ScannerCardStream = ({
	className,
	showControls = false,
	showSpeed = false,
	initialSpeed = 150,
	direction = -1,
	cardImages = defaultCardImages,
	repeat = 6,
	cardGap = 60,
	friction = 0.95,
	scanEffect = "scramble",
}: ScannerCardStreamProps) => {
	const [speed, setSpeed] = useState(initialSpeed);
	const [isPaused, setIsPaused] = useState(false);
	const [isScanning, setIsScanning] = useState(false);

	const cards = useMemo(() => {
		const totalCards = cardImages.length * repeat;
		return Array.from({ length: totalCards }, (_, i) => ({
			id: i,
			image: cardImages[i % cardImages.length],
			ascii: generateCode(Math.floor(400 / 6.5), Math.floor(250 / 13)),
		}));
	}, [cardImages, repeat]);

	const cardLineRef = useRef<HTMLDivElement>(null);
	const particleCanvasRef = useRef<HTMLCanvasElement>(null);
	const scannerCanvasRef = useRef<HTMLCanvasElement>(null);
	const originalAscii = useRef(new Map<number, string>());

	const cardStreamState = useRef({
		position: 0,
		velocity: initialSpeed,
		direction,
		isDragging: false,
		lastMouseX: 0,
		lastDragTime: performance.now(),
		lastTime: performance.now(),
		cardLineWidth: (400 + cardGap) * cards.length,
		friction,
		minVelocity: 30,
	});

	const scannerState = useRef({ isScanning: false });

	const toggleAnimation = useCallback(() => setIsPaused((p) => !p), []);
	const resetPosition = useCallback(() => {
		if (cardLineRef.current) {
			cardStreamState.current.position =
				cardLineRef.current.parentElement?.offsetWidth || 0;
			cardStreamState.current.velocity = initialSpeed;
			cardStreamState.current.direction = direction;
			setIsPaused(false);
		}
	}, [initialSpeed, direction]);
	const changeDirection = useCallback(() => {
		cardStreamState.current.direction *= -1;
	}, []);

	useEffect(() => {
		cardStreamState.current.cardLineWidth = (400 + cardGap) * cards.length;
	}, [cards.length, cardGap]);

	useEffect(() => {
		const cardLine = cardLineRef.current;
		const particleCanvas = particleCanvasRef.current;
		const scannerCanvas = scannerCanvasRef.current;
		if (!cardLine || !particleCanvas || !scannerCanvas) return;

		cards.forEach((card) => originalAscii.current.set(card.id, card.ascii));
		const scrambleIntervals = new Set<ReturnType<typeof setInterval>>();
		let animationFrameId: number;

		const scene = new THREE.Scene();
		const camera = new THREE.OrthographicCamera(
			-window.innerWidth / 2,
			window.innerWidth / 2,
			125,
			-125,
			1,
			1000,
		);
		camera.position.z = 100;
		const renderer = new THREE.WebGLRenderer({
			canvas: particleCanvas,
			alpha: true,
			antialias: true,
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(window.innerWidth, 250);
		renderer.setClearColor(0x000000, 0);

		const particleCount = 400;
		const geometry = new THREE.BufferGeometry();
		const positions = new Float32Array(particleCount * 3);
		const velocities = new Float32Array(particleCount);
		const alphas = new Float32Array(particleCount);

		const texCanvas = document.createElement("canvas");
		texCanvas.width = 100;
		texCanvas.height = 100;
		const texCtx = texCanvas.getContext("2d")!;
		const half = 50;
		const gradient = texCtx.createRadialGradient(
			half,
			half,
			0,
			half,
			half,
			half,
		);
		gradient.addColorStop(0.025, "#fff");
		gradient.addColorStop(0.1, "hsl(217, 61%, 33%)");
		gradient.addColorStop(0.25, "hsl(217, 64%, 6%)");
		gradient.addColorStop(1, "transparent");
		texCtx.fillStyle = gradient;
		texCtx.arc(half, half, half, 0, Math.PI * 2);
		texCtx.fill();
		const texture = new THREE.CanvasTexture(texCanvas);

		for (let i = 0; i < particleCount; i++) {
			positions[i * 3] = (Math.random() - 0.5) * window.innerWidth * 2;
			positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
			velocities[i] = Math.random() * 60 + 30;
			alphas[i] = (Math.random() * 8 + 2) / 10;
		}
		geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));

		const material = new THREE.ShaderMaterial({
			uniforms: { pointTexture: { value: texture } },
			vertexShader: `attribute float alpha; varying float vAlpha; void main() { vAlpha = alpha; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 15.0; gl_Position = projectionMatrix * mvPosition; }`,
			fragmentShader: `uniform sampler2D pointTexture; varying float vAlpha; void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha) * texture2D(pointTexture, gl_PointCoord); }`,
			transparent: true,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
			vertexColors: false,
		});
		const particles = new THREE.Points(geometry, material);
		scene.add(particles);

		const ctx = scannerCanvas.getContext("2d")!;
		scannerCanvas.width = window.innerWidth;
		scannerCanvas.height = 300;
		type Spark = {
			x: number;
			y: number;
			vx: number;
			vy: number;
			radius: number;
			alpha: number;
			life: number;
			decay: number;
		};
		const scannerParticles: Spark[] = [];
		const baseMaxParticles = 800;
		let currentMaxParticles = baseMaxParticles;
		const scanTargetMaxParticles = 2500;
		const createScannerParticle = (): Spark => ({
			x: window.innerWidth / 2 + (Math.random() - 0.5) * 3,
			y: Math.random() * 300,
			vx: Math.random() * 0.8 + 0.2,
			vy: (Math.random() - 0.5) * 0.3,
			radius: Math.random() * 0.6 + 0.4,
			alpha: Math.random() * 0.4 + 0.6,
			life: 1.0,
			decay: Math.random() * 0.02 + 0.005,
		});
		for (let i = 0; i < baseMaxParticles; i++)
			scannerParticles.push(createScannerParticle());

		const runScrambleEffect = (element: HTMLElement, cardId: number) => {
			if (element.dataset.scrambling === "true") return;
			element.dataset.scrambling = "true";
			const originalText = originalAscii.current.get(cardId) || "";
			let scrambleCount = 0;
			const maxScrambles = 10;
			const interval = setInterval(() => {
				element.textContent = generateCode(
					Math.floor(400 / 6.5),
					Math.floor(250 / 13),
				);
				scrambleCount++;
				if (scrambleCount >= maxScrambles) {
					clearInterval(interval);
					scrambleIntervals.delete(interval);
					element.textContent = originalText;
					delete element.dataset.scrambling;
				}
			}, 30);
			scrambleIntervals.add(interval);
		};

		const updateCardEffects = () => {
			const scannerX = window.innerWidth / 2;
			const scannerWidth = 8;
			const scannerLeft = scannerX - scannerWidth / 2;
			const scannerRight = scannerX + scannerWidth / 2;
			let anyCardIsScanning = false;
			cardLine
				.querySelectorAll<HTMLElement>(".card-wrapper")
				.forEach((wrapper, index) => {
					const rect = wrapper.getBoundingClientRect();
					const normalCard =
						wrapper.querySelector<HTMLElement>(".card-normal")!;
					const asciiCard = wrapper.querySelector<HTMLElement>(".card-ascii")!;
					const asciiContent = asciiCard.querySelector<HTMLElement>("pre")!;
					if (rect.left < scannerRight && rect.right > scannerLeft) {
						anyCardIsScanning = true;
						if (
							scanEffect === "scramble" &&
							wrapper.dataset.scanned !== "true"
						) {
							runScrambleEffect(asciiContent, cards[index]?.id ?? index);
						}
						wrapper.dataset.scanned = "true";
						const intersectLeft = Math.max(scannerLeft - rect.left, 0);
						const intersectRight = Math.min(
							scannerRight - rect.left,
							rect.width,
						);
						normalCard.style.setProperty(
							"--clip-right",
							`${(intersectLeft / rect.width) * 100}%`,
						);
						asciiCard.style.setProperty(
							"--clip-left",
							`${(intersectRight / rect.width) * 100}%`,
						);
					} else {
						delete wrapper.dataset.scanned;
						if (rect.right < scannerLeft) {
							normalCard.style.setProperty("--clip-right", "100%");
							asciiCard.style.setProperty("--clip-left", "100%");
						} else {
							normalCard.style.setProperty("--clip-right", "0%");
							asciiCard.style.setProperty("--clip-left", "0%");
						}
					}
				});
			setIsScanning(anyCardIsScanning);
			scannerState.current.isScanning = anyCardIsScanning;
		};

		const pointerX = (e: MouseEvent | TouchEvent) =>
			"touches" in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;

		const handleMouseDown = (e: MouseEvent | TouchEvent) => {
			const s = cardStreamState.current;
			s.isDragging = true;
			s.lastMouseX = pointerX(e);
			s.lastDragTime = performance.now();
			s.velocity = 0;
			cardLine.style.cursor = "grabbing";
		};
		const handleMouseMove = (e: MouseEvent | TouchEvent) => {
			const s = cardStreamState.current;
			if (!s.isDragging) return;
			const x = pointerX(e);
			const now = performance.now();
			const dx = x - s.lastMouseX;
			const dt = Math.max((now - s.lastDragTime) / 1000, 1 / 240);
			s.position += dx;
			if (dx !== 0) s.direction = dx < 0 ? -1 : 1;
			s.velocity = Math.min(Math.abs(dx) / dt, 4000);
			s.lastMouseX = x;
			s.lastDragTime = now;
		};
		const handleMouseUp = () => {
			const s = cardStreamState.current;
			if (!s.isDragging) return;
			s.isDragging = false;
			s.velocity = Math.max(s.velocity, initialSpeed);
			cardLine.style.cursor = "grab";
		};
		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			const s = cardStreamState.current;
			const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
			s.direction = delta < 0 ? -1 : 1;
			s.velocity = Math.min(s.velocity + Math.abs(delta) * 2, 4000);
		};

		const handleResize = () => {
			const w = window.innerWidth;
			camera.left = -w / 2;
			camera.right = w / 2;
			camera.updateProjectionMatrix();
			renderer.setSize(w, 250);
			scannerCanvas.width = w;
			scannerCanvas.height = 300;
		};

		cardLine.addEventListener("mousedown", handleMouseDown);
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		cardLine.addEventListener("touchstart", handleMouseDown, { passive: true });
		window.addEventListener("touchmove", handleMouseMove, { passive: true });
		window.addEventListener("touchend", handleMouseUp);
		cardLine.addEventListener("wheel", handleWheel, { passive: false });
		window.addEventListener("resize", handleResize);

		const animate = (currentTime: number) => {
			const s = cardStreamState.current;
			const deltaTime = (currentTime - s.lastTime) / 1000;
			s.lastTime = currentTime;

			if (!isPaused && !s.isDragging) {
				if (s.velocity > s.minVelocity) s.velocity *= s.friction;
				s.position += s.velocity * s.direction * deltaTime;
				setSpeed(Math.round(s.velocity));
			}

			const containerWidth = cardLine.parentElement?.offsetWidth || 0;
			if (s.position < -s.cardLineWidth) s.position = containerWidth;
			else if (s.position > containerWidth) s.position = -s.cardLineWidth;
			cardLine.style.transform = `translateX(${s.position}px)`;
			updateCardEffects();

			const time = currentTime * 0.001;
			for (let i = 0; i < particleCount; i++) {
				positions[i * 3] += velocities[i] * 0.016;
				if (positions[i * 3] > window.innerWidth / 2 + 100)
					positions[i * 3] = -window.innerWidth / 2 - 100;
				positions[i * 3 + 1] += Math.sin(time + i * 0.1) * 0.5;
				alphas[i] = Math.max(
					0.1,
					Math.min(1, alphas[i] + (Math.random() - 0.5) * 0.05),
				);
			}
			geometry.attributes.position.needsUpdate = true;
			geometry.attributes.alpha.needsUpdate = true;
			renderer.render(scene, camera);

			ctx.clearRect(0, 0, window.innerWidth, 300);
			const targetCount = scannerState.current.isScanning
				? scanTargetMaxParticles
				: baseMaxParticles;
			currentMaxParticles += (targetCount - currentMaxParticles) * 0.05;
			while (scannerParticles.length < currentMaxParticles)
				scannerParticles.push(createScannerParticle());
			while (scannerParticles.length > currentMaxParticles)
				scannerParticles.pop();
			scannerParticles.forEach((p) => {
				p.x += p.vx;
				p.y += p.vy;
				p.life -= p.decay;
				if (p.life <= 0 || p.x > window.innerWidth)
					Object.assign(p, createScannerParticle());
				ctx.globalAlpha = p.alpha * p.life;
				ctx.fillStyle = "white";
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
				ctx.fill();
			});

			animationFrameId = requestAnimationFrame(animate);
		};
		animationFrameId = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(animationFrameId);
			scrambleIntervals.forEach(clearInterval);
			cardLine.removeEventListener("mousedown", handleMouseDown);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
			cardLine.removeEventListener("touchstart", handleMouseDown);
			window.removeEventListener("touchmove", handleMouseMove);
			window.removeEventListener("touchend", handleMouseUp);
			cardLine.removeEventListener("wheel", handleWheel);
			window.removeEventListener("resize", handleResize);
			geometry.dispose();
			material.dispose();
			texture.dispose();
			renderer.dispose();
		};
	}, [isPaused, cards, scanEffect, initialSpeed]);

	const ctrlBtn =
		"grid place-items-center h-9 w-9 rounded-md border border-white/10 bg-white/[0.03] text-violet-100/80 transition hover:bg-violet-500/20 hover:text-white hover:border-violet-400/40 active:scale-95";

	return (
		<main className={cn("relative w-full h-[280px] flex items-center justify-center overflow-hidden", className)}>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-[0.25]"
				style={{
					backgroundImage:
						"linear-gradient(rgba(223,197,141,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(223,197,141,0.08) 1px, transparent 1px)",
					backgroundSize: "44px 44px",
					maskImage:
						"radial-gradient(110% 80% at 50% 50%, #000 30%, transparent 80%)",
				}}
			/>

			{showSpeed && (
				<div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-1.5 backdrop-blur-md">
					<Gauge className="h-3.5 w-3.5 text-[#dfc58d]" strokeWidth={2.2} />
					<span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#dfc58d]/80">
						scan rate
					</span>
					<span className="font-mono text-[13px] tabular-nums text-white">
						{String(speed).padStart(4, "0")}
					</span>
				</div>
			)}

			<canvas
				ref={particleCanvasRef}
				className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[250px] z-0 pointer-events-none"
			/>
			<canvas
				ref={scannerCanvasRef}
				className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[280px] z-10 pointer-events-none"
			/>

			<div
				className={`scanner-line absolute top-1/2 left-1/2 h-[260px] w-0.5 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-[#dfc58d] to-transparent rounded-full transition-opacity duration-300 z-20 pointer-events-none animate-scan-pulse ${
					isScanning ? "opacity-100" : "opacity-0"
				}`}
				style={{
					boxShadow:
						"0 0 10px #dfc58d, 0 0 20px #dfc58d, 0 0 30px #38bdf8, 0 0 50px #0284c7",
				}}
			/>

			<div className="absolute w-full h-[250px] flex items-center overflow-visible">
				<div
					ref={cardLineRef}
					className="flex items-center whitespace-nowrap cursor-grab select-none will-change-transform"
					style={{ gap: `${cardGap}px` }}
				>
					{cards.map((card) => (
						<div
							key={card.id}
							className="card-wrapper relative w-[400px] h-[250px] shrink-0"
						>
							<div
								className="card-normal card absolute top-0 left-0 w-full h-full rounded-[15px] overflow-hidden bg-transparent shadow-[0_15px_40px_rgba(0,0,0,0.4)] z-[2]"
								style={
									{
										clipPath: "inset(0 0 0 var(--clip-right, 0%))",
									} as CSSProperties
								}
							>
								<img
									src={card.image}
									alt="Card"
									draggable={false}
									className="w-full h-full object-cover rounded-[15px] transition-all duration-300 ease-in-out brightness-110 contrast-110 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] hover:brightness-125 hover:contrast-125"
								/>
							</div>
							<div
								className="card-ascii card absolute top-0 left-0 w-full h-full rounded-[15px] overflow-hidden bg-transparent z-[1]"
								style={
									{
										clipPath: "inset(0 calc(100% - var(--clip-left, 0%)) 0 0)",
									} as CSSProperties
								}
							>
								<pre className="ascii-content absolute top-0 left-0 w-full h-full text-[rgba(223,197,141,0.85)] font-mono text-[11px] leading-[13px] overflow-hidden whitespace-pre m-0 p-0 text-left align-top box-border [mask-image:linear-gradient(to_right,rgba(0,0,0,1)_0%,rgba(0,0,0,0.8)_30%,rgba(0,0,0,0.6)_50%,rgba(0,0,0,0.4)_80%,rgba(0,0,0,0.2)_100%)] animate-glitch">
									{card.ascii}
								</pre>
							</div>
						</div>
					))}
				</div>
			</div>

			{showControls && (
				<div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 p-1.5 backdrop-blur-md">
					<button
						type="button"
						onClick={toggleAnimation}
						aria-label={isPaused ? "Play" : "Pause"}
						className={ctrlBtn}
					>
						{isPaused ? (
							<Play className="h-4 w-4" />
						) : (
							<Pause className="h-4 w-4" />
						)}
					</button>
					<button
						type="button"
						onClick={changeDirection}
						aria-label="Reverse direction"
						className={ctrlBtn}
					>
						<ArrowLeftRight className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={resetPosition}
						aria-label="Reset"
						className={ctrlBtn}
					>
						<RotateCcw className="h-4 w-4" />
					</button>
				</div>
			)}
		</main>
	);
};

export { ScannerCardStream };
