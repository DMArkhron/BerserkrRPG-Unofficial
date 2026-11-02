import {ATTRIBUTES,CONDITIONS,armorProfile,resolveTest,netAdvantage,testFormula,keptNatural,mitigatedDamage,changedHP,conditionModifiers,resourceLimit} from './rules.mjs';
import {ask,field,select,check,escape,message,applyButton,testSummary} from './ui.mjs';
const locks=new Map();
export async function exclusive(key,fn){if(locks.has(key))return ui.notifications.warn('Uma ação já está em andamento.');locks.set(key,true);try{return await fn();}finally{locks.delete(key);}}
const owns=actor=>actor?.isOwner;
const effects=actor=>new Set(actor.statuses??[]);
const has= (actor,id)=>effects(actor).has(id);
const roll=async formula=>{if(!Roll.validate(formula))throw new Error('Fórmula inválida: '+formula);return new Roll(formula).evaluate();};
export function equippedArmor(actor){return actor.items.filter(i=>i.type==='armor'&&i.system.equipped&&i.system.quantity>0).sort((a,b)=>b.system.category-a.system.category)[0];}
export function activeBonus(actor,key){return actor.effects.filter(e=>!e.disabled).reduce((n,e)=>n+Number(e.getFlag('berserkr-rpg','bonuses')?.[key]??0),0);}
export async function timedEffect(actor,name,{rounds=0,bonuses={},dot='',healing='',statuses=[],removeConditions=false,description='',consumeOn='',extraDamage='',onExpire=''}={}){
 if(!owns(actor))return message(actor,name,`<p>${escape(description||'O mestre precisa aplicar este efeito à ficha.')}</p>`);
 const duration=rounds>0&&game.combat?{rounds,combat:game.combat.id,startRound:game.combat.round,startTurn:game.combat.turn}:{};
 const [effect]=await actor.createEmbeddedDocuments('ActiveEffect',[{name,img:'systems/berserkr-rpg/assets/icons-ink/ability.png',statuses,duration,flags:{'berserkr-rpg':{remaining:rounds,bonuses,dot,healing,removeConditions,description,consumeOn,extraDamage,onExpire,createdRound:game.combat?.round??null,createdCombat:game.combat?.id??null}}}]);return effect;
}
export async function spend(actor){if(!owns(actor))throw new Error('Sem permissão para usar Destinos.');if(actor.system.destinos.value<1)throw new Error('Sem Destinos disponíveis.');await actor.update({'system.destinos.value':actor.system.destinos.value-1});}
function penalties(actor,attribute,kind){let dc=0;const armor=equippedArmor(actor);if(attribute==='agilidade')dc+=kind==='defense'?armorProfile(armor?.system.category??1).defensePenalty:(armor?.system.agilityPenalty??0);if(actor.load>actor.carryingCapacity&&['forca','agilidade'].includes(attribute))dc+=2;return dc;}
export function canParry(actor){const key=game.combat?.id??'manual';return !(actor.system.parryUsed&&actor.system.parryCombat===key);}
function ensureAction(actor,kind){if(!owns(actor))throw new Error('Sem permissão para esta ficha.');if(has(actor,'dead'))throw new Error('Personagem morto.');if(has(actor,'stunned')&&['attack','parry','rune'].includes(kind))throw new Error('Atordoado: não pode realizar esta ação.');}
async function fatiguedCheck(actor){if(!has(actor,'fatigued'))return true;const r=await roll(`1d20 + ${actor.type==='creature'?0:actor.system.attributes.fortitude}`);await r.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:'Fadiga — Fortitude CD10'});if(r.total>=10)return true;await message(actor,'Exaustão','<p>Não pode agir nesta rodada.</p>');return false;}
export async function performTest(actor,config){
 const {attribute,kind='test',bonus=0,advantage=0}=config;let dc=Number(config.dc??12)+penalties(actor,attribute,kind);
 if(!Number.isFinite(dc)||dc<0)throw new Error('CD inválida.');
 if(actor.getFlag('berserkr-rpg','hemorrhageHours'))dc=Math.max(16,dc);
 let modifier=(actor.type==='creature'?0:actor.system.attributes[attribute])+Number(bonus)+activeBonus(actor,'general')+activeBonus(actor,attribute);
 modifier+=activeBonus(actor,kind);if(kind==='test')modifier+=activeBonus(actor,'nonCombat');
 const sources=conditionModifiers(effects(actor),attribute,kind);if(has(actor,'poisoned')&&(!game.combat||actor.system.poisonBad))sources.push(-1);
 const adv=netAdvantage(Number(advantage),sources,config.targetProne?1:0,kind==='defense'&&activeBonus(actor,'defenseAdvantage')?1:0);
 if(config.destiny==='cd'){await spend(actor);dc=Math.max(0,dc-4);}
 let r=await roll(`${testFormula(adv)} + ${modifier}`);
 let outcome=resolveTest(keptNatural(r),r.total,dc);
 if(config.destiny==='cancel'&&(outcome.disaster||outcome.critical)){await spend(actor);outcome=resolveTest(keptNatural(r),r.total,dc,{cancelCritical:true});}
 if(kind==='attack'&&activeBonus(actor,'autoHit'))outcome={success:true,critical:false,disaster:false};
 for(const e of Array.from(actor.effects)){const f=e.flags?.['berserkr-rpg'];if(e.disabled||!f)continue;if(f.consumeOn==='test'||f.consumeOn===kind||(kind==='test'&&f.consumeOn==='nonCombat'))await e.delete();else if(kind==='attack'&&f.consumeOn==='attackOnly')await e.update({'flags.berserkr-rpg.bonuses.autoHit':0,'flags.berserkr-rpg.consumeOn':''});}
 return {...outcome,natural:keptNatural(r),total:r.total,dc,advantage:adv,roll:r};
}
function testChoices(actor,attribute,kind,dc=12){return field('CD básica (antes de armadura e carga)','dc',dc)+field('Bônus circunstancial','bonus',0)+select('Rolagem','advantage',{'0':'Normal','1':'Vantagem','-1':'Desvantagem'},'0')+select('Destino','destiny',{none:'Não gastar',cd:'Gastar 1: reduzir CD em 4',cancel:'Gastar 1 somente se houver crítico/desastre: anulá-lo'},'none');}
export async function attributeTest(actor,key){return exclusive(actor.uuid,async()=>{ensureAction(actor,'test');const input=await ask('Teste de '+ATTRIBUTES[key],testChoices(actor,key,'test'));if(!input)return;const config={...input,attribute:key,kind:'test'};const result=await performTest(actor,config);return testCard(actor,result,config);});}
async function testCard(actor,result,config,extra='',payload={}){
 const action={attack:'Ataque',defense:'Defesa',parry:'Aparar',test:'Teste',rune:'Runa'}[config.kind]??'Teste';
 const title=action+(config.itemName?' — '+config.itemName:'');
 return message(actor,title,`${testSummary(result,ATTRIBUTES[config.attribute])}${extra}${applyButton('reroll','Rerrolar · 1 Destino ou efeito gratuito')}`,{actorUuid:actor.uuid,testConfig:config,payload,result:{...result,roll:undefined},resolved:false},[result.roll]);
}
function targetOptions(){const list=Array.from(game.user.targets??[]);return {list,choices:Object.fromEntries([['','Sem alvo'],...list.map(t=>[t.actor.uuid,t.name])])};}
export async function attack(actor,item){return exclusive(actor.uuid,async()=>{
 ensureAction(actor,'attack');if(item?.system.broken)throw new Error('Arma quebrada. Repare ou use outra arma.');if(!await fatiguedCheck(actor))return;
 const {list,choices}=targetOptions();const first=list[0]?.actor;
 const input=await ask('Ataque — '+(item?.name??'Desarmado'),testChoices(actor,item?.system.attribute??'forca','attack',first?.system.defenseDC??12)+select('Alvo selecionado','targetUuid',choices,first?.uuid??'')+check('Gastar 1 Destino para dano máximo','maxDamage'));
 if(!input)return;if(input.maxDamage&&actor.system.destinos.value<(input.destiny==='none'?1:2))throw new Error('Sem Destinos para dano máximo.');
 const target=input.targetUuid?await fromUuid(input.targetUuid):null;
 const config={...input,kind:'attack',attribute:item?.system.attribute??'forca',itemUuid:item?.uuid??null,targetProne:(target?.statuses?.has('prone')||target?.statuses?.has('stunned')||activeBonus(target??{effects:[]},'marked')>0)??false};
 const result=await performTest(actor,config);return attackResult(actor,item,result,config);
 });}
