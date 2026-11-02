const normalize=text=>String(text??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function filterSheetCatalog(root,state={}){
 const panel=root.querySelector('[data-sheet-panel]:not([hidden])');
 const tools=root.querySelector('.sb-library-tools');
 const inventory=['equipment','abilities','runes'].includes(panel?.dataset.sheetPanel);
 if(tools)tools.hidden=!inventory;
 if(!inventory)return;
 const query=normalize(state.query).trim(),kind=state.kind??'all';
 const cards=Array.from(panel.querySelectorAll('[data-catalog-card]'));
 let visible=0;
 for(const card of cards){
  const text=card.dataset.catalogText??(card.querySelector('.sb-item-name')?.textContent+' '+(card.querySelector('.sb-card-description')?.textContent??''));
  const category=panel.dataset.sheetPanel!=='equipment'||kind==='all'||(kind==='equipped'?card.dataset.itemEquipped==='true':card.dataset.itemKind===kind);
  card.hidden=!(category&&normalize(text).includes(query));if(!card.hidden)visible++;
 }
 for(const button of root.querySelectorAll('[data-catalog-filter]'))button.setAttribute('aria-pressed',String(button.dataset.catalogFilter===kind));
 const empty=panel.querySelector('[data-catalog-empty]');if(empty)empty.hidden=visible>0||cards.length===0;
 const counter=root.querySelector('[data-catalog-count]');if(counter)counter.textContent=`${visible} / ${cards.length}`;
}
export function bindSheetCatalog(root,{state={},onChange=()=>{}}={}){
 const input=root.querySelector('[data-catalog-search]');
 if(input){input.disabled=false;input.readOnly=false;input.value=state.query??'';
  input.oninput=()=>{state.query=input.value;filterSheetCatalog(root,state);onChange(state);};
  input.onchange=event=>event.stopPropagation();
 }
 for(const button of root.querySelectorAll('[data-catalog-filter]')){button.disabled=false;button.onclick=()=>{state.kind=button.dataset.catalogFilter;filterSheetCatalog(root,state);onChange(state);};}
 filterSheetCatalog(root,state);
}
