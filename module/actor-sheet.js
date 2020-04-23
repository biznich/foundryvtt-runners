/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class BladesActorSheet extends ActorSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["blades-in-the-dark", "sheet", "actor"],
  	  template: "systems/blades-in-the-dark/templates/actor-sheet.html",
      width: 700,
      height: 970
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();

    // Calculate Load
    let loadout = 0;
    data.items.forEach(i => {loadout += (i.type === "item") ? parseInt(i.data.load) : 0});
    data.data.loadout = loadout;
    console.log("DATA");
    console.log(data);
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // // Activate tabs
    // let tabs = html.find('.tabs');
    // let initial = this._sheetTab;
    // new Tabs(tabs, {
    //   initial: initial,
    //   callback: clicked => this._sheetTab = clicked.data("tab")
    // });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Update Inventory Item
    html.find('.item-body').click(ev => {
      const element = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(element.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const element = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(element.data("itemId"));
      element.slideUp(200, () => this.render(false));
    });
  }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event, formData) {

    // Handle the free-form attributes list
    // const formAttrs = expandObject(formData).data.attributes || {};
    // const attributes = Object.values(formAttrs).reduce((obj, v) => {
    //   let k = v["key"].trim();
    //   if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
    //   delete v["key"];
    //   obj[k] = v;
    //   return obj;
    // }, {});
    
    // // Remove attributes which are no longer used
    // for ( let k of Object.keys(this.object.data.data.attributes) ) {
    //   if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    // }

    // // Re-combine formData
    // formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
    //   obj[e[0]] = e[1];
    //   return obj;
    // }, {_id: this.object._id, "data.attributes": attributes});
    
    // Update the Actor
    return this.object.update(formData);
  }

  /** @override */
  _getFormData(form) {
    const FD = new FormData(form);
    const dtypes = {};
    const editorTargets = Object.keys(this.editors);
    
    // Always include checkboxes
    for ( let el of form.elements ) {
      if ( !el.name ) continue;

      // Handle Radio groups
      if ( form[el.name] instanceof RadioNodeList ) {
        
        const inputs = Array.from(form[el.name]);
        if ( inputs.every(i => i.disabled) ) FD.delete(k);
        
        let values = "";
        let type = "Checkboxes";
        values = inputs.map(i => i.checked ? i.value : false).filter(i => i);
        
        FD.set(el.name, JSON.stringify(values));
        dtypes[el.name] = 'Radio';
      }

      // Remove disabled elements
      else if ( el.disabled ) FD.delete(el.name);

      // Checkboxes
      else if ( el.type == "checkbox" ) {
          FD.set(el.name, el.checked || false);
          dtypes[el.name] = "Boolean";
      }

      // Include dataset dtype
      else if ( el.dataset.dtype ) dtypes[el.name] = el.dataset.dtype;
    }

    // Process editable images
    for ( let img of form.querySelectorAll('img[data-edit]') ) {
      if ( img.getAttribute("disabled") ) continue;
      let basePath = window.location.origin+"/";
      if ( ROUTE_PREFIX ) basePath += ROUTE_PREFIX+"/";
      FD.set(img.dataset.edit, img.src.replace(basePath, ""));
    }

    // Process editable divs (excluding MCE editors)
    for ( let div of form.querySelectorAll('div[data-edit]') ) {
      if ( div.getAttribute("disabled") ) continue;
      else if ( editorTargets.includes(div.dataset.edit) ) continue;
      FD.set(div.dataset.edit, div.innerHTML.trim());
    }

    // Handle MCE editors
    Object.values(this.editors).forEach(ed => {
      if ( ed.mce ) {
        FD.delete(ed.mce.id);
        if ( ed.changed ) FD.set(ed.target, ed.mce.getContent());
      }
    });

    // Record target data types for casting
    FD._dtypes = dtypes;
    return FD;
  }

  /* -------------------------------------------- */

  /** @override */
  async _onDrop (event) {

    event.preventDefault();

    // Get dropped data
    let data;
    let item;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return false;
    }

    // Add only Items.
    if (data.type === "Item") {

      // Import from Compendium
      if (data.pack) {
        const pack = game.packs.find(p => p.collection === data.pack);
        await pack.getEntity(data.id).then(ent => {
          item = ent;
        });
      }
      // Get from Items list.
      else {
        // Class must be distinct.
        item = game.items.get(data.id);
      }

      if (item) {
        this._removeDuplicatedItemType(item.data.type);
      }

      // Call parent on drop logic
      return super._onDrop(event);
    }

  }

  /* -------------------------------------------- */

  /**
   * Removes a duplicate item type from charlist.
   * 
   * @param {string} item_type 
   */
  _removeDuplicatedItemType(item_type) {

    const actor = this.actor;
    let distinct_types = ["class", "heritage", "background", "vice"];

    if (distinct_types.indexOf(item_type) >= 0) {
      actor.items.forEach(i => {
        if (i.data.type === item_type) {
          actor.deleteOwnedItem(i.id);
        }
      });
    }
  }

  /* -------------------------------------------- */
}