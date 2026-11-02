import {ask,select,check,escape,message,applyButton,testSummary} from './ui.mjs';
import {exclusive,performTest,spend,timedEffect,heal,clearConditions,receiveDamage,equippedArmor} from './automation.mjs';
const dice=async formula=>(await new Roll(formula).evaluate()).total;
const targets=()=>Array.from(game.user.targets??[]).map(t=>t.actor).filter(Boolean);
function baseRune(item){return item.system.runeKey||item.name.replace(/^Inscrição: /,'').split(' — ')[0];}
async function pending(actor,sourceActor,title,payload){return message(sourceActor,title,`<p>${escape(actor.name)}</p>${applyButton(payload.kind==='effect'?'applyEffect':'applyDamage',payload.kind==='effect'?'Aplicar efeito à ficha':'Aplicar dano à ficha')}`,{actorUuid:sourceActor.uuid,payload:{...payload,targetUuid:actor.uuid},resolved:false});}
async function giveEffect(target,actor,name,data){if(target.isOwner)return timedEffect(target,name,data);return pending(target,actor,name,{kind:'effect',effect:data,effectName:name});}
async function damageTargets(actor,list,formula,title,{dot=false,rounds=0,prone=false,blinded=false}={}){
 const damage=dot?0:await dice(formula);for(const target of list){if(dot)await giveEffect(target,actor,title,{rounds,dot:formula,description:'Dano periódico: '+formula});else await pending(target,actor,title,{kind:'powerDamage',damage,sourceUuid:actor.uuid});if(prone)await giveEffect(target,actor,'Prostrado',{statuses:['prone'],description:'Prostrado'});if(blinded)await giveEffect(target,actor,'Cegueira rúnica',{rounds,statuses:['blinded'],description:'Cego'});}
 if(!list.length)await message(actor,title,`<p>${dot?formula+' por rodada':damage+' de dano'}; selecione os alvos apropriados para aplicar. Nenhuma ficha foi alterada.</p>`);
}
export async function inscribe(actor,item){return exclusive(actor.uuid,async()=>{
 if(!actor.isOwner||item.type!=='rune'||item.system.runeMode==='spell'||item.system.runeMode==='inscribed')throw new Error('Esta Runa não pode ser inscrita.');
 const candidates=actor.items.filter(i=>['weapon','armor'].includes(i.type)&&!i.system.broken&&i.system.quantity>0);
 const input=await ask('Inscrever '+item.name,select('Arma ou armadura','itemId',Object.fromEntries(candidates.map(i=>[i.id,i.name])))+check('Há comida e água para o descanso','supplied',false),'Inscrever');if(!input)return;
 if(!input.supplied)throw new Error('A inscrição exige comida e água durante o descanso.');const target=actor.items.get(input.itemId);if(!target)throw new Error('Escolha um equipamento.');
 const inscriptions=actor.items.filter(i=>i.type==='rune'&&i.system.boundItemId===target.id);
 const reforja=actor.items.some(i=>i.name.startsWith('Reforja Rúnica'));
 if(inscriptions.length>=(reforja?2:1))throw new Error('Limite de inscrições no equipamento atingido.');
 if(inscriptions.length===1){if(!await foundry.applications.api.DialogV2.confirm({classes:["berserkr-dialog"],window:{title:'Reforja Rúnica'},content:'<p>A segunda inscrição exige um descanso longo. Concluir a reforja agora?</p>',rejectClose:false}))return;}
 // Converte a própria pedra em inscrição: ela deixa de servir como feitiço e não pode ser inscrita novamente.
 await item.update({'name':'Inscrição: '+item.name+' — '+target.name,'system.runeKey':baseRune(item),'system.runeMode':'inscribed','system.boundItemId':target.id,'system.slots':0});
 await message(actor,'Runa inscrita',`<p>${escape(item.name)}. O descanso não recupera PV; a pedra foi consumida na inscrição.</p>`);
 });}
