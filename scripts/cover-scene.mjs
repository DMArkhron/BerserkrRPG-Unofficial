const COVER = 'systems/berserkr-rpg/assets/covers/berserkr-system-cover-0.19.6.png';
const OLD_COVER = 'systems/berserkr-rpg/assets/covers/berserkr-system-cover.png';

export async function updateCoverScene(context = game, SceneDocument = Scene) {
  if (!context.user.isGM) return 0;
  if (context.users?.activeGM && context.users.activeGM.id !== context.user.id) return 0;
  const names = ['berserkr', 'berserkr — capa', 'berserkr - capa', 'berserkr — abertura', 'berserkr - abertura', 'capa berserkr'];
  const scenes = context.scenes.filter(scene => scene.getFlag('berserkr-rpg', 'coverScene')
    || [COVER, OLD_COVER].includes(scene.background?.src)
    || names.includes(scene.name.trim().toLowerCase()));
  if (!scenes.length) {
    await SceneDocument.create({name: 'Berserkr — Capa', background: {src: COVER}, width: 1536, height: 512,
      padding: 0, grid: {type: 0}, navigation: true, active: false,
      flags: {'berserkr-rpg': {coverScene: true, coverVersion: '0.19.6'}}});
    return 1;
  }
  let updated = 0;
  for (const scene of scenes) {
    if (scene.background?.src === COVER && scene.getFlag('berserkr-rpg', 'coverVersion') === '0.19.6') continue;
    await scene.update({'background.src': COVER, width: 1536, height: 512,
      'flags.berserkr-rpg.coverScene': true, 'flags.berserkr-rpg.coverVersion': '0.19.6'});
    updated++;
  }
  return updated;
}

Hooks.once('ready', async () => {
  try { await updateCoverScene(); }
  catch (error) { console.error('Berserkr | Falha ao atualizar a cena de capa', error); }
});
