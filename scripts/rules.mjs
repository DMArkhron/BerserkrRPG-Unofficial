export const ATTRIBUTES={fortitude:'Fortitude',forca:'Força',astucia:'Astúcia',agilidade:'Agilidade',esperteza:'Esperteza'};
export const CONDITIONS={poisoned:'Envenenado',feverish:'Febril',blinded:'Cego',fatigued:'Fatigado',stunned:'Atordoado',prone:'Prostrado'};
export function attributeModifier(total){
 if(total<=4)return -3;if(total<=6)return -2;if(total<=8)return -1;if(total<=12)return 0;if(total<=14)return 1;if(total<=16)return 2;if(total<=20)return 3;return 4;
}
export function armorProfile(category){return {reduction:['0','0','1d2','1d4','1d6'][category]??'0',agilityPenalty:category===3?2:category===4?4:0,defensePenalty:category>=3?2:0};}
export function resolveTest(natural,total,dc,{cancelCritical=false}={}){
 const critical=!cancelCritical&&natural===20,disaster=!cancelCritical&&natural===1;
 return {critical,disaster,success:critical||(!disaster&&total>=dc)};
}
export function netAdvantage(...sources){const flat=sources.flat();return flat.includes(1)===flat.includes(-1)?0:flat.includes(1)?1:-1;}
export function testFormula(advantage){return advantage>0?'2d20kh':advantage<0?'2d20kl':'1d20';}
export function keptNatural(roll){const die=roll.dice.find(d=>d.faces===20);return die?.results.find(r=>r.active!==false&&!r.discarded)?.result??null;}
export function mitigatedDamage(raw,armor,extra=0){return Math.max(0,Math.trunc(raw)-Math.max(0,Math.trunc(armor))-Math.max(0,Math.trunc(extra)));}
export function changedHP(current,max,delta){return delta>0?Math.min(max,current+delta):current+delta;}
export function resourceLimit(value){return Math.max(0,Math.trunc(value));}
export function conditionModifiers(statuses,attribute,kind){
 const s=new Set(statuses),disadv=[];
 if(s.has('fatigued')&&['forca','agilidade'].includes(attribute))disadv.push(-1);
 if(s.has('feverish')&&attribute==='esperteza')disadv.push(-1);
 if(s.has('blinded')&&['attack','vision'].includes(kind))disadv.push(-1);
 if(s.has('prone')&&['attack','defense'].includes(kind))disadv.push(-1);
 if(s.has('stunned')&&kind==='defense')disadv.push(-1);
 return disadv;
}
export const STARTING={
 'Berserkr':{items:['Machado de Guerra Pesado'],coins:'2d6*10'},
 'Valquíria':{items:['Armadura Divina','Lança da Valquíria','Espada da Valquíria'],coins:'3d6*10',armor:true},
 'Guardião Vanir':{items:['Túnica de Folhas e Cipós','Cajado Druídico','Ervas Medicinais do Guardião'],coins:'1d6*10'},
 'Gigante de Gelo':{items:['Casaco de Pele Grossa','Clava Gigante'],coins:'1d6*10'},
 'Elfo da Luz':{items:['Vestes Brancas Esvoaçantes','Cajado de Madeira-da-Luz','Granadas de Luz'],coins:'2d6*10'},
 'Mestre Ferreiro':{items:['Ferramentas de Ferreiro','Cota de Malha Resistente','Martelo de Ferreiro'],coins:'4d6*10',armor:true,runes:3,runeMode:'inscription'},
 'Espectro':{items:['Vestes Fantasmagóricas','Adaga Espectral'],coins:'1d6*10'},
 'Construto de Chamas':{items:['Corrente Calcinante','Núcleo de Brasa'],coins:'1d6*10'},
 'Pastor de Almas':{items:['Manto das Almas Esquecidas','Cajado da Morte'],coins:'1d6*10'},
 'Arrasa-Reinos':{items:[],coins:'3d6*10',runes:3,runeMode:'spell'}
};
export function validStage(draft,stage){
 if(!draft.classId||!draft.skillId)return false;
 if(stage>=1&&!Object.keys(ATTRIBUTES).every(k=>Number.isInteger(draft.rolls?.[k]?.total)&&Number.isInteger(draft.rolls?.[k]?.value)))return false;
 if(stage>=2&&!(draft.resources?.hp>0&&draft.resources?.destinos>0&&draft.resources?.food>0&&draft.resources?.water>0&&draft.resources?.coins>=0))return false;
 if(stage>=3&&(!draft.equipment?.weapon||!draft.equipment?.first||!draft.equipment?.second||!draft.equipment?.transport||!draft.equipment?.armor||draft.equipment?.runes?.some(x=>!x)))return false;
 return true;
}