export async function useRune(actor,item){return exclusive(actor.uuid,async()=>{
 if(!actor.isOwner||actor.statuses.has('dead')||actor.statuses.has('stunned'))throw new Error('Não pode ativar esta Runa.');if(actor.system.runes.value<1)throw new Error('Sem usos rúnicos disponíveis.');
 if(item.system.runeMode==='inscription')throw new Error('Esta Runa só pode ser inscrita. Use Inscrever.');
 const mode=item.system.runeMode==='inscribed'?'inscription':'spell';
 if(mode==='inscription'){const bound=actor.items.get(item.system.boundItemId);if(!bound||bound.system.broken||bound.system.quantity<1||(bound.type==='armor'&&bound.system.category===1))throw new Error('O equipamento inscrito não está disponível.');}
 const list=targets();const choices=Object.fromEntries([[actor.uuid,'Você'],...list.map(a=>[a.uuid,a.name])]);
 const input=await ask(mode==='spell'?'Conjurar '+item.name:'Ativar '+item.name,select('Beneficiário principal','targetUuid',choices,actor.uuid)+check('Aplicar efeitos de área aos tokens selecionados','area',false)+select('Rolagem','advantage',{'0':'Normal','1':'Vantagem','-1':'Desvantagem'},'0'));
 if(!input)return;
 const target=await fromUuid(input.targetUuid);if(!target)throw new Error('Alvo inválido.');if(mode==='spell'&&baseRune(item)==='Gebo'&&target.uuid===actor.uuid)throw new Error('Gebo precisa de um aliado.');const area=input.area?list:[target];
 const result=await performTest(actor,{attribute:'esperteza',kind:'rune',dc:12,advantage:Number(input.advantage),bonus:actor.items.some(i=>i.name.startsWith('Especialista em Runas'))?2:0});
 await actor.update({'system.runes.value':actor.system.runes.value-1});
 if(!result.success){await receiveDamage(actor,{damage:1,ignoreArmor:true});await message(actor,'Runa — '+baseRune(item),`${testSummary(result,'Esperteza')}<p>Consumiu 1 uso e perdeu 1PV.${result.disaster?' O mestre deve resolver o efeito fora de controle e invocar Benesse e Ira.':''}</p>`);return;}
 const key=baseRune(item);const description=mode==='spell'?item.system.spell:item.system.inscription;
 await message(actor,'Runa — '+key,`${testSummary(result,'Esperteza')}<p>${escape(key)} · ${mode==='spell'?'Feitiço':'Inscrição'}</p><p>${escape(description)}</p>`);
 if(mode==='spell')await runeSpell(actor,key,target,area);else await runeInscription(actor,key,target,area);
 });}