async function attackResult(actor,item,result,config){
 config={...config,itemName:item?.name??'Desarmado'};
 let extra='',payload={kind:'attack',targetUuid:config.targetUuid,itemUuid:item?.uuid};
 if(result.success){
  if(config.maxDamage)await spend(actor);
  const formula=item?.system.damage??'1d2';const damageRoll=new Roll(formula);await damageRoll.evaluate({maximize:!!config.maxDamage||activeBonus(actor,'maximizeDamage')>0});
  let extraDamage=0;for(const e of actor.effects.filter(e=>!e.disabled)){const formula=e.flags?.['berserkr-rpg']?.extraDamage;if(formula)extraDamage+=(await roll(formula)).total;}
  const amount=(damageRoll.total+activeBonus(actor,'damage')+extraDamage)*(result.critical?2:1)*(activeBonus(actor,'doubleDamage')>0?2:1);
  for(const e of Array.from(actor.effects))if(!e.disabled&&e.flags?.['berserkr-rpg']?.consumeOn==='hit')await e.delete();

  payload={...payload,damage:Math.max(0,amount),degrade:result.critical};extra=`<p>Dano: <b>${amount}</b>${result.critical?' (dobrado; degrada armadura em 1 categoria)':''}.</p>${config.targetUuid?applyButton('applyDamage','Aplicar dano ao alvo'):'<p>Sem alvo. Use Receber dano na ficha atingida.</p>'}`;
 }else if(result.disaster){extra='<p>A arma quebra ou é perdida, conforme escolha da mesa.</p>'+ (item?applyButton('breakWeapon','Marcar arma como quebrada'):'');}
 return testCard(actor,result,config,extra,payload);
}
export async function defense(actor,parry=false){return exclusive(actor.uuid,async()=>{
 ensureAction(actor,parry?'parry':'defense');if(parry&&!canParry(actor))throw new Error('Aparar já usado neste combate.');
 if(parry&&!await fatiguedCheck(actor))return;
 const targets=targetOptions();const attacker=targets.list[0]?.actor;
 const weapons=actor.items.filter(i=>i.type==='weapon'&&!i.system.broken&&i.system.quantity>0);
 const input=await ask(parry?'Aparar — uma vez por combate':'Defesa',testChoices(actor,parry?'fortitude':'agilidade',parry?'parry':'defense',12+(attacker?.system.defenseBonus??0))+field('Dano recebido antes de defesa','incoming',0)+select('Arma de contra-ataque','weaponId',Object.fromEntries([['','Desarmado (d2)'],...weapons.map(i=>[i.id,i.name])]),weapons.find(i=>i.system.equipped)?.id??'')+select('Atacante / alvo do contra-ataque','targetUuid',targets.choices,attacker?.uuid??''));
 if(!input)return;if(!Number.isInteger(input.incoming)||input.incoming<0)throw new Error('Dano inválido.');
 if(parry)await actor.update({'system.parryUsed':true,'system.parryCombat':game.combat?.id??'manual'});
 const config={...input,kind:parry?'parry':'defense',attribute:parry?'fortitude':'agilidade',dc:input.dc+(parry?3:0)};
 const result=await performTest(actor,config);return defenseResult(actor,result,config);
 });}
