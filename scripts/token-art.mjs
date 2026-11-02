/** Update generic artwork on existing world actors without replacing custom art. */
export async function migrateTokenArt(gameContext = game, fetchCatalog = fetch) {
  if (!gameContext.user.isGM) return 0;
  if (gameContext.users?.activeGM && gameContext.users.activeGM.id !== gameContext.user.id) return 0;
  const response = await fetchCatalog('systems/berserkr-rpg/assets/tokens/catalog.json');
  if (!response.ok) throw new Error(`Catálogo de tokens: ${response.status}`);
  const catalog = await response.json();
  const generic = value => !value || [
    'systems/berserkr-rpg/assets/icons-ink/creature.png',
    'systems/berserkr-rpg/assets/icons/creature.svg',
    'icons/svg/mystery-man.svg'
  ].includes(value);
  const updates = [];
  for (const actor of gameContext.actors) {
    if (actor.type !== 'creature') continue;
    const source = actor.flags?.core?.sourceId ?? actor._stats?.compendiumSource;
    const entry = catalog.find(row => source === `Compendium.berserkr-rpg.${row.pack}.Actor.${row.id}`)
      ?? catalog.find(row => row.name === actor.name);
    if (!entry) continue;
    const update = {_id: actor.id};
    if (generic(actor.img) || [entry.src, entry.src.replace(/\.webp$/, '.png')].includes(actor.img)) update.img = entry.portrait;
    if (generic(actor.prototypeToken?.texture?.src) || actor.prototypeToken?.texture?.src === entry.src.replace(/\.webp$/, '.png')) update['prototypeToken.texture.src'] = entry.src;
    if (Object.keys(update).length > 1) updates.push(update);
  }
  if (updates.length) await gameContext.actors.documentClass.updateDocuments(updates);
  // Preserve placed tokens when their exact system asset is repackaged losslessly.
  const oldPaths = new Map(catalog.map(row => [row.src.replace(/\.webp$/, '.png'), row.src]));
  for (const scene of gameContext.scenes ?? []) {
    const tokenUpdates = [];
    for (const token of scene.tokens ?? []) {
      const src = oldPaths.get(token.texture?.src);
      if (src && src !== token.texture.src) tokenUpdates.push({_id: token.id, 'texture.src': src});
    }
    if (tokenUpdates.length) await scene.updateEmbeddedDocuments('Token', tokenUpdates);
  }
  return updates.length;
}
Hooks.once('ready', async () => {
  try { await migrateTokenArt(); }
  catch (error) { console.error('Berserkr | Falha ao atualizar as artes dos tokens', error); }
});