async function runeSpell(actor,key,target,area){switch(key){
 case 'Uruz':return giveEffect(target,actor,'Força de Uruz',{rounds:await dice('1d6'),bonuses:{forca:2}});
 case 'Wunjo':if(target.isOwner){await heal(target,await dice('1d4'));await clearConditions(target);}else await pending(target,actor,'Conforto de Wunjo',{kind:'effect',effectName:'Cura de Wunjo',effect:{instantHealing:await dice('1d4'),removeConditions:true}});return;
 case 'Berkano':if(target.isOwner)await heal(target,await dice('1d6'));else await pending(target,actor,'Renovação de Berkano',{kind:'effect',effectName:'Cura',effect:{instantHealing:await dice('1d6')}});return;
 case 'Gebo':{if(target.uuid===actor.uuid)throw new Error('Gebo precisa de um aliado. O uso já foi gasto; escolha o alvo correto antes de conjurar.');const amount=await dice('1d6');await receiveDamage(actor,{damage:amount,ignoreArmor:true});if(target.isOwner)await heal(target,amount);else await pending(target,actor,'Equilíbrio de Gebo',{kind:'effect',effectName:'Cura',effect:{instantHealing:amount}});return;}
 case 'Thurisaz':return damageTargets(actor,area,'1d8','Fúria de Thurisaz');
 case 'Hagalaz':return damageTargets(actor,area,'1d6','Tempestade de granizo',{dot:true,rounds:await dice('1d4')});
 case 'Isa':return giveEffect(target,actor,'Paralisação de Isa',{rounds:await dice('1d2'),statuses:['stunned']});
 case 'Eihwaz':return giveEffect(target,actor,'Resiliência de Eihwaz',{rounds:await dice('1d4'),bonuses:{armor:2}});
 case 'Algiz':return giveEffect(target,actor,'Proteção de Algiz',{rounds:await dice('1d4'),bonuses:{halveDamage:1}});
 case 'Laguz':return damageTargets(actor,area,'1d8','Cura de Laguz — onda de água',{prone:true});
 case 'Nauthiz':return giveEffect(actor,actor,'Urgência de Nauthiz',{bonuses:{general:2},consumeOn:'test'});
 case 'Pertho':return giveEffect(actor,actor,'Destino de Pertho',{bonuses:{freeReroll:1},description:'Rerrole um Teste fracassado na próxima hora.'});
 case 'Tiwaz':await receiveDamage(actor,{damage:await dice('1d4'),ignoreArmor:true});return giveEffect(actor,actor,'Triunfo de Tiwaz',{bonuses:{autoHit:1},consumeOn:'attack'});
 case 'Sowilo':return damageTargets(actor,area,'1d10','Esplendor de Sowilo');
 default:return message(actor,'Efeito narrativo ou situacional',`<p>${escape(key)} foi ativada. Seu efeito depende da cena; o mestre resolve o texto apresentado.</p>`);
}}
async function runeInscription(actor,key,target,area){switch(key){
 case 'Thurisaz':return giveEffect(actor,actor,'Arma gigantesca',{rounds:await dice('1d4'),bonuses:{doubleDamage:1},onExpire:'fatigued'});
 case 'Isa':return giveEffect(actor,actor,'Congelamento de Isa',{rounds:await dice('1d4'),extraDamage:'1d4'});
 case 'Gebo':await receiveDamage(actor,{damage:await dice('1d6'),ignoreArmor:true});return giveEffect(actor,actor,'Oferta de Gebo',{bonuses:{maximizeDamage:1},consumeOn:'hit'});
 case 'Uruz':return damageTargets(actor,area,'1d4','Onda de Choque de Uruz',{prone:true});
 case 'Wunjo':for(const t of area){if(t.isOwner)await heal(t,await dice('1d4'));else await pending(t,actor,'Canção de Wunjo',{kind:'effect',effectName:'Cura',effect:{instantHealing:await dice('1d4')}});await giveEffect(t,actor,'Canção de Wunjo',{bonuses:{general:1},consumeOn:'test'});}return;
 case 'Kenaz':return giveEffect(target,actor,'Marca de Kenaz',{statuses:['blinded'],bonuses:{marked:1},description:'Brilha através de ocultação; ataques contra este alvo têm vantagem.'});
 case 'Eihwaz':return giveEffect(actor,actor,'Força Irremovível de Eihwaz',{rounds:await dice('1d4'),bonuses:{halveDamage:1},description:'Não pode mover-se, mas ainda pode agir.'});
 case 'Laguz':return giveEffect(actor,actor,'Águas Tranquilas de Laguz',{rounds:await dice('1d4'),healing:'1d4',removeConditions:true});
 case 'Algiz':return giveEffect(actor,actor,'Guardião de Algiz',{rounds:await dice('1d4'),bonuses:{blockNextHit:1}});
 case 'Tiwaz':return giveEffect(actor,actor,'Acerto de Contas de Tiwaz',{bonuses:{autoHit:1,nextDoubleIncoming:1},consumeOn:'attackOnly'});
 case 'Dagaz':return giveEffect(actor,actor,'Aurora de Dagaz',{rounds:1,extraDamage:'2d6'});
 case 'Sowilo':return damageTargets(actor,area,'1d6','Chama Purificadora de Sowilo',{blinded:true,rounds:await dice('1d4')});
 case 'Ingwaz':return giveEffect(actor,actor,'Benção de Ingwaz',{bonuses:{nonCombat:4},consumeOn:'nonCombat'});
 case 'Othala':return giveEffect(actor,actor,'Herança de Othala',{bonuses:{defenseAdvantage:1},consumeOn:'defense'});
 default:return message(actor,'Inscrição situacional',`<p>${escape(key)} foi ativada. O mestre resolve o efeito indicado no texto.</p>`);
}}
function usageScope(actor,item){const text=item.system.description.toLowerCase();if(/uma vez (na|por) vida/.test(text))return 'life';if(/uma vez por sessão/.test(text))return 'session';if(/uma vez por (combate|batalha|encontro)/.test(text))return 'combat';if(/uma vez por dia/.test(text))return 'day';return null;}
function usageKey(actor,scope){return scope==='life'?'life':scope==='combat'?(game.combat?.id??'manual-'+actor.system.combatCounter):scope==='day'?'day-'+actor.system.restCounter:'session-'+actor.system.sessionCounter;}
export async function useAbility(actor,item){return exclusive(actor.uuid,async()=>{
 if(!actor.isOwner||actor.statuses.has('dead')||actor.statuses.has('stunned'))throw new Error('Não pode usar esta habilidade.');const scope=usageScope(actor,item),key=scope?usageKey(actor,scope):null;
 if(key&&item.getFlag('berserkr-rpg','lastUse')===key)throw new Error('Habilidade já usada neste período.');
 const target=targets()[0]??actor,name=item.name.split(' — ')[0];
 if(!await foundry.applications.api.DialogV2.confirm({classes:["berserkr-dialog"],window:{title:'Usar '+name},content:`<p>${escape(item.system.description)}</p><p>Beneficiário: ${escape(target.name)}. ${scope?'Frequência: '+scope+'.':''}</p>`,rejectClose:false}))return;
 const known={
  'Escudo da Natureza':async()=>giveEffect(actor,actor,name,{rounds:await dice('1d6'),bonuses:{armor:2}}),
  'Égide Gélida':async()=>giveEffect(actor,actor,name,{rounds:await dice('1d4'),bonuses:{halveDamage:1},description:'Atacantes corpo a corpo recebem 1 de dano gélido de retaliação, resolvido pelo mestre.'}),
  'Águas Restauradoras':async()=>applyHealing(target,actor,name,'1d6+2',true),
  'Cura Luminosa':async()=>applyHealing(target,actor,name,'1d6+2',true),
  'Véu de Luz':async()=>{await applyHealing(target,actor,name,'1d4');return giveEffect(target,actor,name,{rounds:await dice('1d6'),bonuses:{defense:2}});},
  'Forma Radiante':async()=>giveEffect(actor,actor,name,{rounds:await dice('1d3'),bonuses:{defense:4},description:'Pode atravessar sólidos. Dano ao atravessar um inimigo é resolvido pelo mestre.'}),
  'O Chamado do Valhalla':async()=>{const rounds=await dice('1d6');for(const t of targets())await giveEffect(t,actor,name,{rounds,bonuses:{attack:2}});},
  'Chama Viva':async()=>giveEffect(actor,actor,name,{rounds:await dice('1d4'),bonuses:{doubleDamage:1},onExpire:'chamaViva'}),
  'Juramento aos Ancestrais':async()=>giveEffect(actor,actor,name,{bonuses:{freeReroll:1},description:'Rerrole ataque ou defesa fracassado.'}),
  'A Benção dos Vanir':async()=>giveEffect(actor,actor,name,{bonuses:{freeReroll:1},description:'Rerrole um Teste fracassado.'}),
  'Feixe Solar':async()=>{const test=await performTest(actor,{attribute:'astucia',kind:'test',dc:12});const damage=test.success?await dice('1d8'):0;await message(actor,'Habilidade — '+name,`${testSummary(test,'Astúcia')}<p>Alvo: ${escape(target.name)}</p>${test.success?'<p>Dano: <b>'+damage+'</b> · ignora armadura</p>'+applyButton('applyDamage','Aplicar dano à ficha'):'<p>O feixe não atingiu o alvo.</p>'}`,{actorUuid:actor.uuid,payload:{kind:'powerDamage',targetUuid:target.uuid,damage,ignoreArmor:true},resolved:false},[test.roll]);},
  'Tempestade dos Aesir':async()=>damageTargets(actor,targets(),'1d6',name),
  'A Fúria do Inverno':async()=>damageTargets(actor,targets(),'1d8',name)
 };
 if(known[name]){await known[name]();if(name!=='Feixe Solar')await message(actor,'Habilidade — '+name,`<p>Beneficiário: ${escape(target.name)}</p><p>${escape(item.system.description)}</p>`);}else await message(actor,'Habilidade — '+name,`<p>${escape(item.system.description)}</p><p>Resolução narrativa ou específica pelo mestre.</p>`);
 if(key)await item.setFlag('berserkr-rpg','lastUse',key);
 });}
async function applyHealing(target,actor,name,formula,remove=false){const amount=await dice(formula);if(target.isOwner){await heal(target,amount);if(remove)await clearConditions(target);}else await pending(target,actor,name,{kind:'effect',effectName:name,effect:{instantHealing:amount,removeConditions:remove}});}
