// The game's words in Korean and English. Korean is the default (the beta is run in Korea); a
// browser set to another language opens in English, and the toggle in the top bar switches and
// remembers. Canvases read `t()` every frame, React reads it through `useLang()`.
import { useSyncExternalStore } from "react";

const LANG_KEY = "stairstack.lang";
export const LANGS = ["ko", "en"];

const ko = {
  "badge.menu": "준비",
  "badge.play": "플레이 중",
  "badge.paused": "일시정지",
  "badge.over": "게임 오버",
  "bar.score": "점수",
  "bar.time": "시간",
  "bar.lava": "용암",
  "bar.members": "부재",
  "bar.scoreSplit": "= {time} 생존 + {height} 높이",
  "bar.loading": "엔진 불러오는 중…",
  "bar.failed": "엔진 실패",
  "bar.pause": "일시정지",
  "bar.resume": "계속하기",
  "bar.musicOn": "음악 켜짐",
  "bar.musicOff": "음악 꺼짐",
  "bar.restart": "재시작",
  "bar.report": "제보하기",
  "bar.lang": "EN",

  "view.elevation": "입면",
  "view.elevationHint": "{face} · 용암 {lava} m · 깊이는 겹쳐 보임",
  "view.viewedFrom": "{side}쪽에서 봄",
  "view.plan": "평면",
  "view.planHint": "투시 평면 · 마우스로 조준 · 클릭해서 떨어뜨리기",
  "view.planBadge": "월드 X / Z",
  "view.starting": "물리 엔진 준비 중…",
  "view.failed": "물리 엔진을 시작하지 못했어요",
  "queue.next": "다음",

  "now.label": "지금",
  "now.waiting": "대기",
  "now.yaw": "회전 {deg}°",
  "status.menu": "게임 시작을 누르세요. 부재는 저절로 내려앉고, 용암은 바닥에서 올라옵니다.",
  "status.lava": "게임 오버 — 용암에 닿았어요. 다시 하기를 눌러 탑을 새로 쌓으세요.",
  "status.head": "게임 오버 — 부재가 머리 위로 떨어졌어요. 다시 하기를 눌러 탑을 새로 쌓으세요.",
  "status.paused": "일시정지 — 세상, 탑, 용암, 떨어지던 부재가 모두 멈춰 있어요.",
  "status.play": "버티고 오르세요 — 지금 {score}점 (생존 {time} + 최고 높이 {height}). 갈수록 부재가 빨리 내려오니 용암보다 먼저 쌓아 올리세요.",
  "footer.keys": "이동 A / D · 점프 W 또는 Space · 조준 마우스 · 회전 휠 {deg}° · 떨어뜨리기 왼쪽 클릭 · 화면 끝으로 걸어가면 면 전환 · 일시정지 Esc",
  "footer.rule": "실루엣 규칙: 깊이는 겹쳐 보여요 — 투영된 모든 면이 단단한 발판이에요",

  "member.slab": "슬래브",
  "member.plank": "판자",
  "member.block": "블록",
  "member.step": "계단",
  "member.beam": "보",
  "face.front": "정면",
  "face.right": "오른쪽 면",
  "face.back": "뒷면",
  "face.left": "왼쪽 면",
  "compass.N": "북",
  "compass.E": "동",
  "compass.S": "남",
  "compass.W": "서",

  "canvas.lava": "용암",
  "canvas.lavaBelow": "용암 ↓ {m} m 아래",
  "canvas.taken": "막힘",
  "canvas.blockedTurning": "{face} 막힘 — 되돌아가는 중",
  "canvas.blockedTurned": "{face} 막힘 — 되돌아옴",
  "canvas.died": "여기서 쓰러짐",

  "start.title": "쌓고, 오르고, 버텨라.",
  "start.lead": "부재는 저절로 내려앉고, 오래 버틸수록 더 빨리 내려와요. 원하는 곳에 떨어뜨리고, 부재가 남긴 실루엣을 밟고 올라가세요. 버틴 시간과 오른 높이가 모두 점수가 돼요.",
  "start.lava": "용암이 바닥에서 솟아올라 먼저 땅을 덮고, 그다음 탑을 타고 올라와요. 용암이 삼킨 부재는 현무암으로 굳어 다시 밟고 쌓을 수 있는 땅이 돼요. 용암에 닿거나, 떨어지는 부재에 머리를 맞으면 끝이에요.",
  "start.go": "게임 시작",
  "start.loading": "엔진 준비 중…",
  "start.failed": "엔진을 시작하지 못했어요",
  "start.privacy": "오픈 베타: 게임 개선을 위해 익명 플레이 기록(점수, 시간, 높이, 화면 크기)을 모아요. 이름·이메일 같은 개인정보는 받지 않아요. 리더보드에는 자동으로 정해진 닉네임 {name}(으)로 표시돼요.",
  "start.credits": "음악: Suno로 제작",

  "controls.mouse": "마우스",
  "controls.keyboard": "키보드",
  "controls.aim": "조준",
  "controls.aimText": "평면 위에서 마우스를 움직여 부재가 떨어질 곳을 골라요.",
  "controls.rotate": "회전",
  "controls.rotateText": "휠로 {deg}°씩 돌려요.",
  "controls.drop": "떨어뜨리기",
  "controls.dropText": "왼쪽 클릭하면 그 자리에 바로 떨어져요.",
  "controls.walk": "이동",
  "controls.walkText": "A / D로 지금 보는 면을 따라 움직여요.",
  "controls.jump": "점프",
  "controls.jumpText": "W 또는 Space. 위에 있는 부재에 점프로 부딪히는 건 괜찮아요.",
  "controls.pause": "일시정지",
  "controls.pauseText": "Esc로 멈추고, 다시 누르면 이어서 해요.",
  "controls.turn": "면 전환",
  "controls.turnText": "화면 양 끝으로 걸어 나가면 세상이 그쪽 면으로 90° 돌아가요(0.5초). 반대쪽 끝에서 들어오니 같은 방향으로 계속 걸으면 돼요.",
  "controls.turnFoot": "오른쪽: 정면 → 오른쪽 → 뒷면 → 왼쪽 · 왼쪽: 반대 순서",
  "controls.refused": "전환 거부",
  "controls.refusedText": "들어갈 자리를 부재가 이미 차지하고 있으면, 그 면으로 돌았다가 같은 0.5초 동안 바로 되돌아와요. 보던 입면은 그대로예요.",
  "controls.refusedFoot": "끝에서 조금 떨어졌다가 다시 시도하세요",
  "diagram.aim": "조준",
  "diagram.wheel": "휠",
  "diagram.jump": "점프",
  "diagram.keys": "A / D · W / SPACE",
  "diagram.left": "왼쪽",
  "diagram.right": "오른쪽",
  "diagram.now": "지금",
  "diagram.taken": "막힘",
  "diagram.nextFace": "다음 면",
  "diagram.out": "가기 0.5초",
  "diagram.back": "오기 0.5초",

  "pause.title": "일시정지",
  "pause.lead": "세상, 탑, 용암, 떨어지던 부재가 모두 멈춰 있어요.",
  "pause.resume": "계속하기",
  "pause.restart": "재시작",
  "pause.confirm": "한 번 더 누르면 재시작",
  "pause.sound": "소리",
  "pause.music": "음악",
  "pause.off": "꺼짐",
  "pause.mute": "음소거",
  "pause.unmute": "소리 켜기",
  "pause.controls": "조작법",
  "pause.language": "언어",

  "over.title": "게임 오버",
  "over.lava": "용암에 닿았어요. 용암이 삼킨 부재는 땅으로 굳어요 — 용암보다 빨리 쌓아 올리면 더 오래 버틸 수 있어요.",
  "over.head": "부재가 머리 위로 떨어졌어요. 위의 부재에 점프로 부딪히는 건 괜찮아요 — 떨어지는 부재만 위험해요.",
  "over.score": "점수",
  "over.survival": "생존 점수",
  "over.height": "높이 점수",
  "over.best": "최고 {m} m",
  "over.members": "놓은 부재",
  "over.top": "탑 꼭대기",
  "over.lavaHeight": "용암 높이",
  "over.board": "리더보드",
  "over.loading": "불러오는 중…",
  "over.empty": "아직 기록이 없어요.",
  "over.you": " (나)",
  "over.runs": "{n}판",
  "over.retry": "다시 하기",
  "over.look": "쓰러진 곳 보기",
  "over.back": "결과로 돌아가기",
  "over.why": "무엇 때문에",
  "over.whyLava": "마지막 3초 동안 {climb} m 오르는 사이, 용암은 {rise} m 올라왔어요. 용암보다 빨리 올라가야 해요.",
  "over.whyHead": "{type}이(가) 머리 위로 떨어졌어요. 떨어지는 부재 밑에서는 비켜서세요.",
  "over.trail": "점선: 마지막 몇 초 동안 지나온 길",

  "report.title": "버그 · 개선 제보",
  "report.lead": "이상한 점이나 바라는 점을 알려 주세요. 지금 판의 상황(점수, 시간, 화면 크기)이 함께 저장돼요.",
  "report.bug": "버그",
  "report.idea": "개선 제안",
  "report.other": "기타",
  "report.placeholder": "무슨 일이 있었는지, 또는 무엇이 좋아지면 좋을지 적어 주세요.",
  "report.send": "보내기",
  "report.sending": "보내는 중…",
  "report.sent": "고마워요! 잘 받았어요.",
  "report.failed": "보내지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  "report.tooMany": "제보가 너무 잦아요. 조금 뒤에 다시 보내 주세요.",
  "report.offline": "지금은 제보를 받을 수 없는 환경이에요 (개발 서버).",
  "report.close": "닫기",

  "mobile.title": "PC에서 플레이해 주세요",
  "mobile.lead": "STAIRSTACK은 마우스와 키보드로 하는 게임이라 지금은 PC 브라우저에서만 플레이할 수 있어요.",
  "mobile.copy": "링크 복사",
  "mobile.copied": "복사했어요!",
  "mobile.anyway": "그래도 열어 보기",
};

