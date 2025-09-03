function t(t,e,s,i){var r,o=arguments.length,n=o<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,s):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,s,i);else for(var a=t.length-1;a>=0;a--)(r=t[a])&&(n=(o<3?r(n):o>3?r(e,s,n):r(e,s))||n);return o>3&&n&&Object.defineProperty(e,s,n),n}function e(t,e){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(t,e)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const s=globalThis,i=s.ShadowRoot&&(void 0===s.ShadyCSS||s.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,r=Symbol(),o=new WeakMap;class n{constructor(t,e,s){if(this._$cssResult$=!0,s!==r)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const s=void 0!==e&&1===e.length;s&&(t=o.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&o.set(e,t))}return t}toString(){return this.cssText}}const a=(t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,s,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[i+1],t[0]);return new n(s,t,r)},l=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,r))(e)})(t):t,{is:c,defineProperty:d,getOwnPropertyDescriptor:h,getOwnPropertyNames:p,getOwnPropertySymbols:u,getPrototypeOf:g}=Object,_=globalThis,f=_.trustedTypes,$=f?f.emptyScript:"",v=_.reactiveElementPolyfillSupport,m=(t,e)=>t,y={toAttribute(t,e){switch(e){case Boolean:t=t?$:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let s=t;switch(e){case Boolean:s=null!==t;break;case Number:s=null===t?null:Number(t);break;case Object:case Array:try{s=JSON.parse(t)}catch(t){s=null}}return s}},b=(t,e)=>!c(t,e),w={attribute:!0,type:String,converter:y,reflect:!1,useDefault:!1,hasChanged:b};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),_.litPropertyMetadata??=new WeakMap;class A extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=w){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);void 0!==i&&d(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:r}=h(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const o=i?.call(this);r?.call(this,e),this.requestUpdate(t,o,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??w}static _$Ei(){if(this.hasOwnProperty(m("elementProperties")))return;const t=g(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(m("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m("properties"))){const t=this.properties,e=[...p(t),...u(t)];for(const s of e)this.createProperty(s,t[s])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,s]of e)this.elementProperties.set(t,s)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const s=this._$Eu(t,e);void 0!==s&&this._$Eh.set(s,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const t of s)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const s=e.attribute;return!1===s?void 0:"string"==typeof s?s:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(i)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of e){const e=document.createElement("style"),r=s.litNonce;void 0!==r&&e.setAttribute("nonce",r),e.textContent=i.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(void 0!==i&&!0===s.reflect){const r=(void 0!==s.converter?.toAttribute?s.converter:y).toAttribute(e,s.type);this._$Em=t,null==r?this.removeAttribute(i):this.setAttribute(i,r),this._$Em=null}}_$AK(t,e){const s=this.constructor,i=s._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=s.getPropertyOptions(i),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:y;this._$Em=i;const o=r.fromAttribute(e,t.type);this[i]=o??this._$Ej?.get(i)??o,this._$Em=null}}requestUpdate(t,e,s){if(void 0!==t){const i=this.constructor,r=this[t];if(s??=i.getPropertyOptions(t),!((s.hasChanged??b)(r,e)||s.useDefault&&s.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(i._$Eu(t,s))))return;this.C(t,e,s)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:r},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),!0!==r||void 0!==o)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,s]of t){const{wrapped:t}=s,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,s,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}A.elementStyles=[],A.shadowRootOptions={mode:"open"},A[m("elementProperties")]=new Map,A[m("finalized")]=new Map,v?.({ReactiveElement:A}),(_.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const E=globalThis,x=E.trustedTypes,S=x?x.createPolicy("lit-html",{createHTML:t=>t}):void 0,P="$lit$",C=`lit$${Math.random().toFixed(9).slice(2)}$`,D="?"+C,O=`<${D}>`,U=document,k=()=>U.createComment(""),M=t=>null===t||"object"!=typeof t&&"function"!=typeof t,R=Array.isArray,H="[ \t\n\f\r]",T=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,N=/-->/g,j=/>/g,z=RegExp(`>|${H}(?:([^\\s"'>=/]+)(${H}*=${H}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),L=/'/g,I=/"/g,B=/^(?:script|style|textarea|title)$/i,W=(t=>(e,...s)=>({_$litType$:t,strings:e,values:s}))(1),q=Symbol.for("lit-noChange"),G=Symbol.for("lit-nothing"),V=new WeakMap,F=U.createTreeWalker(U,129);function J(t,e){if(!R(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(e):e}const K=(t,e)=>{const s=t.length-1,i=[];let r,o=2===e?"<svg>":3===e?"<math>":"",n=T;for(let e=0;e<s;e++){const s=t[e];let a,l,c=-1,d=0;for(;d<s.length&&(n.lastIndex=d,l=n.exec(s),null!==l);)d=n.lastIndex,n===T?"!--"===l[1]?n=N:void 0!==l[1]?n=j:void 0!==l[2]?(B.test(l[2])&&(r=RegExp("</"+l[2],"g")),n=z):void 0!==l[3]&&(n=z):n===z?">"===l[0]?(n=r??T,c=-1):void 0===l[1]?c=-2:(c=n.lastIndex-l[2].length,a=l[1],n=void 0===l[3]?z:'"'===l[3]?I:L):n===I||n===L?n=z:n===N||n===j?n=T:(n=z,r=void 0);const h=n===z&&t[e+1].startsWith("/>")?" ":"";o+=n===T?s+O:c>=0?(i.push(a),s.slice(0,c)+P+s.slice(c)+C+h):s+C+(-2===c?e:h)}return[J(t,o+(t[s]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class Z{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let r=0,o=0;const n=t.length-1,a=this.parts,[l,c]=K(t,e);if(this.el=Z.createElement(l,s),F.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=F.nextNode())&&a.length<n;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(P)){const e=c[o++],s=i.getAttribute(t).split(C),n=/([.?@])?(.*)/.exec(e);a.push({type:1,index:r,name:n[2],strings:s,ctor:"."===n[1]?et:"?"===n[1]?st:"@"===n[1]?it:tt}),i.removeAttribute(t)}else t.startsWith(C)&&(a.push({type:6,index:r}),i.removeAttribute(t));if(B.test(i.tagName)){const t=i.textContent.split(C),e=t.length-1;if(e>0){i.textContent=x?x.emptyScript:"";for(let s=0;s<e;s++)i.append(t[s],k()),F.nextNode(),a.push({type:2,index:++r});i.append(t[e],k())}}}else if(8===i.nodeType)if(i.data===D)a.push({type:2,index:r});else{let t=-1;for(;-1!==(t=i.data.indexOf(C,t+1));)a.push({type:7,index:r}),t+=C.length-1}r++}}static createElement(t,e){const s=U.createElement("template");return s.innerHTML=t,s}}function Y(t,e,s=t,i){if(e===q)return e;let r=void 0!==i?s._$Co?.[i]:s._$Cl;const o=M(e)?void 0:e._$litDirective$;return r?.constructor!==o&&(r?._$AO?.(!1),void 0===o?r=void 0:(r=new o(t),r._$AT(t,s,i)),void 0!==i?(s._$Co??=[])[i]=r:s._$Cl=r),void 0!==r&&(e=Y(t,r._$AS(t,e.values),r,i)),e}class Q{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=(t?.creationScope??U).importNode(e,!0);F.currentNode=i;let r=F.nextNode(),o=0,n=0,a=s[0];for(;void 0!==a;){if(o===a.index){let e;2===a.type?e=new X(r,r.nextSibling,this,t):1===a.type?e=new a.ctor(r,a.name,a.strings,this,t):6===a.type&&(e=new rt(r,this,t)),this._$AV.push(e),a=s[++n]}o!==a?.index&&(r=F.nextNode(),o++)}return F.currentNode=U,i}p(t){let e=0;for(const s of this._$AV)void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=G,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Y(this,t,e),M(t)?t===G||null==t||""===t?(this._$AH!==G&&this._$AR(),this._$AH=G):t!==this._$AH&&t!==q&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>R(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==G&&M(this._$AH)?this._$AA.nextSibling.data=t:this.T(U.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:s}=t,i="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=Z.createElement(J(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new Q(i,this),s=t.u(this.options);t.p(e),this.T(s),this._$AH=t}}_$AC(t){let e=V.get(t.strings);return void 0===e&&V.set(t.strings,e=new Z(t)),e}k(t){R(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const r of t)i===e.length?e.push(s=new X(this.O(k()),this.O(k()),this,this.options)):s=e[i],s._$AI(r),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,r){this.type=1,this._$AH=G,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=r,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=G}_$AI(t,e=this,s,i){const r=this.strings;let o=!1;if(void 0===r)t=Y(this,t,e,0),o=!M(t)||t!==this._$AH&&t!==q,o&&(this._$AH=t);else{const i=t;let n,a;for(t=r[0],n=0;n<r.length-1;n++)a=Y(this,i[s+n],e,n),a===q&&(a=this._$AH[n]),o||=!M(a)||a!==this._$AH[n],a===G?t=G:t!==G&&(t+=(a??"")+r[n+1]),this._$AH[n]=a}o&&!i&&this.j(t)}j(t){t===G?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===G?void 0:t}}class st extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==G)}}class it extends tt{constructor(t,e,s,i,r){super(t,e,s,i,r),this.type=5}_$AI(t,e=this){if((t=Y(this,t,e,0)??G)===q)return;const s=this._$AH,i=t===G&&s!==G||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,r=t!==G&&(s===G||i);i&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class rt{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){Y(this,t)}}const ot=E.litHtmlPolyfillSupport;ot?.(Z,X),(E.litHtmlVersions??=[]).push("3.3.1");const nt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class at extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,s)=>{const i=s?.renderBefore??e;let r=i._$litPart$;if(void 0===r){const t=s?.renderBefore??null;i._$litPart$=r=new X(e.insertBefore(k(),t),t,void 0,s??{})}return r._$AI(t),r})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return q}}at._$litElement$=!0,at.finalized=!0,nt.litElementHydrateSupport?.({LitElement:at});const lt=nt.litElementPolyfillSupport;lt?.({LitElement:at}),(nt.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ct={attribute:!0,type:String,converter:y,reflect:!1,hasChanged:b},dt=(t=ct,e,s)=>{const{kind:i,metadata:r}=s;let o=globalThis.litPropertyMetadata.get(r);if(void 0===o&&globalThis.litPropertyMetadata.set(r,o=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),o.set(s.name,t),"accessor"===i){const{name:i}=s;return{set(s){const r=e.get.call(this);e.set.call(this,s),this.requestUpdate(i,r,t)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=s;return function(s){const r=this[i];e.call(this,s),this.requestUpdate(i,r,t)}}throw Error("Unsupported decorator location: "+i)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ht(t){return(e,s)=>"object"==typeof s?dt(t,e,s):((t,e,s)=>{const i=e.hasOwnProperty(s);return e.constructor.createProperty(s,t),i?Object.getOwnPropertyDescriptor(e,s):void 0})(t,e,s)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pt(t){return ht({...t,state:!0,attribute:!1})}let ut=class extends at{constructor(){super(...arguments),this._addPlantDialog=null,this.selectedDevice=null}static async getConfigElement(){return document.createElement("div")}static getStubConfig(){return{type:"custom:growspace-manager-card",title:"Growspace Manager"}}static get styles(){return a`
      :host {
        display: block;
      }
      
      ha-card {
        padding: 16px;
        --ha-card-border-radius: var(--ha-card-border-radius, 12px);
      }
      
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        flex-wrap: wrap;
        gap: 12px;
      }
      
      .selector-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .selector-container label {
        font-weight: 500;
        color: var(--primary-text-color);
      }
      
      select {
        padding: 8px 12px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-family: inherit;
        cursor: pointer;
        min-width: 150px;
      }
      
      select:focus {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
      
      .grid {
        display: grid;
        gap: 12px;
        margin-top: 16px;
      }
      
      .plant {
        border: 1px solid var(--divider-color);
        border-radius: var(--ha-card-border-radius, 8px);
        text-align: center;
        padding: 12px;
        background: var(--card-background-color);
        box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,0.12));
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        min-height: 80px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        cursor: pointer;
        aspect-ratio: 1 / 1;
        max-width: 90%;
        margin: 5% 5%;
      }
      
      .plant:hover {
        transform: translateY(-2px);
        box-shadow: var(--ha-card-box-shadow, 0 4px 8px rgba(0,0,0,0.15));
      }
      
      .plant.empty {
        background: var(--disabled-text-color);
        opacity: 0.3;
        border-style: dashed;
      }
      
      .plant-name {
        font-weight: 600;
        color: var(--primary-text-color);
        margin-bottom: 4px;
        font-size: 0.9em;
      }
      
      .plant-stage {
        color: var(--secondary-text-color);
        font-size: 0.8em;
        margin-bottom: 2px;
      }
      
      .plant-health {
        color: var(--secondary-text-color);
        font-size: 0.75em;
      }
      
      .plant-state {
        color: var(--accent-color);
        font-size: 0.75em;
        font-weight: 500;
      }
      
      .no-data {
        text-align: center;
        color: var(--secondary-text-color);
        padding: 32px 16px;
        font-style: italic;
      }
      
      .debug-info {
        background: var(--code-editor-background-color, #f5f5f5);
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 12px;
        margin: 16px 0;
        font-family: monospace;
        font-size: 0.8em;
      }
      
      .debug-info details {
        margin-top: 8px;
      }
      
      .debug-info pre {
        margin: 8px 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
      
      .error {
        color: var(--error-color);
        padding: 16px;
        background: rgba(var(--error-color-rgb, 244, 67, 54), 0.1);
        border-radius: 8px;
        margin: 16px 0;
      }
    `}setConfig(t){if(!t)throw new Error("Invalid configuration");this._config=t}getCardSize(){return 3}_getGrowspaceDevices(){if(!this.hass)return[];const t=Object.values(this.hass.states),e=t.filter(t=>t.entity_id.endsWith("_overview")),s=new Map;t.forEach(t=>{if(void 0!==t.attributes?.row&&void 0!==t.attributes?.col){const i=t.attributes?.growspace_id||e.find(e=>e.entity_id.startsWith(t.entity_id.split("_")[0]))?.attributes?.growspace_id||"unknown";s.has(i)||s.set(i,[]),s.get(i).push(t)}});const i=[];return s.forEach((t,s)=>{const r=e.find(t=>t.attributes?.growspace_id===s);i.push({device_id:s,name:r?.attributes?.friendly_name||`Growspace ${s}`,plants:t,rows:r?.attributes?.rows??3,plants_per_row:r?.attributes?.plants_per_row??3})}),i}_getDeviceName(t,e){if(e.length>0){const t=e[0],s=t.attributes?.friendly_name||t.entity_id,i=[/^([^_]+)_plant/i,/^(.+?)\s+plant/i,/^(.*?)(?:\s+\d+)?$/i];for(const t of i){const e=s.match(t);if(e&&e[1]&&e[1]!==s)return e[1].replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase())}return s.replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase())}return"unknown"===t?"Unknown Growspace":t.replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase())}_openAddPlantDialog(t,e){this._addPlantDialog={open:!0,row:t,col:e}}_addPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;const{row:t,col:e,strain:s}=this._addPlantDialog;s?this.hass.callService("growspace_manager","add_plant",{growspace_id:this.selectedDevice,row:t+1,col:e+1,strain:s}).then(()=>{console.log("Add plant requested",{row:t,col:e,strain:s}),this._addPlantDialog=null}).catch(t=>{console.error("Error calling growspace_manager.add_plant",t)}):alert("Please enter a strain!")}_createGridLayout(t,e,s){const i=Array.from({length:e},()=>Array.from({length:s},()=>null));return t.forEach(t=>{const r=(t.attributes?.row??1)-1,o=(t.attributes?.col??1)-1;r>=0&&r<e&&o>=0&&o<s&&(i[r][o]=t)}),{rows:e,cols:s,grid:i}}render(){if(!this.hass)return W`
      <ha-card>
        <div class="error">Home Assistant not available</div>
      </ha-card>
    `;const t=this._getGrowspaceDevices();if(!t.length)return W`
      <ha-card>
        <div class="no-data">No growspace devices found.</div>
      </ha-card>
    `;this.selectedDevice&&t.find(t=>t.device_id===this.selectedDevice)||(this.selectedDevice=t[0].device_id);const e=t.find(t=>t.device_id===this.selectedDevice);if(!e)return W`<ha-card><div class="error">Selected device not found</div></ha-card>`;const{rows:s,cols:i,grid:r}=this._createGridLayout(e.plants,e.rows,e.plants_per_row);return W`
    <ha-card>
      <div class="header">
        ${this._config.title?W`<h2>${this._config.title}</h2>`:""}
        <div class="selector-container">
          <label for="device-select">Growspace:</label>
          <select
            id="device-select"
            .value=${this.selectedDevice}
            @change=${this._handleDeviceChange}
          >
            ${t.map(t=>W`
              <option value="${t.device_id}" ?selected=${t.device_id===this.selectedDevice}>
                ${t.name} (${t.plants.length} plants)
              </option>
            `)}
          </select>
        </div>
      </div>

      <div
        class="grid"
        style="grid-template-columns: repeat(${i}, 1fr); grid-template-rows: repeat(${s}, 1fr);"
      >
        ${r.flat().map((t,e)=>{const s=Math.floor(e/i),r=e%i;return t?W`
            <div
              class="plant"
              style="grid-row: ${s+1}; grid-column: ${r+1};"
              title="Click to view details"
              @click=${()=>this._handlePlantClick(t)}
            >
              <div class="plant-name">${t.attributes?.strain}</div>
              <div class="phenotype">
                ${t.attributes?.phenotype?W`<div class="plant-phenotype">Phenotype: ${t.attributes.phenotype}</div>`:""}
              </div>
              <div class="plant-stage">${t.state}</div>
              ${t.attributes?.veg_days&&"vegetative"===t.attributes?.stage?W`<div class="plant-veg-days">Days in Veg: ${t.attributes.veg_days}</div>`:""}
              ${t.attributes?.flower_days&&"flowering"===t.attributes?.stage?W`<div class="plant-flower-days">Days in Flower: ${t.attributes.flower_days}</div>`:""}
            </div>
          `:W`
              <div 
                class="plant empty"
                style="grid-row: ${s+1}; grid-column: ${r+1};"
                title="Empty slot (${s}, ${r})"
                @click=${()=>this._handleEmptyClick(s,r)}
              >
                <div class="plant-name">Empty</div>
                <div class="plant-stage">Empty</div>
              </div>
            `})}
      </div>
    </ha-card>

    ${this._addPlantDialog?.open?W`
      <ha-dialog
        open
        @closed=${()=>this._addPlantDialog=null}
        heading="Add Plant at Row ${this._addPlantDialog.row+1}, Col ${this._addPlantDialog.col+1}"
      >
        <div>
          <label for="strain-select">Enter strain:</label>
          <input
            id="strain-select"
            type="text"
            .value=${this._addPlantDialog.strain||""}
            @input=${t=>{const e=t.target;this._addPlantDialog&&(this._addPlantDialog.strain=e.value)}}
          >
        </div>
        <mwc-button slot="primaryAction" @click=${this._addPlant}>Add</mwc-button>
        <mwc-button slot="secondaryAction" @click=${()=>this._addPlantDialog=null}>Cancel</mwc-button>
      </ha-dialog>
    `:""}
  `}_handleEmptyClick(t,e){this._openAddPlantDialog(t,e)}_handleDeviceChange(t){const e=t.target;this.selectedDevice=e.value}_handlePlantClick(t){const e=new CustomEvent("hass-more-info",{bubbles:!0,composed:!0,detail:{entityId:t.entity_id}});this.dispatchEvent(e)}};t([pt(),e("design:type",Object)],ut.prototype,"_addPlantDialog",void 0),t([ht({attribute:!1}),e("design:type",Object)],ut.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],ut.prototype,"_config",void 0),t([pt(),e("design:type",Object)],ut.prototype,"selectedDevice",void 0),ut=t([(t=>(e,s)=>{void 0!==s?s.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)})("growspace-manager-card")],ut),window.customCards=window.customCards||[],window.customCards.push({type:"growspace-manager-card",name:"Growspace Manager Card",description:"A card to manage and display growspace plants in a grid layout"}),customElements.get("growspace-manager-card")||customElements.define("growspace-manager-card",ut);export{ut as GrowspaceManagerCard};
//# sourceMappingURL=growspace-manager-card.js.map
