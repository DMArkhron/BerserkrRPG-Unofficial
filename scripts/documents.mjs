import {attributeTest} from "./automation.mjs";
import {ATTRIBUTES} from "./rules.mjs";
export {ATTRIBUTES};
export const ITEM_TYPES = {weapon:"Arma",armor:"Armadura",rune:"Runa",ability:"Habilidade",equipment:"Equipamento",class:"Classe"};
export class BerserkrActor extends Actor {
  get carryingCapacity() { return Math.max(0, this.system.attributes.forca + 8); }
  get load() { return this.items.reduce((n,i)=>n+i.system.quantity*i.system.slots,0); }
  async rollAttribute(key) {
    if (!Object.hasOwn(ATTRIBUTES,key)) return;
    return attributeTest(this,key);
  }
}
export class BerserkrItem extends Item {
  async rollDamage() {
    if (!Roll.validate(this.system.damage)) return ui.notifications.warn("Fórmula de dano inválida.");
    return new Roll(this.system.damage).toMessage({speaker:ChatMessage.getSpeaker({actor:this.actor}),flavor:`Dano — ${foundry.utils.escapeHTML(this.name)}`});
  }
}