async function defenseResult(actor,result,config){
 let extra='',payload={kind:config.kind,targetUuid:actor.uuid,damage:0,degrade:false};
 if(!result.success&&config.incoming>0){payload.damage=config.incoming*(result.disaster?2:1);payload.degrade=result.disaster;extra=`<p>Recebe ${payload.damage} de dano antes da armadura${result.disaster?' e perde 1 categoria de armadura':''}.</p>`+applyButton('applyDamage','Aplicar dano à ficha');
  if(result.disaster&&config.kind==='parry'&&config.weaponId){payload.itemUuid=actor.items.get(config.weaponId)?.uuid;extra+=applyButton('breakWeapon','Marcar arma como quebrada');}
 }else if(!result.success){extra='<p>Ataque não bloqueado. Informe o dano em Receber dano.</p>';
 }else if(config.kind==='parry'){
  const weapon=actor.items.get(config.weaponId);const damageRoll=await roll(weapon?.system.damage??'1d2');const damage=(damageRoll.total+activeBonus(actor,'damage'))*(result.critical?2:1);
  payload={kind:'parryCounter',targetUuid:config.targetUuid,damage,degrade:result.critical};extra=`<p>Ataque bloqueado. Contra-ataque: ${damage} de dano.</p>`+(config.targetUuid?applyButton('applyDamage','Aplicar contra-ataque'):'');
 }else extra=result.critical?'<p>Ataque evitado. Pode fazer um ataque gratuito.</p>':'<p>Ataque evitado.</p>';
 return testCard(actor,result,config,extra,payload);
}
export async function heal(actor,amount){const extra=actor.system.className==='Guardião Vanir'&&amount>0?1:0;await actor.update({'system.hp.value':changedHP(actor.system.hp.value,actor.system.hp.max,Math.max(0,amount)+extra)});return amount+extra;}
export async function receiveDamage(actor,{damage,degrade=false,ignoreArmor=false,damageType='normal',sourceUuid=null}={}){
 ensureAction(actor,'damage');let amount=Number(damage);if(!Number.isFinite(amount)||amount<0)throw new Error('Dano inválido.');
 if((damageType==='fire'&&actor.system.className==='Construto de Chamas')||(damageType==='cold'&&actor.system.className==='Gigante de Gelo'))amount=Math.floor(amount/2);
 if(activeBonus(actor,'blockNextHit')>0){for(const e of Array.from(actor.effects))if(e.getFlag('berserkr-rpg','bonuses')?.blockNextHit)await e.delete();await message(actor,'Golpe bloqueado','<p>Guardião de Algiz anulou este golpe.</p>');return {damage:0,hp:actor.system.hp.value};}
 if(activeBonus(actor,'nextDoubleIncoming')>0){amount*=2;for(const e of Array.from(actor.effects))if(e.getFlag('berserkr-rpg','bonuses')?.nextDoubleIncoming)await e.delete();}
 const half=activeBonus(actor,'halveDamage')>0;if(half)amount=Math.floor(amount/2);
 const armor=equippedArmor(actor);const reduction=ignoreArmor?'0':armor?.system.reduction??'0';const armorRoll=await roll(reduction);const mitigated=mitigatedDamage(amount,armorRoll.total,ignoreArmor?0:activeBonus(actor,'armor'));
 const before=actor.system.hp.value;const next=before-mitigated;await actor.update({'system.hp.value':next});
 if(degrade&&armor&&armor.system.category>=2){const category=armor.system.category-1;await armor.update({'system.category':category,'system.reduction':armorProfile(category).reduction,'system.agilityPenalty':armorProfile(category).agilityPenalty});}
 await message(actor,'Dano recebido',`<p>${amount} − ${armorRoll.total} de armadura = ${mitigated} de dano. PV: ${before} → ${next}.</p>${degrade?'<p>A degradação ocorre após a redução deste golpe.</p>':''}`);
 if(next<0){await actor.toggleStatusEffect('dead',{active:true});await message(actor,'Morte','<p>PV negativos: personagem morto. Registre e conte sua Saga.</p>');}
 else if(next===0&&before>0){if(actor.type==='character')await broken(actor);else await message(actor,'Criatura derrotada','<p>A criatura chegou a zero PV.</p>');}
 if(before>0&&next<=0&&sourceUuid){const source=await fromUuid(sourceUuid);if(source?.isOwner&&source.system.className==='Berserkr')await heal(source,1);}
 return {raw:amount,reduction:armorRoll.total,damage:mitigated,hp:next};
}
export async function damageDialog(actor,payload={}){
 if(!owns(actor))return ui.notifications.warn('O proprietário ou mestre precisa aplicar o dano.');
 const input=await ask('Aplicar dano — '+actor.name,field('Dano antes da armadura','damage',payload.damage??0)+select('Tipo de dano','damageType',{normal:'Normal',fire:'Fogo',cold:'Gelo'},'normal')+check('Ignorar armadura','ignoreArmor',payload.ignoreArmor)+check('Degradar armadura após o golpe','degrade',payload.degrade)+check('Gastar 1 Destino para reduzir d6','useDestiny'),'Aplicar');
 if(!input)return false;
 return exclusive(actor.uuid,async()=>{let damage=input.damage;if(input.useDestiny){await spend(actor);const r=await roll('1d6');damage=Math.max(0,damage-r.total);await r.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:'Destino — redução de dano'});}await receiveDamage(actor,{...payload,...input,damage});return true;});
}
export async function broken(actor){
 const r=await roll('1d6');await r.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:'Quebrado — zero PV'});
 const n=r.total;
 if(n===1){const rounds=(await roll('1d4')).total;const recovery=(await roll('1d4')).total;await actor.toggleStatusEffect('unconscious',{active:true});await timedEffect(actor,'Recuperar de inconsciência',{rounds,description:`Acorda em ${rounds} rodadas com ${recovery}PV.`});await actor.setFlag('berserkr-rpg','wakeHP',recovery);}
 if(n===2)await actor.toggleStatusEffect('feverish',{active:true});
 if(n===3)await actor.update({'system.attributes.astucia':actor.system.attributes.astucia-1});
 if(n===4){const pack=game.packs.get('berserkr-rpg.tables');const index=await pack.getIndex();const entry=index.find(x=>x.name==='Lesões Incapacitantes');if(entry)await (await pack.getDocument(entry._id)).draw();}
 if(n===5){const hours=(await roll('1d2')).total;await actor.setFlag('berserkr-rpg','hemorrhageHours',hours);}
 if(n===6)await actor.toggleStatusEffect('dead',{active:true});
 const texts={1:'Inconsciente; recuperação indicada no efeito temporário.',2:'Membro fraturado ou decepado. Febril.',3:'Perde dentes; Astúcia reduzida em 1.',4:'Lesão incapacitante: consulte o resultado da tabela.',5:'Hemorragia: consulte as horas restantes na ficha. Testes em CD16 até tratamento.',6:'Morto.'};await message(actor,'Quebrado',`<p>${texts[n]}</p>`);
}
export async function rest(actor,long=false){return exclusive(actor.uuid,async()=>{
 ensureAction(actor,'rest');const food=actor.items.find(i=>i.system.consumable==='food'&&i.system.uses>0),water=actor.items.find(i=>i.system.consumable==='water'&&i.system.uses>0);
 const input=await ask(long?'Descanso longo — seis horas':'Descanso curto',check('Há comida e água disponíveis','supplied',!!food&&!!water)+check('Consumir 1 uso de comida e 1 de água do inventário','consume',!!food&&!!water), 'Descansar');if(!input)return;
 if(input.consume&&(!food||!water))throw new Error('Inventário sem comida ou água. Desmarque o consumo se os suprimentos forem externos.');
 if(input.consume){await food.update({'system.uses':food.system.uses-1});await water.update({'system.uses':water.system.uses-1});}
 const hpRoll=await roll(long?'1d6':'1d4');if(input.supplied)await heal(actor,hpRoll.total);
 if(long){const destiny=await new Roll(actor.system.destinyFormula||'1d2',actor.getRollData()).evaluate();const rune=await new Roll('1d4 + @attributes.astucia',actor.getRollData()).evaluate();const limit=resourceLimit(rune.total);
  await actor.update({'system.destinos.value':destiny.total,'system.destinos.max':destiny.total,'system.runes.value':limit,'system.runes.max':limit,'system.poisonBad':false,'system.restCounter':actor.system.restCounter+1});await actor.toggleStatusEffect('fatigued',{active:false});
  if(has(actor,'feverish')){const fever=await roll(`1d20 + ${actor.system.attributes.fortitude}`);await fever.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:'Febre — Fortitude CD10, início do dia'});if(fever.total<10)await actor.toggleStatusEffect('fatigued',{active:true});}
 }
 await message(actor,long?'Descanso longo':'Descanso curto',`<p>${input.supplied?'Recuperação de PV: '+hpRoll.total:'Sem comida e água: não recupera PV.'}${long?' Destinos e limite rúnico rerrolados.':''}</p>`);
 });}