const en = {
  "badge.menu": "Ready",
  "badge.play": "Playing",
  "badge.paused": "Paused",
  "badge.over": "Game Over",
  "bar.score": "SCORE",
  "bar.time": "TIME",
  "bar.lava": "LAVA",
  "bar.members": "MEMBERS",
  "bar.scoreSplit": "= {time} time + {height} height",
  "bar.loading": "loading engine…",
  "bar.failed": "engine failed",
  "bar.pause": "Pause",
  "bar.resume": "Resume",
  "bar.musicOn": "Music on",
  "bar.musicOff": "Music off",
  "bar.restart": "Restart",
  "bar.report": "Report",
  "bar.lang": "한국어",

  "view.elevation": "Elevation",
  "view.elevationHint": "{face} face · lava {lava} m · depth collapsed",
  "view.viewedFrom": "Viewed from {side}",
  "view.plan": "Top View",
  "view.planHint": "plan in perspective · aim with the mouse · click to drop",
  "view.planBadge": "world X / Z",
  "view.starting": "Starting physics world…",
  "view.failed": "Physics engine failed to start",
  "queue.next": "Next",

  "now.label": "Now",
  "now.waiting": "waiting",
  "now.yaw": "yaw {deg}°",
  "status.menu": "Press Game Start. Members sink in on their own, and the lava starts on the floor.",
  "status.lava": "Game over — the lava caught you. Hit Retry to build the tower again.",
  "status.head": "Game over — a member landed on your head. Hit Retry to build the tower again.",
  "status.paused": "Paused — the world, the stack, the lava and the member in flight are all holding still.",
  "status.play": "Survive and climb — {score} points so far ({time} for time, {height} for your best height). Members arrive faster as it goes on; keep the stack ahead of the lava.",
  "footer.keys": "MOVE A / D · JUMP W or Space · AIM mouse · ROTATE wheel {deg}° · DROP left click · EDGE off either end turns the view · PAUSE Esc",
  "footer.rule": "Silhouette rule: depth collapses — every projected face is solid, the climber's included",

  "member.slab": "Slab",
  "member.plank": "Plank",
  "member.block": "Block",
  "member.step": "Step",
  "member.beam": "Beam",
  "face.front": "FRONT",
  "face.right": "RIGHT",
  "face.back": "BACK",
  "face.left": "LEFT",
  "compass.N": "NORTH",
  "compass.E": "EAST",
  "compass.S": "SOUTH",
  "compass.W": "WEST",

  "canvas.lava": "LAVA",
  "canvas.lavaBelow": "LAVA ↓ {m} m BELOW",
  "canvas.taken": "TAKEN",
  "canvas.blockedTurning": "{face} FACE BLOCKED — TURNING BACK",
  "canvas.blockedTurned": "{face} FACE BLOCKED — TURNED BACK",
  "canvas.died": "DOWN HERE",

  "start.title": "Stack it. Climb it.",
  "start.lead": "Members sink in on their own — and quicker the longer you last. Drop them where you want, then climb the silhouettes they leave behind. Every second you stay alive scores, and so does every metre you climb.",
  "start.lava": "Lava climbs out of the floor: it floods the ground first, then rises up the stack — whatever it swallows sets hard into basalt, ground you can keep building on. Touch the lava and the run is over. A member coming down on your head ends it too.",
  "start.go": "Game Start",
  "start.loading": "Starting engine…",
  "start.failed": "Engine failed to start",
  "start.privacy": "Open beta: to improve the game we keep anonymous play records (score, time, height, screen size). No name or email is collected. On the leaderboard you appear as your automatic nickname, {name}.",
  "start.credits": "Music made with Suno",

  "controls.mouse": "Mouse",
  "controls.keyboard": "Keyboard",
  "controls.aim": "Aim",
  "controls.aimText": "Move the mouse over the plan to choose where the member lands.",
  "controls.rotate": "Rotate",
  "controls.rotateText": "The wheel turns it {deg}° at a time.",
  "controls.drop": "Drop",
  "controls.dropText": "Left click drops it right where it is.",
  "controls.walk": "Walk",
  "controls.walkText": "A / D moves the climber along the view being read.",
  "controls.jump": "Jump",
  "controls.jumpText": "W or Space jumps. Jumping into a member above you is safe.",
  "controls.pause": "Pause",
  "controls.pauseText": "Esc stops the run where it stands, and starts it again.",
  "controls.turn": "Face turn",
  "controls.turnText": "Walk off either end of the view and the world turns 90° to that side's elevation over half a second — the climber enters it from the far side, so keep walking the same way.",
  "controls.turnFoot": "Right: front → right → back → left · Left: the reverse",
  "controls.refused": "Turn refused",
  "controls.refusedText": "If a member already fills the spot the climber would arrive on, the world turns to that face and comes straight back over the same half second — the elevation you were reading stays put.",
  "controls.refusedFoot": "Step clear of the end before trying again",
  "diagram.aim": "AIM",
  "diagram.wheel": "WHEEL",
  "diagram.jump": "JUMP",
  "diagram.keys": "A / D · W / SPACE",
  "diagram.left": "LEFT",
  "diagram.right": "RIGHT",
  "diagram.now": "NOW",
  "diagram.taken": "TAKEN",
  "diagram.nextFace": "NEXT FACE",
  "diagram.out": "OUT 0.5 s",
  "diagram.back": "BACK 0.5 s",

  "pause.title": "Paused",
  "pause.lead": "The world, the stack, the lava and the member in flight are all holding still.",
  "pause.resume": "Resume",
  "pause.restart": "Restart",
  "pause.confirm": "Click again to restart",
  "pause.sound": "Sound",
  "pause.music": "Music",
  "pause.off": "off",
  "pause.mute": "Mute",
  "pause.unmute": "Unmute",
  "pause.controls": "Controls",
  "pause.language": "Language",

  "over.title": "Game Over",
  "over.lava": "The lava caught you. Whatever it swallows sets into ground to build on — keep the stack climbing faster than it rises, and you last longer.",
  "over.head": "A member came down on your head. Jumping into one above is safe — only a falling member ends the run.",
  "over.score": "Score",
  "over.survival": "Survival score",
  "over.height": "Height score",
  "over.best": "best {m} m",
  "over.members": "Members placed",
  "over.top": "Stack top",
  "over.lavaHeight": "Lava height",
  "over.board": "Leaderboard",
  "over.loading": "Loading…",
  "over.empty": "No runs yet.",
  "over.you": " (you)",
  "over.runs": "{n} runs",
  "over.retry": "Retry",
  "over.look": "See where you fell",
  "over.back": "Back to results",
  "over.why": "What happened",
  "over.whyLava": "In the last 3 seconds you climbed {climb} m while the lava rose {rise} m. Climb faster than it rises.",
  "over.whyHead": "A {type} came down on your head. Step out from under a falling member.",
  "over.trail": "Dotted line: the path you took in the last few seconds",

  "report.title": "Report a bug or idea",
  "report.lead": "Tell us what went wrong or what you'd like. The current run's state (score, time, screen size) is saved with it.",
  "report.bug": "Bug",
  "report.idea": "Idea",
  "report.other": "Other",
  "report.placeholder": "What happened, or what would make it better?",
  "report.send": "Send",
  "report.sending": "Sending…",
  "report.sent": "Thanks! We got it.",
  "report.failed": "Couldn't send it. Please try again in a moment.",
  "report.tooMany": "Too many reports in a row. Please wait a little and try again.",
  "report.offline": "Reports can't be sent from here (dev server).",
  "report.close": "Close",

  "mobile.title": "Please play on a computer",
  "mobile.lead": "STAIRSTACK is played with a mouse and keyboard, so for now it only runs in a desktop browser.",
  "mobile.copy": "Copy link",
  "mobile.copied": "Copied!",
  "mobile.anyway": "Open it anyway",
};

const DICT = { ko, en };

function initial() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    // no storage: fall back to the browser's language
  }
  const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
  return nav && !nav.toLowerCase().startsWith("ko") ? "en" : "ko";
}

let lang = initial();
const listeners = new Set();

export function getLang() {
  return lang;
}

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    // the choice just won't survive a reload
  }
  if (typeof document !== "undefined") document.documentElement.lang = next;
  for (const fn of listeners) fn();
}

// The phrase for `key` in the current language, with {name} placeholders filled from `vars`.
export function t(key, vars) {
  const s = DICT[lang][key] ?? DICT.ko[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : s;
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// React components re-render when the language changes; `t` is the same function either way.
export function useLang() {
  const current = useSyncExternalStore(subscribe, getLang, getLang);
  return { lang: current, t, setLang };
}

if (typeof document !== "undefined") document.documentElement.lang = lang;
