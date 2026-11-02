const base='systems/berserkr-rpg/assets/themes/';
export const CLASS_THEMES=[
 ['Berserkr','berserkr','Ferro e fúria','#082b37','#143f4e','#ea3f61','#eee8d3','Machados e marcas de guerra'],
 ['Valquíria','valquiria','Asas do Valhalla','#14223c','#263956','#dab45f','#f3ead2','Asas, lança e ouro antigo'],
 ['Guardião Vanir','vanir','Raízes ancestrais','#102e28','#21483b','#89bd69','#e5ebd3','Folhas, raízes e madeira'],
 ['Gigante de Gelo','gelo','Coração da geleira','#102d43','#214b66','#82d8e7','#e3f3ef','Cristais, montanhas e gelo'],
 ['Elfo da Luz','luz','Aurora de Alfheim','#17334b','#294d67','#ecdc94','#fbf2d5','Estrelas e raios de luz'],
 ['Mestre Ferreiro','ferreiro','Fogo da forja','#32251f','#513b2d','#e5ae62','#eee3cb','Martelo, bigorna e metal'],
 ['Espectro','espectro','Entre dois mundos','#282139','#413350','#b4a3e6','#e9e2f4','Névoa e véus espectrais'],
 ['Construto de Chamas','chamas','Núcleo incandescente','#351f25','#542c2d','#f38e50','#f3e4d0','Chamas, brasa e fissuras'],
 ['Pastor de Almas','almas','Vozes esquecidas','#202437','#343e54','#9eb4df','#e3e8f0','Lanterna, ecos e almas'],
 ['Arrasa-Reinos','reinos','Ruína dos reinos','#24272a','#3d4243','#c6bd7f','#ede9d5','Coroa partida e ruínas']
].map(([name,id,title,bg,panel,accent,ink,motif])=>({name,id,title,bg,panel,accent,ink,motif,generatorPortrait:'--art-x:0%;--art-y:0%',generatorArt:'systems/berserkr-rpg/assets/generator/'+id+'-portrait.png',banner:base+id+'-banner.png',emblem:'systems/berserkr-rpg/assets/icons-ink/class-'+id+'.png',style:`--theme-bg:${bg};--theme-panel:${panel};--theme-accent:${accent};--theme-ink:${ink}`}));
export function themeForClass(name){
 return CLASS_THEMES.find(t=>t.name.toLocaleLowerCase('pt-BR')===String(name??'').trim().toLocaleLowerCase('pt-BR'))??CLASS_THEMES[0];
}

export const NEUTRAL_THEME={id:'unbound',name:'Sem classe',title:'Saga dos Nove Reinos',bg:'#20272c',panel:'#343e45',accent:'#c2b494',ink:'#eee8d3',generatorArt:'systems/berserkr-rpg/assets/themes/unbound-banner.png',style:'--theme-bg:#20272c;--theme-panel:#343e45;--theme-accent:#c2b494;--theme-ink:#eee8d3'};
export function themeForActor(actor){
 const name=String(actor?.system?.className??'').trim();
 return CLASS_THEMES.find(t=>t.name.toLocaleLowerCase('pt-BR')===String(name??'').toLocaleLowerCase('pt-BR'))??NEUTRAL_THEME;
}
export function themeForItem(item){
 if(item?.actor)return themeForActor(item.actor);
 const name=item?.type==='class'?item.name:item?.type==='ability'?String(item.name??'').split(' — ').at(-1):'';
 return CLASS_THEMES.find(t=>t.name===name)??NEUTRAL_THEME;
}
export function applySheetTheme(element,theme){
 if(!element?.style)return;
 for(const key of ['bg','panel','accent','ink'])element.style.setProperty('--theme-'+key,theme[key]);
 element.dataset.classTheme=theme.id;
}