export async function clearConditions(actor){for(const id of Object.keys(CONDITIONS))if(has(actor,id))await actor.toggleStatusEffect(id,{active:false});await actor.update({'system.poisonBad':false});}
export async function processTurn(actor,{manual=false}={}){
 if(!owns(actor)||has(actor,'dead'))return;
 const turnKey=game.combat?`${game.combat.id}:${game.combat.round}:${game.combat.turn}`:null;
 if(!manual&&turnKey&&actor.getFlag('berserkr-rpg','processedTurn')===turnKey)return;
 if(turnKey&&!manual)await actor.setFlag('berserkr-rpg','processedTurn',turnKey);
 if(has(actor,'poisoned')){const r=await roll(`1d20 + ${actor.type==='creature'?0:actor.system.attributes.fortitude}`);await r.toMessage({speaker:ChatMessage.getSpeaker({actor}),flavor:'Veneno — Fortitude CD12'});await actor.update({'system.poisonBad':r.total<12});if(r.total<12)await receiveDamage(actor,{damage:(await roll('1d4')).total,ignoreArmor:true});}
 for(const effect of Array.from(actor.effects)){if(effect.disabled)continue;const f=effect.flags?.['berserkr-rpg'];if(!f)continue;if(!manual&&f.createdRound===game.combat?.round&&f.createdCombat===game.combat?.id)continue;
  if(f.dot)await receiveDamage(actor,{damage:(await roll(f.dot)).total,ignoreArmor:true});if(f.healing)await heal(actor,(await roll(f.healing)).total);if(f.removeConditions)await clearConditions(actor);
  if(f.remaining>0){const left=f.remaining-1;if(left===0){if(effect.name==='Recuperar de inconsciência'){await actor.update({'system.hp.value':Math.max(1,Number(actor.getFlag('berserkr-rpg','wakeHP')??1))});await actor.toggleStatusEffect('unconscious',{active:false});await actor.unsetFlag('berserkr-rpg','wakeHP');}if(f.onExpire==='fatigued')await actor.toggleStatusEffect('fatigued',{active:true});if(f.onExpire==='chamaViva')await receiveDamage(actor,{damage:(await roll('1d4')).total,ignoreArmor:true});await effect.delete();}else await effect.update({'flags.berserkr-rpg.remaining':left});}
 }
}
export function registerAutomationHooks(){
 Hooks.on('updateCombat',async(combat,change)=>{if(!game.user.isGM||!['round','turn'].some(k=>Object.hasOwn(change,k)))return;const activeGM=game.users.activeGM;if(activeGM&&activeGM.id!==game.user.id)return;const actor=combat.combatant?.actor;if(actor)await exclusive(actor.uuid,()=>processTurn(actor));});
 Hooks.on('renderChatMessageHTML',(doc,element)=>{
  const f=doc.flags?.['berserkr-rpg'];if(!f)return;
  element.querySelectorAll('[data-berserkr-action]').forEach(button=>{if(f.resolved||f.obsolete||(button.dataset.berserkrAction==='applyDamage'&&f.appliedDamage)||(button.dataset.berserkrAction==='breakWeapon'&&f.brokenWeapon)||(button.dataset.berserkrAction==='reroll'&&(f.appliedDamage||f.brokenWeapon)))button.disabled=true;button.addEventListener('click',async()=>{
   button.disabled=true;try{await exclusive(doc.uuid,async()=>{
    const latest=doc.flags?.['berserkr-rpg'];if(latest.resolved||latest.obsolete)return;
    const action=button.dataset.berserkrAction;if(doc.isOwner===false&&!game.user.isGM)throw new Error('O autor da carta ou mestre deve aplicar este resultado.');const actor=await fromUuid(f.actorUuid);
    if(action==='reroll'){
     if(latest.appliedDamage||latest.brokenWeapon)throw new Error('O resultado já foi aplicado.');
     if(!owns(actor))throw new Error('Sem permissão para gastar Destinos.');const free=actor.effects.find(e=>!e.disabled&&e.getFlag('berserkr-rpg','bonuses')?.freeReroll);if(free&&!f.result?.success)await free.delete();else await spend(actor);
     const config={...f.testConfig,destiny:'none',maxDamage:false};const result=await performTest(actor,config);
     await doc.setFlag('berserkr-rpg','obsolete',true);
     if(config.kind==='attack')await attackResult(actor,config.itemUuid?await fromUuid(config.itemUuid):null,result,config);else if(['defense','parry'].includes(config.kind))await defenseResult(actor,result,config);else await testCard(actor,result,config);
    }else if(action==='applyDamage'){
     const target=await fromUuid(f.payload.targetUuid);if(!target)throw new Error('Alvo não encontrado.');
     if(latest.appliedDamage)return;if(await damageDialog(target,{...f.payload,sourceUuid:f.actorUuid})){await doc.setFlag('berserkr-rpg','appliedDamage',true);if(!doc.content.includes('data-berserkr-action="breakWeapon"')||latest.brokenWeapon)await doc.setFlag('berserkr-rpg','resolved',true);}
    }else if(action==='applyEffect'){
     const target=await fromUuid(f.payload.targetUuid);if(!owns(target))throw new Error('O proprietário ou mestre precisa aplicar o efeito.');const data=f.payload.effect??{};if(data.instantHealing)await heal(target,data.instantHealing);if(data.removeConditions)await clearConditions(target);if(data.rounds||data.statuses?.length||data.bonuses||data.dot||data.healing)await timedEffect(target,f.payload.effectName,data);await doc.setFlag('berserkr-rpg','resolved',true);
    }else if(action==='breakWeapon'){
     const item=await fromUuid(f.payload.itemUuid);if(!item?.isOwner)throw new Error('Sem permissão para alterar a arma.');if(latest.brokenWeapon)return;await item.update({'system.broken':true});await doc.setFlag('berserkr-rpg','brokenWeapon',true);if(!doc.content.includes('data-berserkr-action="applyDamage"')||latest.appliedDamage)await doc.setFlag('berserkr-rpg','resolved',true);
    }
   });}catch(error){ui.notifications.error(error.message);}finally{button.disabled=!!doc.flags?.['berserkr-rpg']?.resolved||!!doc.flags?.['berserkr-rpg']?.obsolete;}
  });});
 });
}
