export const escape=s=>foundry.utils.escapeHTML(String(s??''));
export const field=(label,name,value=0,type='number')=>`<div class="form-group"><label>${escape(label)}</label><input type="${type}" name="${name}" value="${escape(value)}" ${type==='number'?'step="1"':''}></div>`;
export const select=(label,name,choices,value='')=>`<div class="form-group"><label>${escape(label)}</label><select name="${name}">${Object.entries(choices).map(([k,v])=>`<option value="${escape(k)}" ${String(value)===k?'selected':''}>${escape(v)}</option>`).join('')}</select></div>`;
export const check=(label,name,checked=false)=>`<label><input type="checkbox" name="${name}" ${checked?'checked':''}> ${escape(label)}</label>`;
export async function ask(title,content,label='Rolar'){
 return foundry.applications.api.DialogV2.prompt({classes:["berserkr-dialog"],window:{title},content,rejectClose:false,ok:{label,callback:(_event,button)=>Object.fromEntries(Array.from(button.form.elements).filter(e=>e.name).map(e=>[e.name,e.type==='checkbox'?e.checked:e.type==='number'?Number(e.value):e.value]))}});
}
export async function message(actor,title,body,flags={},rolls=[]){
 return ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<section class="berserkr-chat"><h3>${escape(title)}</h3>${body}</section>`,flags:{'berserkr-rpg':flags},rolls});
}
export function applyButton(action,label){return `<button type="button" data-berserkr-action="${action}">${escape(label)}</button>`;}

export function testSummary(result,attribute){const outcome=result.disaster?"Desastre":result.critical?"Crítico":result.success?"Sucesso":"Falha";return `<div class="bk-test"><span>${escape(attribute)} · CD ${result.dc}</span><strong>${result.total}</strong><b>${outcome}</b></div><details class="bk-dice-detail"><summary>Detalhes dos dados</summary><p>${escape(result.roll.formula)} · d20 natural ${result.natural}</p></details>`;}
