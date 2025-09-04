function t(t,e,i,s){var r,a=arguments.length,n=a<3?e:null===s?s=Object.getOwnPropertyDescriptor(e,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,s);else for(var o=t.length-1;o>=0;o--)(r=t[o])&&(n=(a<3?r(n):a>3?r(e,i,n):r(e,i))||n);return a>3&&n&&Object.defineProperty(e,i,n),n}function e(t,e){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(t,e)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const i=globalThis,s=i.ShadowRoot&&(void 0===i.ShadyCSS||i.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,r=Symbol(),a=new WeakMap;class n{constructor(t,e,i){if(this._$cssResult$=!0,i!==r)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=a.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&a.set(e,t))}return t}toString(){return this.cssText}}const o=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,s)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[s+1],t[0]);return new n(i,t,r)},l=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,r))(e)})(t):t,{is:d,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:p,getOwnPropertySymbols:u,getPrototypeOf:g}=Object,_=globalThis,v=_.trustedTypes,$=v?v.emptyScript:"",b=_.reactiveElementPolyfillSupport,y=(t,e)=>t,f={toAttribute(t,e){switch(e){case Boolean:t=t?$:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},m=(t,e)=>!d(t,e),w={attribute:!0,type:String,converter:f,reflect:!1,useDefault:!1,hasChanged:m};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),_.litPropertyMetadata??=new WeakMap;class A extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=w){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(t,i,e);void 0!==s&&c(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){const{get:s,set:r}=h(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:s,set(e){const a=s?.call(this);r?.call(this,e),this.requestUpdate(t,a,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??w}static _$Ei(){if(this.hasOwnProperty(y("elementProperties")))return;const t=g(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(y("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(y("properties"))){const t=this.properties,e=[...p(t),...u(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(s)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of e){const e=document.createElement("style"),r=i.litNonce;void 0!==r&&e.setAttribute("nonce",r),e.textContent=s.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(void 0!==s&&!0===i.reflect){const r=(void 0!==i.converter?.toAttribute?i.converter:f).toAttribute(e,i.type);this._$Em=t,null==r?this.removeAttribute(s):this.setAttribute(s,r),this._$Em=null}}_$AK(t,e){const i=this.constructor,s=i._$Eh.get(t);if(void 0!==s&&this._$Em!==s){const t=i.getPropertyOptions(s),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:f;this._$Em=s;const a=r.fromAttribute(e,t.type);this[s]=a??this._$Ej?.get(s)??a,this._$Em=null}}requestUpdate(t,e,i){if(void 0!==t){const s=this.constructor,r=this[t];if(i??=s.getPropertyOptions(t),!((i.hasChanged??m)(r,e)||i.useDefault&&i.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(s._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:r},a){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,a??e??this[t]),!0!==r||void 0!==a)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===s&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,s=this[e];!0!==t||this._$AL.has(e)||void 0===s||this.C(e,void 0,i,s)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}A.elementStyles=[],A.shadowRootOptions={mode:"open"},A[y("elementProperties")]=new Map,A[y("finalized")]=new Map,b?.({ReactiveElement:A}),(_.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const D=globalThis,x=D.trustedTypes,S=x?x.createPolicy("lit-html",{createHTML:t=>t}):void 0,P="$lit$",E=`lit$${Math.random().toFixed(9).slice(2)}$`,O="?"+E,C=`<${O}>`,L=document,k=()=>L.createComment(""),U=t=>null===t||"object"!=typeof t&&"function"!=typeof t,M=Array.isArray,R="[ \t\n\f\r]",H=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,T=/-->/g,N=/>/g,j=RegExp(`>|${R}(?:([^\\s"'>=/]+)(${R}*=${R}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),z=/'/g,I=/"/g,B=/^(?:script|style|textarea|title)$/i,W=(t=>(e,...i)=>({_$litType$:t,strings:e,values:i}))(1),V=Symbol.for("lit-noChange"),q=Symbol.for("lit-nothing"),G=new WeakMap,F=L.createTreeWalker(L,129);function J(t,e){if(!M(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(e):e}const Z=(t,e)=>{const i=t.length-1,s=[];let r,a=2===e?"<svg>":3===e?"<math>":"",n=H;for(let e=0;e<i;e++){const i=t[e];let o,l,d=-1,c=0;for(;c<i.length&&(n.lastIndex=c,l=n.exec(i),null!==l);)c=n.lastIndex,n===H?"!--"===l[1]?n=T:void 0!==l[1]?n=N:void 0!==l[2]?(B.test(l[2])&&(r=RegExp("</"+l[2],"g")),n=j):void 0!==l[3]&&(n=j):n===j?">"===l[0]?(n=r??H,d=-1):void 0===l[1]?d=-2:(d=n.lastIndex-l[2].length,o=l[1],n=void 0===l[3]?j:'"'===l[3]?I:z):n===I||n===z?n=j:n===T||n===N?n=H:(n=j,r=void 0);const h=n===j&&t[e+1].startsWith("/>")?" ":"";a+=n===H?i+C:d>=0?(s.push(o),i.slice(0,d)+P+i.slice(d)+E+h):i+E+(-2===d?e:h)}return[J(t,a+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),s]};class K{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let r=0,a=0;const n=t.length-1,o=this.parts,[l,d]=Z(t,e);if(this.el=K.createElement(l,i),F.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(s=F.nextNode())&&o.length<n;){if(1===s.nodeType){if(s.hasAttributes())for(const t of s.getAttributeNames())if(t.endsWith(P)){const e=d[a++],i=s.getAttribute(t).split(E),n=/([.?@])?(.*)/.exec(e);o.push({type:1,index:r,name:n[2],strings:i,ctor:"."===n[1]?et:"?"===n[1]?it:"@"===n[1]?st:tt}),s.removeAttribute(t)}else t.startsWith(E)&&(o.push({type:6,index:r}),s.removeAttribute(t));if(B.test(s.tagName)){const t=s.textContent.split(E),e=t.length-1;if(e>0){s.textContent=x?x.emptyScript:"";for(let i=0;i<e;i++)s.append(t[i],k()),F.nextNode(),o.push({type:2,index:++r});s.append(t[e],k())}}}else if(8===s.nodeType)if(s.data===O)o.push({type:2,index:r});else{let t=-1;for(;-1!==(t=s.data.indexOf(E,t+1));)o.push({type:7,index:r}),t+=E.length-1}r++}}static createElement(t,e){const i=L.createElement("template");return i.innerHTML=t,i}}function Y(t,e,i=t,s){if(e===V)return e;let r=void 0!==s?i._$Co?.[s]:i._$Cl;const a=U(e)?void 0:e._$litDirective$;return r?.constructor!==a&&(r?._$AO?.(!1),void 0===a?r=void 0:(r=new a(t),r._$AT(t,i,s)),void 0!==s?(i._$Co??=[])[s]=r:i._$Cl=r),void 0!==r&&(e=Y(t,r._$AS(t,e.values),r,s)),e}class Q{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??L).importNode(e,!0);F.currentNode=s;let r=F.nextNode(),a=0,n=0,o=i[0];for(;void 0!==o;){if(a===o.index){let e;2===o.type?e=new X(r,r.nextSibling,this,t):1===o.type?e=new o.ctor(r,o.name,o.strings,this,t):6===o.type&&(e=new rt(r,this,t)),this._$AV.push(e),o=i[++n]}a!==o?.index&&(r=F.nextNode(),a++)}return F.currentNode=L,s}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=q,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Y(this,t,e),U(t)?t===q||null==t||""===t?(this._$AH!==q&&this._$AR(),this._$AH=q):t!==this._$AH&&t!==V&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>M(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==q&&U(this._$AH)?this._$AA.nextSibling.data=t:this.T(L.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,s="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=K.createElement(J(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{const t=new Q(s,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=G.get(t.strings);return void 0===e&&G.set(t.strings,e=new K(t)),e}k(t){M(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,s=0;for(const r of t)s===e.length?e.push(i=new X(this.O(k()),this.O(k()),this,this.options)):i=e[s],i._$AI(r),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,r){this.type=1,this._$AH=q,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=r,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=q}_$AI(t,e=this,i,s){const r=this.strings;let a=!1;if(void 0===r)t=Y(this,t,e,0),a=!U(t)||t!==this._$AH&&t!==V,a&&(this._$AH=t);else{const s=t;let n,o;for(t=r[0],n=0;n<r.length-1;n++)o=Y(this,s[i+n],e,n),o===V&&(o=this._$AH[n]),a||=!U(o)||o!==this._$AH[n],o===q?t=q:t!==q&&(t+=(o??"")+r[n+1]),this._$AH[n]=o}a&&!s&&this.j(t)}j(t){t===q?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===q?void 0:t}}class it extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==q)}}class st extends tt{constructor(t,e,i,s,r){super(t,e,i,s,r),this.type=5}_$AI(t,e=this){if((t=Y(this,t,e,0)??q)===V)return;const i=this._$AH,s=t===q&&i!==q||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,r=t!==q&&(i===q||s);s&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class rt{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){Y(this,t)}}const at=D.litHtmlPolyfillSupport;at?.(K,X),(D.litHtmlVersions??=[]).push("3.3.1");const nt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const s=i?.renderBefore??e;let r=s._$litPart$;if(void 0===r){const t=i?.renderBefore??null;s._$litPart$=r=new X(e.insertBefore(k(),t),t,void 0,i??{})}return r._$AI(t),r})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return V}}ot._$litElement$=!0,ot.finalized=!0,nt.litElementHydrateSupport?.({LitElement:ot});const lt=nt.litElementPolyfillSupport;lt?.({LitElement:ot}),(nt.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const dt={attribute:!0,type:String,converter:f,reflect:!1,hasChanged:m},ct=(t=dt,e,i)=>{const{kind:s,metadata:r}=i;let a=globalThis.litPropertyMetadata.get(r);if(void 0===a&&globalThis.litPropertyMetadata.set(r,a=new Map),"setter"===s&&((t=Object.create(t)).wrapped=!0),a.set(i.name,t),"accessor"===s){const{name:s}=i;return{set(i){const r=e.get.call(this);e.set.call(this,i),this.requestUpdate(s,r,t)},init(e){return void 0!==e&&this.C(s,void 0,t,e),e}}}if("setter"===s){const{name:s}=i;return function(i){const r=this[s];e.call(this,i),this.requestUpdate(s,r,t)}}throw Error("Unsupported decorator location: "+s)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ht(t){return(e,i)=>"object"==typeof i?ct(t,e,i):((t,e,i)=>{const s=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),s?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pt(t){return ht({...t,state:!0,attribute:!1})}let ut=class extends ot{constructor(){super(...arguments),this._addPlantDialog=null,this._plantOverviewDialog=null,this._strainLibraryDialog=null,this.selectedDevice=null,this._draggedPlant=null}get _strainLibrary(){const t=Object.values(this.hass.states).find(t=>t.entity_id.endsWith("_strain_library"));return t?.attributes?.strains||[]}_openStrainLibraryDialog(){const t=this._strainLibrary||[];this._strainLibraryDialog={open:!0,newStrain:"",strains:t}}async _addStrain(){this._strainLibraryDialog?.newStrain&&(this._strainLibraryDialog.strains.push(this._strainLibraryDialog.newStrain),await this.hass.callService("growspace_manager","import_strain_library",{strains:this._strainLibraryDialog.strains,replace:!0}),this._strainLibraryDialog.newStrain="")}async _removeStrain(t){this._strainLibraryDialog&&(this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e!==t),await this.hass.callService("growspace_manager","import_strain_library",{strains:this._strainLibraryDialog.strains,replace:!0}))}async _clearStrains(){await this.hass.callService("growspace_manager","clear_strain_library",{})}static async getConfigElement(){return document.createElement("div")}static getStubConfig(){return{type:"custom:growspace-manager-card",title:"Growspace Manager"}}setConfig(t){if(!t)throw new Error("Invalid configuration");this._config=t}getCardSize(){return 3}static get styles(){return o`
      :host { 
        display: block;
      }
      /* Force override ha-button styles with !important */  
      /* Custom button class for more specific targeting */
      ha-button.growspace-button::part(base),
      .growspace-button::part(base):hover,
      .growspace-button::part(base):active {
        background-color: #2196f3;
        color: var(--text-primary-color);
      }
      
      /* Strain library specific buttons */
      .strain-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 5%;
      }

      .strain-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 8px;
        background: var(--card-background-color);
        border-radius: 6px;
      }

      .remove-button {
        background: none;
        border: none;
        padding: 2px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--error-color, red); /* optional */
        transition: color 0.2s;
      }

      .remove-button:hover {
        color: var(--error-color, darkred);
      }

      .remove-icon {
        display: block;
      }
      
      
      ha-card { padding: 16px; --ha-card-border-radius: var(--ha-card-border-radius, 12px); }
      .header { display: flex; align-items: start; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
      .selector-container { display: flex; align-items: center; gap: 8px; }
      select { padding: 8px 12px; border: 1px solid var(--divider-color); border-radius: 8px; background: var(--card-background-color); color: var(--primary-text-color); font-family: inherit; cursor: pointer; min-width: 150px; }
      select:focus { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      .grid { display: grid; gap: 12px; margin-top: 16px; }
      .plant { border: 1px solid var(--divider-color); border-radius: var(--ha-card-border-radius, 8px); text-align: center; padding: 12px; background: var(--card-background-color); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,0.12)); transition: transform 0.2s ease, box-shadow 0.2s ease; min-height: 80px; display: flex; flex-direction: column; justify-content: center; cursor: pointer; aspect-ratio: 1 / 1; max-width: 90%; margin: 5% 5%; }
      .plant:hover { transform: translateY(-2px); box-shadow: var(--ha-card-box-shadow, 0 4px 8px rgba(0,0,0,0.15)); }
      .plant.empty { background: var(--disabled-text-color); opacity: 0.3; border-style: dashed; }
      .plant-name { font-weight: 600; color: var(--primary-text-color); margin-bottom: 4px; font-size: 0.9em; }
      .plant-stage { color: var(--secondary-text-color); font-size: 0.8em; margin-bottom: 2px; }
      .no-data { text-align: center; color: var(--secondary-text-color); padding: 32px 16px; font-style: italic; }
      .error { color: var(--error-color); padding: 16px; background: rgba(var(--error-color-rgb, 244, 67, 54), 0.1); border-radius: 8px; margin: 16px 0; }
      .overview-fields { display: flex; flex-direction: column; gap: 8px; }
      .overview-fields label { display: flex; flex-direction: column; font-size: 0.85em; }
      .overview-fields input, .overview-fields select { padding: 6px 8px; font-family: inherit; border-radius: 6px; border: 1px solid var(--divider-color); }
    `}_getGrowspaceDevices(){if(!this.hass)return[];const t=Object.values(this.hass.states),e=t.filter(t=>t.entity_id.endsWith("_overview")),i=new Map;t.forEach(t=>{if(void 0!==t.attributes?.row&&void 0!==t.attributes?.col){const s=t.attributes?.growspace_id||e.find(e=>e.entity_id.startsWith(t.entity_id.split("_")[0]))?.attributes?.growspace_id||"unknown";i.has(s)||i.set(s,[]),i.get(s).push(t)}});const s=[];return i.forEach((t,i)=>{const r=e.find(t=>t.attributes?.growspace_id===i);s.push({device_id:i,name:r?.attributes?.friendly_name||`Growspace ${i}`,plants:t,rows:r?.attributes?.rows??3,plants_per_row:r?.attributes?.plants_per_row??3})}),s}_createGridLayout(t,e,i){const s=Array.from({length:e},()=>Array.from({length:i},()=>null));return t.forEach(t=>{const r=(t.attributes?.row??1)-1,a=(t.attributes?.col??1)-1;r>=0&&r<e&&a>=0&&a<i&&(s[r][a]=t)}),{rows:e,cols:i,grid:s}}_handleDeviceChange(t){const e=t.target;this.selectedDevice=e.value}_handlePlantClick(t){this._plantOverviewDialog={open:!0,plant:t,editedAttributes:{...t.attributes}}}_openAddPlantDialog(t,e){const i=(new Date).toISOString().slice(0,16),s=this._strainLibrary?.[0]||"";this._addPlantDialog={open:!0,row:t,col:e,strain:s,phenotype:"",veg_start:i,flower_start:i}}_confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const t=this._addPlantDialog.veg_start||(new Date).toISOString().slice(0,16),e=this._addPlantDialog.flower_start||(new Date).toISOString().slice(0,16);this.hass.callService("growspace_manager","add_plant",{growspace_id:this.selectedDevice,row:this._addPlantDialog.row+1,col:this._addPlantDialog.col+1,strain:this._addPlantDialog.strain,phenotype:this._addPlantDialog.phenotype,veg_start:t,flower_start:e}).then(()=>{this._addPlantDialog=null}).catch(t=>console.error("Error calling growspace_manager.add_plant",t))}async _updatePlant(){if(!this._plantOverviewDialog)return;const t=this._plantOverviewDialog.editedAttributes,e={plant_id:this._plantOverviewDialog.plant.attributes?.plant_id||this._plantOverviewDialog.plant.entity_id.replace("sensor.","")};["strain","phenotype","row","col","veg_start","flower_start"].forEach(i=>{void 0!==t[i]&&null!==t[i]&&(e[i]=t[i])});try{await this.hass.callService("growspace_manager","update_plant",e),this._plantOverviewDialog=null}catch(t){console.error("Error updating plant:",t)}}_handleDragStart(t,e){this._draggedPlant=e,t.dataTransfer?.setData("text/plain",JSON.stringify({id:e.entity_id}))}_handleDragOver(t){t.preventDefault()}_handleDrop(t,e,i,s){if(t.preventDefault(),!this._draggedPlant)return;const r=this._draggedPlant;this._draggedPlant=null,s?(this._movePlant(r,e,i),this._movePlant(s,r.attributes.row,r.attributes.col)):this._movePlant(r,e,i)}async _movePlant(t,e,i){try{const s=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.hass.callService("growspace_manager","update_plant",{plant_id:s,row:e,col:i})}catch(t){console.error("Error moving plant:",t)}}render(){if(!this.hass)return W`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;const t=this._getGrowspaceDevices();if(!t.length)return W`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;this.selectedDevice&&t.find(t=>t.device_id===this.selectedDevice)||(this.selectedDevice=t[0].device_id);const e=t.find(t=>t.device_id===this.selectedDevice),{rows:i,cols:s,grid:r}=this._createGridLayout(e.plants,e.rows,e.plants_per_row);return W`
      <ha-card>
        <div class="header">
          <div class="selector-container">
            <label for="device-select">Growspace:</label>
            <select id="device-select" .value=${this.selectedDevice} @change=${this._handleDeviceChange}>
              ${t.map(t=>W`<option value="${t.device_id}">${t.name}</option>`)}
            </select>
          </div>
          <div class="header-buttons">
            <ha-button variant="neutral" class="growspace-button" @click=${this._openStrainLibraryDialog}>Manage Strain Library</ha-button>
          </div>
        </div>

        <div class="grid" style="grid-template-columns: repeat(${s}, 1fr); grid-template-rows: repeat(${i}, 1fr);">
          ${r.flat().map((t,e)=>{const i=Math.floor(e/s)+1,r=e%s+1;return t?W`
              <div class="plant" 
                   style="grid-row: ${i}; grid-column: ${r}" 
                   draggable="true"
                   @dragstart=${e=>this._handleDragStart(e,t)}
                   @dragover=${this._handleDragOver}
                   @drop=${e=>this._handleDrop(e,i,r,t)}
                   @click=${()=>this._handlePlantClick(t)}>
                <div class="plant-name">${t.attributes?.strain}</div>
                ${t.attributes?.phenotype?W`<div class="plant-phenotype">Phenotype: ${t.attributes.phenotype}</div>`:""}
                <div class="plant-stage">${t.state}</div>
                ${t.attributes?.veg_days?W`<div class="plant-veg-days">Days in Veg: ${t.attributes.veg_days}</div>`:""}
                ${t.attributes?.flower_days?W`<div class="plant-flower-days">Days in Flower: ${t.attributes.flower_days}</div>`:""}
              </div>
            `:W`
                <div class="plant empty" 
                     style="grid-row: ${i}; grid-column: ${r}" 
                     @click=${()=>this._openAddPlantDialog(i-1,r-1)}
                     @dragover=${this._handleDragOver}
                     @drop=${t=>this._handleDrop(t,i,r,null)}>
                  <div class="plant-name">Empty</div>
                  <div class="plant-stage">Empty</div>
                </div>
              `})}
        </div>

        <!-- Add Plant Dialog -->
        ${this._addPlantDialog?.open?W`
          <ha-dialog
            open
            @closed=${()=>this._addPlantDialog=null}
            heading="Add Plant at Row ${this._addPlantDialog.row+1}, Col ${this._addPlantDialog.col+1}"
          >
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label>Strain:
                <select .value=${this._addPlantDialog.strain} @change=${t=>{const e=t.target;this._addPlantDialog&&(this._addPlantDialog.strain=e.value)}}>
                  ${this._strainLibrary.map(t=>W`<option value="${t}" ?selected=${this._addPlantDialog?.strain===t}>${t}</option>`)}
                </select>
              </label>

              <label>Phenotype:
                <input type="text" .value=${this._addPlantDialog.phenotype||""} @input=${t=>this._addPlantDialog.phenotype=t.target.value} />
              </label>

              <label>Vegetative Start:
                <input type="datetime-local" .value=${this._addPlantDialog.veg_start||""} @input=${t=>this._addPlantDialog.veg_start=t.target.value} />
              </label>

              <label>Flower Start:
                <input type="datetime-local" .value=${this._addPlantDialog.flower_start||""} @input=${t=>this._addPlantDialog.flower_start=t.target.value} />
              </label>
            </div>

            <ha-button class="growspace-button" slot="primaryAction" @click=${this._confirmAddPlant}>Add Plant</ha-button>
            <ha-button class="growspace-button" slot="secondaryAction" @click=${()=>this._addPlantDialog=null}>Cancel</ha-button>
          </ha-dialog>
        `:""}

        <!-- Plant Overview Dialog -->
        ${this._plantOverviewDialog?.open?W`
          <ha-dialog
            open
            @closed=${()=>this._plantOverviewDialog=null}
            heading="Plant Overview: ${this._plantOverviewDialog.editedAttributes.strain||"Unnamed"}"
          >
            <div class="overview-fields">
              <label>Strain:
                <input type="text" .value=${this._plantOverviewDialog.editedAttributes.strain||""} 
                       @input=${t=>this._plantOverviewDialog.editedAttributes.strain=t.target.value}>
              </label>

              <label>Phenotype:
                <input type="text" .value=${this._plantOverviewDialog.editedAttributes.phenotype||""} 
                       @input=${t=>this._plantOverviewDialog.editedAttributes.phenotype=t.target.value}>
              </label>

              <label>Row:
                <input type="number" .value=${this._plantOverviewDialog.editedAttributes.row||1} 
                       @input=${t=>this._plantOverviewDialog.editedAttributes.row=parseInt(t.target.value)}>
              </label>

              <label>Col:
                <input type="number" .value=${this._plantOverviewDialog.editedAttributes.col||1} 
                       @input=${t=>this._plantOverviewDialog.editedAttributes.col=parseInt(t.target.value)}>
              </label>

              <label>Vegetative Start:
                <input type="datetime-local" .value=${this._plantOverviewDialog.editedAttributes.veg_start||""} 
                       @input=${t=>this._plantOverviewDialog.editedAttributes.veg_start=t.target.value}>
              </label>

              <label>Flower Start:
                <input type="datetime-local" .value=${this._plantOverviewDialog.editedAttributes.flower_start||""} 
                       @input=${t=>this._plantOverviewDialog.editedAttributes.flower_start=t.target.value}>
              </label>
            </div>

            <ha-button slot="primaryAction" @click=${this._updatePlant}>Update</ha-button>
            <ha-button slot="secondaryAction" @click=${()=>this._plantOverviewDialog=null}>Cancel</ha-button>
          </ha-dialog>
          
        `:""}
      </ha-card>
      <!-- strain library dialog -->
        ${this._strainLibraryDialog?.open?W`
          <ha-dialog open heading="Strain Library" @closed=${()=>this._strainLibraryDialog=null}>
            <div>
              <label>Add new strain:</label>
              <input type="text" .value=${this._strainLibraryDialog.newStrain}
                     @input=${t=>this._strainLibraryDialog.newStrain=t.target.value}>
              <ha-button variant="neutral" class="growspace-button" size="small" @click=${this._addStrain}>Add</ha-button>
            </div>
            </div>
            <div class="strain-list">
              ${this._strainLibraryDialog?.strains.map(t=>W`
                <div class="strain-item">
                  <span>${t}</span>
                  <button 
                    class="remove-button"
                    title="Remove"
                    type="button"
                    @click=${()=>this._removeStrain(t)}
                  >
                    <svg
                      class="remove-icon"
                      style="width:16px;height:16px;fill:currentColor;vertical-align:middle;"
                      viewBox="0 0 24 24"
                    >
                      <path d="${"M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"}"></path>
                    </svg>
                  </button>
                </div>
              `)}
            </div>

            <ha-button variant="neutral" class="growspace-button" size="small" slot="secondaryAction" @click=${this._clearStrains}>Clear All</ha-button>
            <ha-button variant="neutral" class="growspace-button" size="small" slot="primaryAction" @click=${()=>this._strainLibraryDialog=null}>Close</ha-button>
   
          </ha-dialog>
        `:""}
    `}};t([pt(),e("design:type",Object)],ut.prototype,"_addPlantDialog",void 0),t([pt(),e("design:type",Object)],ut.prototype,"_plantOverviewDialog",void 0),t([pt(),e("design:type",Object)],ut.prototype,"_strainLibraryDialog",void 0),t([pt(),e("design:type",Object)],ut.prototype,"selectedDevice",void 0),t([ht({attribute:!1}),e("design:type",Object)],ut.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],ut.prototype,"_config",void 0),ut=t([(t=>(e,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)})("growspace-manager-card")],ut);export{ut as GrowspaceManagerCard};
//# sourceMappingURL=growspace-manager-card.js.map
