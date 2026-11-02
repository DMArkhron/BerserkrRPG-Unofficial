const f = foundry.data.fields;
const number = (initial=0, min=null) => new f.NumberField({required:true, nullable:false, initial, integer:true, ...(min === null ? {} : {min})});
const text = () => new f.StringField({required:true, nullable:false, initial:""});
const resource = () => new f.SchemaField({value:number(0), max:number(0,0)});
export class BerserkrActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      attributes: new f.SchemaField(Object.fromEntries(["fortitude","forca","astucia","agilidade","esperteza"].map(k=>[k,number()]))),
      hp:resource(), destinos:resource(), runes:resource(),
      biography:text(), saga:text(), className:text(), realm:text(),
      hpFormula:text(), destinyFormula:text(), restCounter:number(0,0), sessionCounter:number(0,0), combatCounter:number(0,0), parryUsed:new f.BooleanField({initial:false}), parryCombat:text(), poisonBad:new f.BooleanField({initial:false}), defenseDC:number(12,0), bugigangas:number(0,0), source:text(), defenseBonus:number(0,0)
    };
  }
}
export class BerserkrItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {description:text(), quantity:number(1,0), slots:number(1,0), price:number(0,0),
      broken:new f.BooleanField({initial:false}), uses:number(0,0), healing:text(), consumable:new f.StringField({initial:"",blank:true,choices:["","food","water"]}), runeMode:new f.StringField({initial:"both",choices:["both","spell","inscription","inscribed"]}), runeKey:text(), boundItemId:text(), equipped:new f.BooleanField({initial:false}), damage:new f.StringField({initial:"1d6",nullable:false}),
      attribute:new f.StringField({initial:"forca",choices:["fortitude","forca","astucia","agilidade","esperteza"]}),
      category:number(0,0), reduction:new f.StringField({initial:"1d2",nullable:false}), agilityPenalty:number(0,0), source:text(), realm:text(), spell:text(), inscription:text(),
      classModifiers:new f.SchemaField(Object.fromEntries(["fortitude","forca","astucia","agilidade","esperteza"].map(k=>[k,number()]))),
      hpFormula:text(), destinyFormula:text(), startingEquipment:text(), featureRefs:new f.ArrayField(new f.StringField({required:true,nullable:false}),{initial:[]})};
  }
}
