export const SHEET_TABS = [
  {id:'combat',label:'Combate',icon:'weapon'},
  {id:'equipment',label:'Equipamentos',icon:'equipment'},
  {id:'abilities',label:'Habilidades',icon:'ability'},
  {id:'runes',label:'Runas',icon:'rune'},
  {id:'notes',label:'Saga e notas',icon:'notes'}
];
export const normalizeTab = id => SHEET_TABS.some(t=>t.id===id) ? id : 'combat';

/** Pure navigation: never submits, disables fields, or mutates actor data. */
export function selectSheetTab(root,id,{focus=false}={}) {
  id=normalizeTab(id);
  for(const button of root.querySelectorAll('[data-sheet-tab]')) {
    const selected=button.dataset.sheetTab===id;
    button.setAttribute('aria-selected',String(selected));
    button.tabIndex=selected?0:-1;
    button.classList.toggle('selected',selected);
    if(selected&&focus)button.focus();
  }
  for(const panel of root.querySelectorAll('[data-sheet-panel]')) {
    const selected=panel.dataset.sheetPanel===id;
    panel.hidden=!selected;
    panel.classList.toggle('selected',selected);
  }
  return id;
}

export function bindSheetTabs(root,{active='combat',onChange=()=>{}}={}) {
  const buttons=Array.from(root.querySelectorAll('[data-sheet-tab]'));
  const choose=(id,focus=false)=>onChange(selectSheetTab(root,id,{focus}));
  selectSheetTab(root,active);
  for(const button of buttons) {
    // Reading another section remains available on observer/read-only sheets.
    button.disabled=false;
    // Re-rendering may reuse a part; prevent duplicate listeners.
    if(button.dataset.berserkrTabsBound)continue;
    button.dataset.berserkrTabsBound='true';
    button.addEventListener('click',()=>choose(button.dataset.sheetTab));
    button.addEventListener('keydown',event=>{
      const index=buttons.indexOf(button);
      const next=event.key==='ArrowRight'?(index+1)%buttons.length:
        event.key==='ArrowLeft'?(index+buttons.length-1)%buttons.length:
        event.key==='Home'?0:event.key==='End'?buttons.length-1:null;
      if(next===null)return;
      event.preventDefault();
      choose(buttons[next].dataset.sheetTab,true);
    });
  }
}
