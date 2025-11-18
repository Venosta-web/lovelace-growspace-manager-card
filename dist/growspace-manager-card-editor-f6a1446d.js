import{i as s,x as t,a as e,_ as a,n as o,b as i,r as n,t as r}from"./growspace-manager-card-9482c475.js";let c=class extends s{constructor(){super(...arguments),this._growspaceOptions=[]}setConfig(s){this._config=s,this._loadGrowspaces()}updated(s){s.has("hass")&&this.hass&&(this._loadGrowspaces(),this._subscribeToSensorUpdates())}disconnectedCallback(){super.disconnectedCallback(),this._unsubStateChanged&&(this._unsubStateChanged(),this._unsubStateChanged=void 0)}_subscribeToSensorUpdates(){this.hass&&!this._unsubStateChanged&&(this._unsubStateChanged=this.hass.connection.subscribeEvents(s=>{const t=s.data.new_state;"sensor.growspaces_list"===t?.entity_id&&(Array.isArray(t.attributes?.growspaces)?this._growspaceOptions=t.attributes.growspaces:this._growspaceOptions=[])},"state_changed"))}_loadGrowspaces(){if(!this.hass)return;const s=this.hass.states["sensor.growspaces_list"];if(s&&s.attributes?.growspaces){const t=s.attributes.growspaces;this._growspaceOptions=Object.values(t)}else this._growspaceOptions=[]}render(){return this._config?t`
      <div class="form-group">
        <label>Default Growspace</label>
        <select
          .value=${this._config.default_growspace??""}
          @change=${s=>this._valueChanged("default_growspace",s.target.value)}
        >
          <option value="">Select a growspace</option>
          ${0===this._growspaceOptions.length?t`<option disabled>No growspaces found</option>`:this._growspaceOptions.map(s=>t`<option value="${s}">${s}</option>`)}
        </select>
      </div>
    `:t``}_valueChanged(s,t){if(!this._config)return;const e={...this._config,[s]:t};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e},bubbles:!0,composed:!0}))}};c.styles=e`
    .form-group {
      margin-bottom: 12px;
    }
    label {
      display: block;
      font-weight: bold;
      margin-bottom: 4px;
    }
    select {
      width: 100%;
      padding: 4px;
      box-sizing: border-box;
    }
  `,a([o({attribute:!1}),i("design:type",Object)],c.prototype,"hass",void 0),a([o({attribute:!1}),i("design:type",Object)],c.prototype,"_config",void 0),a([n(),i("design:type",Array)],c.prototype,"_growspaceOptions",void 0),c=a([r("growspace-manager-card-editor")],c);export{c as GrowspaceManagerCardEditor};
//# sourceMappingURL=growspace-manager-card-editor-f6a1446d.js.map
