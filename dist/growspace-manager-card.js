function t(t,e,r,n){var s,i=arguments.length,a=i<3?e:null===n?n=Object.getOwnPropertyDescriptor(e,r):n;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,r,n);else for(var o=t.length-1;o>=0;o--)(s=t[o])&&(a=(i<3?s(a):i>3?s(e,r,a):s(e,r))||a);return i>3&&a&&Object.defineProperty(e,r,a),a}function e(t,e){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(t,e)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const r=globalThis,n=r.ShadowRoot&&(void 0===r.ShadyCSS||r.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),i=new WeakMap;class a{constructor(t,e,r){if(this._$cssResult$=!0,r!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(n&&void 0===t){const r=void 0!==e&&1===e.length;r&&(t=i.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),r&&i.set(e,t))}return t}toString(){return this.cssText}}const o=(t,...e)=>{const r=1===t.length?t[0]:e.reduce((e,r,n)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+t[n+1],t[0]);return new a(r,t,s)},l=n?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const r of t.cssRules)e+=r.cssText;return(t=>new a("string"==typeof t?t:t+"",void 0,s))(e)})(t):t,{is:c,defineProperty:u,getOwnPropertyDescriptor:d,getOwnPropertyNames:h,getOwnPropertySymbols:m,getPrototypeOf:p}=Object,g=globalThis,f=g.trustedTypes,y=f?f.emptyScript:"",v=g.reactiveElementPolyfillSupport,w=(t,e)=>t,b={toAttribute(t,e){switch(e){case Boolean:t=t?y:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let r=t;switch(e){case Boolean:r=null!==t;break;case Number:r=null===t?null:Number(t);break;case Object:case Array:try{r=JSON.parse(t)}catch(t){r=null}}return r}},_=(t,e)=>!c(t,e),S={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:_};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;class $ extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=S){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const r=Symbol(),n=this.getPropertyDescriptor(t,r,e);void 0!==n&&u(this.prototype,t,n)}}static getPropertyDescriptor(t,e,r){const{get:n,set:s}=d(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:n,set(e){const i=n?.call(this);s?.call(this,e),this.requestUpdate(t,i,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??S}static _$Ei(){if(this.hasOwnProperty(w("elementProperties")))return;const t=p(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(w("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(w("properties"))){const t=this.properties,e=[...h(t),...m(t)];for(const r of e)this.createProperty(r,t[r])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,r]of e)this.elementProperties.set(t,r)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const r=this._$Eu(t,e);void 0!==r&&this._$Eh.set(r,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const r=new Set(t.flat(1/0).reverse());for(const t of r)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const r=e.attribute;return!1===r?void 0:"string"==typeof r?r:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const r of e.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(n)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const n of e){const e=document.createElement("style"),s=r.litNonce;void 0!==s&&e.setAttribute("nonce",s),e.textContent=n.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,r){this._$AK(t,r)}_$ET(t,e){const r=this.constructor.elementProperties.get(t),n=this.constructor._$Eu(t,r);if(void 0!==n&&!0===r.reflect){const s=(void 0!==r.converter?.toAttribute?r.converter:b).toAttribute(e,r.type);this._$Em=t,null==s?this.removeAttribute(n):this.setAttribute(n,s),this._$Em=null}}_$AK(t,e){const r=this.constructor,n=r._$Eh.get(t);if(void 0!==n&&this._$Em!==n){const t=r.getPropertyOptions(n),s="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:b;this._$Em=n;const i=s.fromAttribute(e,t.type);this[n]=i??this._$Ej?.get(n)??i,this._$Em=null}}requestUpdate(t,e,r){if(void 0!==t){const n=this.constructor,s=this[t];if(r??=n.getPropertyOptions(t),!((r.hasChanged??_)(s,e)||r.useDefault&&r.reflect&&s===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,r))))return;this.C(t,e,r)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:r,reflect:n,wrapped:s},i){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,i??e??this[t]),!0!==s||void 0!==i)||(this._$AL.has(t)||(this.hasUpdated||r||(e=void 0),this._$AL.set(t,e)),!0===n&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,r]of t){const{wrapped:t}=r,n=this[e];!0!==t||this._$AL.has(e)||void 0===n||this.C(e,void 0,r,n)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[w("elementProperties")]=new Map,$[w("finalized")]=new Map,v?.({ReactiveElement:$}),(g.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const x=globalThis,k=x.trustedTypes,D=k?k.createPolicy("lit-html",{createHTML:t=>t}):void 0,C="$lit$",O=`lit$${Math.random().toFixed(9).slice(2)}$`,A="?"+O,T=`<${A}>`,E=document,M=()=>E.createComment(""),N=t=>null===t||"object"!=typeof t&&"function"!=typeof t,L=Array.isArray,P="[ \t\n\f\r]",V=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,I=/-->/g,F=/>/g,z=RegExp(`>|${P}(?:([^\\s"'>=/]+)(${P}*=${P}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),j=/'/g,H=/"/g,U=/^(?:script|style|textarea|title)$/i,Z=(t=>(e,...r)=>({_$litType$:t,strings:e,values:r}))(1),W=Symbol.for("lit-noChange"),R=Symbol.for("lit-nothing"),q=new WeakMap,Y=E.createTreeWalker(E,129);function G(t,e){if(!L(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==D?D.createHTML(e):e}const B=(t,e)=>{const r=t.length-1,n=[];let s,i=2===e?"<svg>":3===e?"<math>":"",a=V;for(let e=0;e<r;e++){const r=t[e];let o,l,c=-1,u=0;for(;u<r.length&&(a.lastIndex=u,l=a.exec(r),null!==l);)u=a.lastIndex,a===V?"!--"===l[1]?a=I:void 0!==l[1]?a=F:void 0!==l[2]?(U.test(l[2])&&(s=RegExp("</"+l[2],"g")),a=z):void 0!==l[3]&&(a=z):a===z?">"===l[0]?(a=s??V,c=-1):void 0===l[1]?c=-2:(c=a.lastIndex-l[2].length,o=l[1],a=void 0===l[3]?z:'"'===l[3]?H:j):a===H||a===j?a=z:a===I||a===F?a=V:(a=z,s=void 0);const d=a===z&&t[e+1].startsWith("/>")?" ":"";i+=a===V?r+T:c>=0?(n.push(o),r.slice(0,c)+C+r.slice(c)+O+d):r+O+(-2===c?e:d)}return[G(t,i+(t[r]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),n]};class J{constructor({strings:t,_$litType$:e},r){let n;this.parts=[];let s=0,i=0;const a=t.length-1,o=this.parts,[l,c]=B(t,e);if(this.el=J.createElement(l,r),Y.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(n=Y.nextNode())&&o.length<a;){if(1===n.nodeType){if(n.hasAttributes())for(const t of n.getAttributeNames())if(t.endsWith(C)){const e=c[i++],r=n.getAttribute(t).split(O),a=/([.?@])?(.*)/.exec(e);o.push({type:1,index:s,name:a[2],strings:r,ctor:"."===a[1]?et:"?"===a[1]?rt:"@"===a[1]?nt:tt}),n.removeAttribute(t)}else t.startsWith(O)&&(o.push({type:6,index:s}),n.removeAttribute(t));if(U.test(n.tagName)){const t=n.textContent.split(O),e=t.length-1;if(e>0){n.textContent=k?k.emptyScript:"";for(let r=0;r<e;r++)n.append(t[r],M()),Y.nextNode(),o.push({type:2,index:++s});n.append(t[e],M())}}}else if(8===n.nodeType)if(n.data===A)o.push({type:2,index:s});else{let t=-1;for(;-1!==(t=n.data.indexOf(O,t+1));)o.push({type:7,index:s}),t+=O.length-1}s++}}static createElement(t,e){const r=E.createElement("template");return r.innerHTML=t,r}}function Q(t,e,r=t,n){if(e===W)return e;let s=void 0!==n?r._$Co?.[n]:r._$Cl;const i=N(e)?void 0:e._$litDirective$;return s?.constructor!==i&&(s?._$AO?.(!1),void 0===i?s=void 0:(s=new i(t),s._$AT(t,r,n)),void 0!==n?(r._$Co??=[])[n]=s:r._$Cl=s),void 0!==s&&(e=Q(t,s._$AS(t,e.values),s,n)),e}class K{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:r}=this._$AD,n=(t?.creationScope??E).importNode(e,!0);Y.currentNode=n;let s=Y.nextNode(),i=0,a=0,o=r[0];for(;void 0!==o;){if(i===o.index){let e;2===o.type?e=new X(s,s.nextSibling,this,t):1===o.type?e=new o.ctor(s,o.name,o.strings,this,t):6===o.type&&(e=new st(s,this,t)),this._$AV.push(e),o=r[++a]}i!==o?.index&&(s=Y.nextNode(),i++)}return Y.currentNode=E,n}p(t){let e=0;for(const r of this._$AV)void 0!==r&&(void 0!==r.strings?(r._$AI(t,r,e),e+=r.strings.length-2):r._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,r,n){this.type=2,this._$AH=R,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=r,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),N(t)?t===R||null==t||""===t?(this._$AH!==R&&this._$AR(),this._$AH=R):t!==this._$AH&&t!==W&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>L(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==R&&N(this._$AH)?this._$AA.nextSibling.data=t:this.T(E.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:r}=t,n="number"==typeof r?this._$AC(t):(void 0===r.el&&(r.el=J.createElement(G(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===n)this._$AH.p(e);else{const t=new K(n,this),r=t.u(this.options);t.p(e),this.T(r),this._$AH=t}}_$AC(t){let e=q.get(t.strings);return void 0===e&&q.set(t.strings,e=new J(t)),e}k(t){L(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let r,n=0;for(const s of t)n===e.length?e.push(r=new X(this.O(M()),this.O(M()),this,this.options)):r=e[n],r._$AI(s),n++;n<e.length&&(this._$AR(r&&r._$AB.nextSibling,n),e.length=n)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,r,n,s){this.type=1,this._$AH=R,this._$AN=void 0,this.element=t,this.name=e,this._$AM=n,this.options=s,r.length>2||""!==r[0]||""!==r[1]?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=R}_$AI(t,e=this,r,n){const s=this.strings;let i=!1;if(void 0===s)t=Q(this,t,e,0),i=!N(t)||t!==this._$AH&&t!==W,i&&(this._$AH=t);else{const n=t;let a,o;for(t=s[0],a=0;a<s.length-1;a++)o=Q(this,n[r+a],e,a),o===W&&(o=this._$AH[a]),i||=!N(o)||o!==this._$AH[a],o===R?t=R:t!==R&&(t+=(o??"")+s[a+1]),this._$AH[a]=o}i&&!n&&this.j(t)}j(t){t===R?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===R?void 0:t}}class rt extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==R)}}class nt extends tt{constructor(t,e,r,n,s){super(t,e,r,n,s),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??R)===W)return;const r=this._$AH,n=t===R&&r!==R||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,s=t!==R&&(r===R||n);n&&this.element.removeEventListener(this.name,this,r),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class st{constructor(t,e,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const it=x.litHtmlPolyfillSupport;it?.(J,X),(x.litHtmlVersions??=[]).push("3.3.1");const at=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,r)=>{const n=r?.renderBefore??e;let s=n._$litPart$;if(void 0===s){const t=r?.renderBefore??null;n._$litPart$=s=new X(e.insertBefore(M(),t),t,void 0,r??{})}return s._$AI(t),s})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}}ot._$litElement$=!0,ot.finalized=!0,at.litElementHydrateSupport?.({LitElement:ot});const lt=at.litElementPolyfillSupport;lt?.({LitElement:ot}),(at.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ct=t=>(e,r)=>{void 0!==r?r.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},ut={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:_},dt=(t=ut,e,r)=>{const{kind:n,metadata:s}=r;let i=globalThis.litPropertyMetadata.get(s);if(void 0===i&&globalThis.litPropertyMetadata.set(s,i=new Map),"setter"===n&&((t=Object.create(t)).wrapped=!0),i.set(r.name,t),"accessor"===n){const{name:n}=r;return{set(r){const s=e.get.call(this);e.set.call(this,r),this.requestUpdate(n,s,t)},init(e){return void 0!==e&&this.C(n,void 0,t,e),e}}}if("setter"===n){const{name:n}=r;return function(r){const s=this[n];e.call(this,r),this.requestUpdate(n,s,t)}}throw Error("Unsupported decorator location: "+n)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ht(t){return(e,r)=>"object"==typeof r?dt(t,e,r):((t,e,r)=>{const n=e.hasOwnProperty(r);return e.constructor.createProperty(r,t),n?Object.getOwnPropertyDescriptor(e,r):void 0})(t,e,r)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function mt(t){return ht({...t,state:!0,attribute:!1})}var pt="M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z",gt="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",ft="M4,2H6V4C6,5.44 6.68,6.61 7.88,7.78C8.74,8.61 9.89,9.41 11.09,10.2L9.26,11.39C8.27,10.72 7.31,10 6.5,9.21C5.07,7.82 4,6.1 4,4V2M18,2H20V4C20,6.1 18.93,7.82 17.5,9.21C16.09,10.59 14.29,11.73 12.54,12.84C10.79,13.96 9.09,15.05 7.88,16.22C6.68,17.39 6,18.56 6,20V22H4V20C4,17.9 5.07,16.18 6.5,14.79C7.91,13.41 9.71,12.27 11.46,11.16C13.21,10.04 14.91,8.95 16.12,7.78C17.32,6.61 18,5.44 18,4V2M14.74,12.61C15.73,13.28 16.69,14 17.5,14.79C18.93,16.18 20,17.9 20,20V22H18V20C18,18.56 17.32,17.39 16.12,16.22C15.26,15.39 14.11,14.59 12.91,13.8L14.74,12.61M7,3H17V4L16.94,4.5H7.06L7,4V3M7.68,6H16.32C16.08,6.34 15.8,6.69 15.42,7.06L14.91,7.5H9.07L8.58,7.06C8.2,6.69 7.92,6.34 7.68,6M9.09,16.5H14.93L15.42,16.94C15.8,17.31 16.08,17.66 16.32,18H7.68C7.92,17.66 8.2,17.31 8.58,16.94L9.09,16.5M7.06,19.5H16.94L17,20V21H7V20L7.06,19.5Z",yt="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",vt="M22 9A4.32 4.32 0 0 1 19.78 8.45A3.4 3.4 0 0 0 18 8V7A4.32 4.32 0 0 1 20.22 7.55A3.4 3.4 0 0 0 22 8M22 6A3.4 3.4 0 0 1 20.22 5.55A4.32 4.32 0 0 0 18 5V6A3.4 3.4 0 0 1 19.78 6.45A4.32 4.32 0 0 0 22 7M22 10A3.4 3.4 0 0 1 20.22 9.55A4.32 4.32 0 0 0 18 9V10A3.4 3.4 0 0 1 19.78 10.45A4.32 4.32 0 0 0 22 11M10 12.73A70.39 70.39 0 0 0 17 11V4S10.5 2 7.5 2A5.5 5.5 0 0 0 6.12 12.82L7 19H8A3 3 0 0 0 9.46 21.33A3.15 3.15 0 0 1 11 24H12A4.12 4.12 0 0 0 10.09 20.55C9.39 20 9 19.63 9 19H10M7.5 10A2.5 2.5 0 1 1 10 7.5A2.5 2.5 0 0 1 7.5 10Z",wt="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",bt="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z";class _t extends Error{}class St extends _t{constructor(t){super(`Invalid DateTime: ${t.toMessage()}`)}}class $t extends _t{constructor(t){super(`Invalid Interval: ${t.toMessage()}`)}}class xt extends _t{constructor(t){super(`Invalid Duration: ${t.toMessage()}`)}}class kt extends _t{}class Dt extends _t{constructor(t){super(`Invalid unit ${t}`)}}class Ct extends _t{}class Ot extends _t{constructor(){super("Zone is an abstract class")}}const At="numeric",Tt="short",Et="long",Mt={year:At,month:At,day:At},Nt={year:At,month:Tt,day:At},Lt={year:At,month:Tt,day:At,weekday:Tt},Pt={year:At,month:Et,day:At},Vt={year:At,month:Et,day:At,weekday:Et},It={hour:At,minute:At},Ft={hour:At,minute:At,second:At},zt={hour:At,minute:At,second:At,timeZoneName:Tt},jt={hour:At,minute:At,second:At,timeZoneName:Et},Ht={hour:At,minute:At,hourCycle:"h23"},Ut={hour:At,minute:At,second:At,hourCycle:"h23"},Zt={hour:At,minute:At,second:At,hourCycle:"h23",timeZoneName:Tt},Wt={hour:At,minute:At,second:At,hourCycle:"h23",timeZoneName:Et},Rt={year:At,month:At,day:At,hour:At,minute:At},qt={year:At,month:At,day:At,hour:At,minute:At,second:At},Yt={year:At,month:Tt,day:At,hour:At,minute:At},Gt={year:At,month:Tt,day:At,hour:At,minute:At,second:At},Bt={year:At,month:Tt,day:At,weekday:Tt,hour:At,minute:At},Jt={year:At,month:Et,day:At,hour:At,minute:At,timeZoneName:Tt},Qt={year:At,month:Et,day:At,hour:At,minute:At,second:At,timeZoneName:Tt},Kt={year:At,month:Et,day:At,weekday:Et,hour:At,minute:At,timeZoneName:Et},Xt={year:At,month:Et,day:At,weekday:Et,hour:At,minute:At,second:At,timeZoneName:Et};class te{get type(){throw new Ot}get name(){throw new Ot}get ianaName(){return this.name}get isUniversal(){throw new Ot}offsetName(t,e){throw new Ot}formatOffset(t,e){throw new Ot}offset(t){throw new Ot}equals(t){throw new Ot}get isValid(){throw new Ot}}let ee=null;class re extends te{static get instance(){return null===ee&&(ee=new re),ee}get type(){return"system"}get name(){return(new Intl.DateTimeFormat).resolvedOptions().timeZone}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return Sr(t,e,r)}formatOffset(t,e){return Dr(this.offset(t),e)}offset(t){return-new Date(t).getTimezoneOffset()}equals(t){return"system"===t.type}get isValid(){return!0}}const ne=new Map;const se={year:0,month:1,day:2,era:3,hour:4,minute:5,second:6};const ie=new Map;class ae extends te{static create(t){let e=ie.get(t);return void 0===e&&ie.set(t,e=new ae(t)),e}static resetCache(){ie.clear(),ne.clear()}static isValidSpecifier(t){return this.isValidZone(t)}static isValidZone(t){if(!t)return!1;try{return new Intl.DateTimeFormat("en-US",{timeZone:t}).format(),!0}catch(t){return!1}}constructor(t){super(),this.zoneName=t,this.valid=ae.isValidZone(t)}get type(){return"iana"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return Sr(t,e,r,this.name)}formatOffset(t,e){return Dr(this.offset(t),e)}offset(t){if(!this.valid)return NaN;const e=new Date(t);if(isNaN(e))return NaN;const r=function(t){let e=ne.get(t);return void 0===e&&(e=new Intl.DateTimeFormat("en-US",{hour12:!1,timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",era:"short"}),ne.set(t,e)),e}(this.name);let[n,s,i,a,o,l,c]=r.formatToParts?function(t,e){const r=t.formatToParts(e),n=[];for(let t=0;t<r.length;t++){const{type:e,value:s}=r[t],i=se[e];"era"===e?n[i]=s:er(i)||(n[i]=parseInt(s,10))}return n}(r,e):function(t,e){const r=t.format(e).replace(/\u200E/g,""),n=/(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(r),[,s,i,a,o,l,c,u]=n;return[a,s,i,o,l,c,u]}(r,e);"BC"===a&&(n=1-Math.abs(n));let u=+e;const d=u%1e3;return u-=d>=0?d:1e3+d,(vr({year:n,month:s,day:i,hour:24===o?0:o,minute:l,second:c,millisecond:0})-u)/6e4}equals(t){return"iana"===t.type&&t.name===this.name}get isValid(){return this.valid}}let oe={};const le=new Map;function ce(t,e={}){const r=JSON.stringify([t,e]);let n=le.get(r);return void 0===n&&(n=new Intl.DateTimeFormat(t,e),le.set(r,n)),n}const ue=new Map;const de=new Map;let he=null;const me=new Map;function pe(t){let e=me.get(t);return void 0===e&&(e=new Intl.DateTimeFormat(t).resolvedOptions(),me.set(t,e)),e}const ge=new Map;function fe(t,e,r,n){const s=t.listingMode();return"error"===s?null:"en"===s?r(e):n(e)}class ye{constructor(t,e,r){this.padTo=r.padTo||0,this.floor=r.floor||!1;const{padTo:n,floor:s,...i}=r;if(!e||Object.keys(i).length>0){const e={useGrouping:!1,...r};r.padTo>0&&(e.minimumIntegerDigits=r.padTo),this.inf=function(t,e={}){const r=JSON.stringify([t,e]);let n=ue.get(r);return void 0===n&&(n=new Intl.NumberFormat(t,e),ue.set(r,n)),n}(t,e)}}format(t){if(this.inf){const e=this.floor?Math.floor(t):t;return this.inf.format(e)}return ur(this.floor?Math.floor(t):pr(t,3),this.padTo)}}class ve{constructor(t,e,r){let n;if(this.opts=r,this.originalZone=void 0,this.opts.timeZone)this.dt=t;else if("fixed"===t.zone.type){const e=t.offset/60*-1,r=e>=0?`Etc/GMT+${e}`:`Etc/GMT${e}`;0!==t.offset&&ae.create(r).valid?(n=r,this.dt=t):(n="UTC",this.dt=0===t.offset?t:t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone)}else"system"===t.zone.type?this.dt=t:"iana"===t.zone.type?(this.dt=t,n=t.zone.name):(n="UTC",this.dt=t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone);const s={...this.opts};s.timeZone=s.timeZone||n,this.dtf=ce(e,s)}format(){return this.originalZone?this.formatToParts().map(({value:t})=>t).join(""):this.dtf.format(this.dt.toJSDate())}formatToParts(){const t=this.dtf.formatToParts(this.dt.toJSDate());return this.originalZone?t.map(t=>{if("timeZoneName"===t.type){const e=this.originalZone.offsetName(this.dt.ts,{locale:this.dt.locale,format:this.opts.timeZoneName});return{...t,value:e}}return t}):t}resolvedOptions(){return this.dtf.resolvedOptions()}}class we{constructor(t,e,r){this.opts={style:"long",...r},!e&&sr()&&(this.rtf=function(t,e={}){const{base:r,...n}=e,s=JSON.stringify([t,n]);let i=de.get(s);return void 0===i&&(i=new Intl.RelativeTimeFormat(t,e),de.set(s,i)),i}(t,r))}format(t,e){return this.rtf?this.rtf.format(t,e):function(t,e,r="always",n=!1){const s={years:["year","yr."],quarters:["quarter","qtr."],months:["month","mo."],weeks:["week","wk."],days:["day","day","days"],hours:["hour","hr."],minutes:["minute","min."],seconds:["second","sec."]},i=-1===["hours","minutes","seconds"].indexOf(t);if("auto"===r&&i){const r="days"===t;switch(e){case 1:return r?"tomorrow":`next ${s[t][0]}`;case-1:return r?"yesterday":`last ${s[t][0]}`;case 0:return r?"today":`this ${s[t][0]}`}}const a=Object.is(e,-0)||e<0,o=Math.abs(e),l=1===o,c=s[t],u=n?l?c[1]:c[2]||c[1]:l?s[t][0]:t;return a?`${o} ${u} ago`:`in ${o} ${u}`}(e,t,this.opts.numeric,"long"!==this.opts.style)}formatToParts(t,e){return this.rtf?this.rtf.formatToParts(t,e):[]}}const be={firstDay:1,minimalDays:4,weekend:[6,7]};class _e{static fromOpts(t){return _e.create(t.locale,t.numberingSystem,t.outputCalendar,t.weekSettings,t.defaultToEN)}static create(t,e,r,n,s=!1){const i=t||ze.defaultLocale,a=i||(s?"en-US":he||(he=(new Intl.DateTimeFormat).resolvedOptions().locale,he)),o=e||ze.defaultNumberingSystem,l=r||ze.defaultOutputCalendar,c=lr(n)||ze.defaultWeekSettings;return new _e(a,o,l,c,i)}static resetCache(){he=null,le.clear(),ue.clear(),de.clear(),me.clear(),ge.clear()}static fromObject({locale:t,numberingSystem:e,outputCalendar:r,weekSettings:n}={}){return _e.create(t,e,r,n)}constructor(t,e,r,n,s){const[i,a,o]=function(t){const e=t.indexOf("-x-");-1!==e&&(t=t.substring(0,e));const r=t.indexOf("-u-");if(-1===r)return[t];{let e,n;try{e=ce(t).resolvedOptions(),n=t}catch(s){const i=t.substring(0,r);e=ce(i).resolvedOptions(),n=i}const{numberingSystem:s,calendar:i}=e;return[n,s,i]}}(t);this.locale=i,this.numberingSystem=e||a||null,this.outputCalendar=r||o||null,this.weekSettings=n,this.intl=function(t,e,r){return r||e?(t.includes("-u-")||(t+="-u"),r&&(t+=`-ca-${r}`),e&&(t+=`-nu-${e}`),t):t}(this.locale,this.numberingSystem,this.outputCalendar),this.weekdaysCache={format:{},standalone:{}},this.monthsCache={format:{},standalone:{}},this.meridiemCache=null,this.eraCache={},this.specifiedLocale=s,this.fastNumbersCached=null}get fastNumbers(){var t;return null==this.fastNumbersCached&&(this.fastNumbersCached=(!(t=this).numberingSystem||"latn"===t.numberingSystem)&&("latn"===t.numberingSystem||!t.locale||t.locale.startsWith("en")||"latn"===pe(t.locale).numberingSystem)),this.fastNumbersCached}listingMode(){const t=this.isEnglish(),e=!(null!==this.numberingSystem&&"latn"!==this.numberingSystem||null!==this.outputCalendar&&"gregory"!==this.outputCalendar);return t&&e?"en":"intl"}clone(t){return t&&0!==Object.getOwnPropertyNames(t).length?_e.create(t.locale||this.specifiedLocale,t.numberingSystem||this.numberingSystem,t.outputCalendar||this.outputCalendar,lr(t.weekSettings)||this.weekSettings,t.defaultToEN||!1):this}redefaultToEN(t={}){return this.clone({...t,defaultToEN:!0})}redefaultToSystem(t={}){return this.clone({...t,defaultToEN:!1})}months(t,e=!1){return fe(this,t,Er,()=>{const r="ja"===this.intl||this.intl.startsWith("ja-"),n=(e&=!r)?{month:t,day:"numeric"}:{month:t},s=e?"format":"standalone";if(!this.monthsCache[s][t]){const e=r?t=>this.dtFormatter(t,n).format():t=>this.extract(t,n,"month");this.monthsCache[s][t]=function(t){const e=[];for(let r=1;r<=12;r++){const n=Is.utc(2009,r,1);e.push(t(n))}return e}(e)}return this.monthsCache[s][t]})}weekdays(t,e=!1){return fe(this,t,Pr,()=>{const r=e?{weekday:t,year:"numeric",month:"long",day:"numeric"}:{weekday:t},n=e?"format":"standalone";return this.weekdaysCache[n][t]||(this.weekdaysCache[n][t]=function(t){const e=[];for(let r=1;r<=7;r++){const n=Is.utc(2016,11,13+r);e.push(t(n))}return e}(t=>this.extract(t,r,"weekday"))),this.weekdaysCache[n][t]})}meridiems(){return fe(this,void 0,()=>Vr,()=>{if(!this.meridiemCache){const t={hour:"numeric",hourCycle:"h12"};this.meridiemCache=[Is.utc(2016,11,13,9),Is.utc(2016,11,13,19)].map(e=>this.extract(e,t,"dayperiod"))}return this.meridiemCache})}eras(t){return fe(this,t,jr,()=>{const e={era:t};return this.eraCache[t]||(this.eraCache[t]=[Is.utc(-40,1,1),Is.utc(2017,1,1)].map(t=>this.extract(t,e,"era"))),this.eraCache[t]})}extract(t,e,r){const n=this.dtFormatter(t,e).formatToParts().find(t=>t.type.toLowerCase()===r);return n?n.value:null}numberFormatter(t={}){return new ye(this.intl,t.forceSimple||this.fastNumbers,t)}dtFormatter(t,e={}){return new ve(t,this.intl,e)}relFormatter(t={}){return new we(this.intl,this.isEnglish(),t)}listFormatter(t={}){return function(t,e={}){const r=JSON.stringify([t,e]);let n=oe[r];return n||(n=new Intl.ListFormat(t,e),oe[r]=n),n}(this.intl,t)}isEnglish(){return"en"===this.locale||"en-us"===this.locale.toLowerCase()||pe(this.intl).locale.startsWith("en-us")}getWeekSettings(){return this.weekSettings?this.weekSettings:ir()?function(t){let e=ge.get(t);if(!e){const r=new Intl.Locale(t);e="getWeekInfo"in r?r.getWeekInfo():r.weekInfo,"minimalDays"in e||(e={...be,...e}),ge.set(t,e)}return e}(this.locale):be}getStartOfWeek(){return this.getWeekSettings().firstDay}getMinDaysInFirstWeek(){return this.getWeekSettings().minimalDays}getWeekendDays(){return this.getWeekSettings().weekend}equals(t){return this.locale===t.locale&&this.numberingSystem===t.numberingSystem&&this.outputCalendar===t.outputCalendar}toString(){return`Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`}}let Se=null;class $e extends te{static get utcInstance(){return null===Se&&(Se=new $e(0)),Se}static instance(t){return 0===t?$e.utcInstance:new $e(t)}static parseSpecifier(t){if(t){const e=t.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);if(e)return new $e($r(e[1],e[2]))}return null}constructor(t){super(),this.fixed=t}get type(){return"fixed"}get name(){return 0===this.fixed?"UTC":`UTC${Dr(this.fixed,"narrow")}`}get ianaName(){return 0===this.fixed?"Etc/UTC":`Etc/GMT${Dr(-this.fixed,"narrow")}`}offsetName(){return this.name}formatOffset(t,e){return Dr(this.fixed,e)}get isUniversal(){return!0}offset(){return this.fixed}equals(t){return"fixed"===t.type&&t.fixed===this.fixed}get isValid(){return!0}}class xe extends te{constructor(t){super(),this.zoneName=t}get type(){return"invalid"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(){return null}formatOffset(){return""}offset(){return NaN}equals(){return!1}get isValid(){return!1}}function ke(t,e){if(er(t)||null===t)return e;if(t instanceof te)return t;if(function(t){return"string"==typeof t}(t)){const r=t.toLowerCase();return"default"===r?e:"local"===r||"system"===r?re.instance:"utc"===r||"gmt"===r?$e.utcInstance:$e.parseSpecifier(r)||ae.create(t)}return rr(t)?$e.instance(t):"object"==typeof t&&"offset"in t&&"function"==typeof t.offset?t:new xe(t)}const De={arab:"[٠-٩]",arabext:"[۰-۹]",bali:"[᭐-᭙]",beng:"[০-৯]",deva:"[०-९]",fullwide:"[０-９]",gujr:"[૦-૯]",hanidec:"[〇|一|二|三|四|五|六|七|八|九]",khmr:"[០-៩]",knda:"[೦-೯]",laoo:"[໐-໙]",limb:"[᥆-᥏]",mlym:"[൦-൯]",mong:"[᠐-᠙]",mymr:"[၀-၉]",orya:"[୦-୯]",tamldec:"[௦-௯]",telu:"[౦-౯]",thai:"[๐-๙]",tibt:"[༠-༩]",latn:"\\d"},Ce={arab:[1632,1641],arabext:[1776,1785],bali:[6992,7001],beng:[2534,2543],deva:[2406,2415],fullwide:[65296,65303],gujr:[2790,2799],khmr:[6112,6121],knda:[3302,3311],laoo:[3792,3801],limb:[6470,6479],mlym:[3430,3439],mong:[6160,6169],mymr:[4160,4169],orya:[2918,2927],tamldec:[3046,3055],telu:[3174,3183],thai:[3664,3673],tibt:[3872,3881]},Oe=De.hanidec.replace(/[\[|\]]/g,"").split("");const Ae=new Map;function Te({numberingSystem:t},e=""){const r=t||"latn";let n=Ae.get(r);void 0===n&&(n=new Map,Ae.set(r,n));let s=n.get(e);return void 0===s&&(s=new RegExp(`${De[r]}${e}`),n.set(e,s)),s}let Ee,Me=()=>Date.now(),Ne="system",Le=null,Pe=null,Ve=null,Ie=60,Fe=null;class ze{static get now(){return Me}static set now(t){Me=t}static set defaultZone(t){Ne=t}static get defaultZone(){return ke(Ne,re.instance)}static get defaultLocale(){return Le}static set defaultLocale(t){Le=t}static get defaultNumberingSystem(){return Pe}static set defaultNumberingSystem(t){Pe=t}static get defaultOutputCalendar(){return Ve}static set defaultOutputCalendar(t){Ve=t}static get defaultWeekSettings(){return Fe}static set defaultWeekSettings(t){Fe=lr(t)}static get twoDigitCutoffYear(){return Ie}static set twoDigitCutoffYear(t){Ie=t%100}static get throwOnInvalid(){return Ee}static set throwOnInvalid(t){Ee=t}static resetCaches(){_e.resetCache(),ae.resetCache(),Is.resetCache(),Ae.clear()}}class je{constructor(t,e){this.reason=t,this.explanation=e}toMessage(){return this.explanation?`${this.reason}: ${this.explanation}`:this.reason}}const He=[0,31,59,90,120,151,181,212,243,273,304,334],Ue=[0,31,60,91,121,152,182,213,244,274,305,335];function Ze(t,e){return new je("unit out of range",`you specified ${e} (of type ${typeof e}) as a ${t}, which is invalid`)}function We(t,e,r){const n=new Date(Date.UTC(t,e-1,r));t<100&&t>=0&&n.setUTCFullYear(n.getUTCFullYear()-1900);const s=n.getUTCDay();return 0===s?7:s}function Re(t,e,r){return r+(gr(t)?Ue:He)[e-1]}function qe(t,e){const r=gr(t)?Ue:He,n=r.findIndex(t=>t<e);return{month:n+1,day:e-r[n]}}function Ye(t,e){return(t-e+7)%7+1}function Ge(t,e=4,r=1){const{year:n,month:s,day:i}=t,a=Re(n,s,i),o=Ye(We(n,s,i),r);let l,c=Math.floor((a-o+14-e)/7);return c<1?(l=n-1,c=br(l,e,r)):c>br(n,e,r)?(l=n+1,c=1):l=n,{weekYear:l,weekNumber:c,weekday:o,...Cr(t)}}function Be(t,e=4,r=1){const{weekYear:n,weekNumber:s,weekday:i}=t,a=Ye(We(n,1,e),r),o=fr(n);let l,c=7*s+i-a-7+e;c<1?(l=n-1,c+=fr(l)):c>o?(l=n+1,c-=fr(n)):l=n;const{month:u,day:d}=qe(l,c);return{year:l,month:u,day:d,...Cr(t)}}function Je(t){const{year:e,month:r,day:n}=t;return{year:e,ordinal:Re(e,r,n),...Cr(t)}}function Qe(t){const{year:e,ordinal:r}=t,{month:n,day:s}=qe(e,r);return{year:e,month:n,day:s,...Cr(t)}}function Ke(t,e){if(!er(t.localWeekday)||!er(t.localWeekNumber)||!er(t.localWeekYear)){if(!er(t.weekday)||!er(t.weekNumber)||!er(t.weekYear))throw new kt("Cannot mix locale-based week fields with ISO-based week fields");return er(t.localWeekday)||(t.weekday=t.localWeekday),er(t.localWeekNumber)||(t.weekNumber=t.localWeekNumber),er(t.localWeekYear)||(t.weekYear=t.localWeekYear),delete t.localWeekday,delete t.localWeekNumber,delete t.localWeekYear,{minDaysInFirstWeek:e.getMinDaysInFirstWeek(),startOfWeek:e.getStartOfWeek()}}return{minDaysInFirstWeek:4,startOfWeek:1}}function Xe(t){const e=nr(t.year),r=cr(t.month,1,12),n=cr(t.day,1,yr(t.year,t.month));return e?r?!n&&Ze("day",t.day):Ze("month",t.month):Ze("year",t.year)}function tr(t){const{hour:e,minute:r,second:n,millisecond:s}=t,i=cr(e,0,23)||24===e&&0===r&&0===n&&0===s,a=cr(r,0,59),o=cr(n,0,59),l=cr(s,0,999);return i?a?o?!l&&Ze("millisecond",s):Ze("second",n):Ze("minute",r):Ze("hour",e)}function er(t){return void 0===t}function rr(t){return"number"==typeof t}function nr(t){return"number"==typeof t&&t%1==0}function sr(){try{return"undefined"!=typeof Intl&&!!Intl.RelativeTimeFormat}catch(t){return!1}}function ir(){try{return"undefined"!=typeof Intl&&!!Intl.Locale&&("weekInfo"in Intl.Locale.prototype||"getWeekInfo"in Intl.Locale.prototype)}catch(t){return!1}}function ar(t,e,r){if(0!==t.length)return t.reduce((t,n)=>{const s=[e(n),n];return t&&r(t[0],s[0])===t[0]?t:s},null)[1]}function or(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function lr(t){if(null==t)return null;if("object"!=typeof t)throw new Ct("Week settings must be an object");if(!cr(t.firstDay,1,7)||!cr(t.minimalDays,1,7)||!Array.isArray(t.weekend)||t.weekend.some(t=>!cr(t,1,7)))throw new Ct("Invalid week settings");return{firstDay:t.firstDay,minimalDays:t.minimalDays,weekend:Array.from(t.weekend)}}function cr(t,e,r){return nr(t)&&t>=e&&t<=r}function ur(t,e=2){let r;return r=t<0?"-"+(""+-t).padStart(e,"0"):(""+t).padStart(e,"0"),r}function dr(t){return er(t)||null===t||""===t?void 0:parseInt(t,10)}function hr(t){return er(t)||null===t||""===t?void 0:parseFloat(t)}function mr(t){if(!er(t)&&null!==t&&""!==t){const e=1e3*parseFloat("0."+t);return Math.floor(e)}}function pr(t,e,r="round"){const n=10**e;switch(r){case"expand":return t>0?Math.ceil(t*n)/n:Math.floor(t*n)/n;case"trunc":return Math.trunc(t*n)/n;case"round":return Math.round(t*n)/n;case"floor":return Math.floor(t*n)/n;case"ceil":return Math.ceil(t*n)/n;default:throw new RangeError(`Value rounding ${r} is out of range`)}}function gr(t){return t%4==0&&(t%100!=0||t%400==0)}function fr(t){return gr(t)?366:365}function yr(t,e){const r=function(t,e){return t-e*Math.floor(t/e)}(e-1,12)+1;return 2===r?gr(t+(e-r)/12)?29:28:[31,null,31,30,31,30,31,31,30,31,30,31][r-1]}function vr(t){let e=Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second,t.millisecond);return t.year<100&&t.year>=0&&(e=new Date(e),e.setUTCFullYear(t.year,t.month-1,t.day)),+e}function wr(t,e,r){return-Ye(We(t,1,e),r)+e-1}function br(t,e=4,r=1){const n=wr(t,e,r),s=wr(t+1,e,r);return(fr(t)-n+s)/7}function _r(t){return t>99?t:t>ze.twoDigitCutoffYear?1900+t:2e3+t}function Sr(t,e,r,n=null){const s=new Date(t),i={hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"};n&&(i.timeZone=n);const a={timeZoneName:e,...i},o=new Intl.DateTimeFormat(r,a).formatToParts(s).find(t=>"timezonename"===t.type.toLowerCase());return o?o.value:null}function $r(t,e){let r=parseInt(t,10);Number.isNaN(r)&&(r=0);const n=parseInt(e,10)||0;return 60*r+(r<0||Object.is(r,-0)?-n:n)}function xr(t){const e=Number(t);if("boolean"==typeof t||""===t||!Number.isFinite(e))throw new Ct(`Invalid unit value ${t}`);return e}function kr(t,e){const r={};for(const n in t)if(or(t,n)){const s=t[n];if(null==s)continue;r[e(n)]=xr(s)}return r}function Dr(t,e){const r=Math.trunc(Math.abs(t/60)),n=Math.trunc(Math.abs(t%60)),s=t>=0?"+":"-";switch(e){case"short":return`${s}${ur(r,2)}:${ur(n,2)}`;case"narrow":return`${s}${r}${n>0?`:${n}`:""}`;case"techie":return`${s}${ur(r,2)}${ur(n,2)}`;default:throw new RangeError(`Value format ${e} is out of range for property format`)}}function Cr(t){return function(t,e){return e.reduce((e,r)=>(e[r]=t[r],e),{})}(t,["hour","minute","second","millisecond"])}const Or=["January","February","March","April","May","June","July","August","September","October","November","December"],Ar=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],Tr=["J","F","M","A","M","J","J","A","S","O","N","D"];function Er(t){switch(t){case"narrow":return[...Tr];case"short":return[...Ar];case"long":return[...Or];case"numeric":return["1","2","3","4","5","6","7","8","9","10","11","12"];case"2-digit":return["01","02","03","04","05","06","07","08","09","10","11","12"];default:return null}}const Mr=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],Nr=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],Lr=["M","T","W","T","F","S","S"];function Pr(t){switch(t){case"narrow":return[...Lr];case"short":return[...Nr];case"long":return[...Mr];case"numeric":return["1","2","3","4","5","6","7"];default:return null}}const Vr=["AM","PM"],Ir=["Before Christ","Anno Domini"],Fr=["BC","AD"],zr=["B","A"];function jr(t){switch(t){case"narrow":return[...zr];case"short":return[...Fr];case"long":return[...Ir];default:return null}}function Hr(t,e){let r="";for(const n of t)n.literal?r+=n.val:r+=e(n.val);return r}const Ur={D:Mt,DD:Nt,DDD:Pt,DDDD:Vt,t:It,tt:Ft,ttt:zt,tttt:jt,T:Ht,TT:Ut,TTT:Zt,TTTT:Wt,f:Rt,ff:Yt,fff:Jt,ffff:Kt,F:qt,FF:Gt,FFF:Qt,FFFF:Xt};class Zr{static create(t,e={}){return new Zr(t,e)}static parseFormat(t){let e=null,r="",n=!1;const s=[];for(let i=0;i<t.length;i++){const a=t.charAt(i);"'"===a?((r.length>0||n)&&s.push({literal:n||/^\s+$/.test(r),val:""===r?"'":r}),e=null,r="",n=!n):n||a===e?r+=a:(r.length>0&&s.push({literal:/^\s+$/.test(r),val:r}),r=a,e=a)}return r.length>0&&s.push({literal:n||/^\s+$/.test(r),val:r}),s}static macroTokenToFormatOpts(t){return Ur[t]}constructor(t,e){this.opts=e,this.loc=t,this.systemLoc=null}formatWithSystemDefault(t,e){null===this.systemLoc&&(this.systemLoc=this.loc.redefaultToSystem());return this.systemLoc.dtFormatter(t,{...this.opts,...e}).format()}dtFormatter(t,e={}){return this.loc.dtFormatter(t,{...this.opts,...e})}formatDateTime(t,e){return this.dtFormatter(t,e).format()}formatDateTimeParts(t,e){return this.dtFormatter(t,e).formatToParts()}formatInterval(t,e){return this.dtFormatter(t.start,e).dtf.formatRange(t.start.toJSDate(),t.end.toJSDate())}resolvedOptions(t,e){return this.dtFormatter(t,e).resolvedOptions()}num(t,e=0,r=void 0){if(this.opts.forceSimple)return ur(t,e);const n={...this.opts};return e>0&&(n.padTo=e),r&&(n.signDisplay=r),this.loc.numberFormatter(n).format(t)}formatDateTimeFromString(t,e){const r="en"===this.loc.listingMode(),n=this.loc.outputCalendar&&"gregory"!==this.loc.outputCalendar,s=(e,r)=>this.loc.extract(t,e,r),i=e=>t.isOffsetFixed&&0===t.offset&&e.allowZ?"Z":t.isValid?t.zone.formatOffset(t.ts,e.format):"",a=()=>r?function(t){return Vr[t.hour<12?0:1]}(t):s({hour:"numeric",hourCycle:"h12"},"dayperiod"),o=(e,n)=>r?function(t,e){return Er(e)[t.month-1]}(t,e):s(n?{month:e}:{month:e,day:"numeric"},"month"),l=(e,n)=>r?function(t,e){return Pr(e)[t.weekday-1]}(t,e):s(n?{weekday:e}:{weekday:e,month:"long",day:"numeric"},"weekday"),c=e=>{const r=Zr.macroTokenToFormatOpts(e);return r?this.formatWithSystemDefault(t,r):e},u=e=>r?function(t,e){return jr(e)[t.year<0?0:1]}(t,e):s({era:e},"era");return Hr(Zr.parseFormat(e),e=>{switch(e){case"S":return this.num(t.millisecond);case"u":case"SSS":return this.num(t.millisecond,3);case"s":return this.num(t.second);case"ss":return this.num(t.second,2);case"uu":return this.num(Math.floor(t.millisecond/10),2);case"uuu":return this.num(Math.floor(t.millisecond/100));case"m":return this.num(t.minute);case"mm":return this.num(t.minute,2);case"h":return this.num(t.hour%12==0?12:t.hour%12);case"hh":return this.num(t.hour%12==0?12:t.hour%12,2);case"H":return this.num(t.hour);case"HH":return this.num(t.hour,2);case"Z":return i({format:"narrow",allowZ:this.opts.allowZ});case"ZZ":return i({format:"short",allowZ:this.opts.allowZ});case"ZZZ":return i({format:"techie",allowZ:this.opts.allowZ});case"ZZZZ":return t.zone.offsetName(t.ts,{format:"short",locale:this.loc.locale});case"ZZZZZ":return t.zone.offsetName(t.ts,{format:"long",locale:this.loc.locale});case"z":return t.zoneName;case"a":return a();case"d":return n?s({day:"numeric"},"day"):this.num(t.day);case"dd":return n?s({day:"2-digit"},"day"):this.num(t.day,2);case"c":case"E":return this.num(t.weekday);case"ccc":return l("short",!0);case"cccc":return l("long",!0);case"ccccc":return l("narrow",!0);case"EEE":return l("short",!1);case"EEEE":return l("long",!1);case"EEEEE":return l("narrow",!1);case"L":return n?s({month:"numeric",day:"numeric"},"month"):this.num(t.month);case"LL":return n?s({month:"2-digit",day:"numeric"},"month"):this.num(t.month,2);case"LLL":return o("short",!0);case"LLLL":return o("long",!0);case"LLLLL":return o("narrow",!0);case"M":return n?s({month:"numeric"},"month"):this.num(t.month);case"MM":return n?s({month:"2-digit"},"month"):this.num(t.month,2);case"MMM":return o("short",!1);case"MMMM":return o("long",!1);case"MMMMM":return o("narrow",!1);case"y":return n?s({year:"numeric"},"year"):this.num(t.year);case"yy":return n?s({year:"2-digit"},"year"):this.num(t.year.toString().slice(-2),2);case"yyyy":return n?s({year:"numeric"},"year"):this.num(t.year,4);case"yyyyyy":return n?s({year:"numeric"},"year"):this.num(t.year,6);case"G":return u("short");case"GG":return u("long");case"GGGGG":return u("narrow");case"kk":return this.num(t.weekYear.toString().slice(-2),2);case"kkkk":return this.num(t.weekYear,4);case"W":return this.num(t.weekNumber);case"WW":return this.num(t.weekNumber,2);case"n":return this.num(t.localWeekNumber);case"nn":return this.num(t.localWeekNumber,2);case"ii":return this.num(t.localWeekYear.toString().slice(-2),2);case"iiii":return this.num(t.localWeekYear,4);case"o":return this.num(t.ordinal);case"ooo":return this.num(t.ordinal,3);case"q":return this.num(t.quarter);case"qq":return this.num(t.quarter,2);case"X":return this.num(Math.floor(t.ts/1e3));case"x":return this.num(t.ts);default:return c(e)}})}formatDurationFromString(t,e){const r="negativeLargestOnly"===this.opts.signMode?-1:1,n=t=>{switch(t[0]){case"S":return"milliseconds";case"s":return"seconds";case"m":return"minutes";case"h":return"hours";case"d":return"days";case"w":return"weeks";case"M":return"months";case"y":return"years";default:return null}},s=Zr.parseFormat(e),i=s.reduce((t,{literal:e,val:r})=>e?t:t.concat(r),[]),a=t.shiftTo(...i.map(n).filter(t=>t));return Hr(s,((t,e)=>s=>{const i=n(s);if(i){const n=e.isNegativeDuration&&i!==e.largestUnit?r:1;let a;return a="negativeLargestOnly"===this.opts.signMode&&i!==e.largestUnit?"never":"all"===this.opts.signMode?"always":"auto",this.num(t.get(i)*n,s.length,a)}return s})(a,{isNegativeDuration:a<0,largestUnit:Object.keys(a.values)[0]}))}}const Wr=/[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;function Rr(...t){const e=t.reduce((t,e)=>t+e.source,"");return RegExp(`^${e}$`)}function qr(...t){return e=>t.reduce(([t,r,n],s)=>{const[i,a,o]=s(e,n);return[{...t,...i},a||r,o]},[{},null,1]).slice(0,2)}function Yr(t,...e){if(null==t)return[null,null];for(const[r,n]of e){const e=r.exec(t);if(e)return n(e)}return[null,null]}function Gr(...t){return(e,r)=>{const n={};let s;for(s=0;s<t.length;s++)n[t[s]]=dr(e[r+s]);return[n,null,r+s]}}const Br=/(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/,Jr=/(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/,Qr=RegExp(`${Jr.source}${`(?:${Br.source}?(?:\\[(${Wr.source})\\])?)?`}`),Kr=RegExp(`(?:[Tt]${Qr.source})?`),Xr=Gr("weekYear","weekNumber","weekDay"),tn=Gr("year","ordinal"),en=RegExp(`${Jr.source} ?(?:${Br.source}|(${Wr.source}))?`),rn=RegExp(`(?: ${en.source})?`);function nn(t,e,r){const n=t[e];return er(n)?r:dr(n)}function sn(t,e){return[{hours:nn(t,e,0),minutes:nn(t,e+1,0),seconds:nn(t,e+2,0),milliseconds:mr(t[e+3])},null,e+4]}function an(t,e){const r=!t[e]&&!t[e+1],n=$r(t[e+1],t[e+2]);return[{},r?null:$e.instance(n),e+3]}function on(t,e){return[{},t[e]?ae.create(t[e]):null,e+1]}const ln=RegExp(`^T?${Jr.source}$`),cn=/^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;function un(t){const[e,r,n,s,i,a,o,l,c]=t,u="-"===e[0],d=l&&"-"===l[0],h=(t,e=!1)=>void 0!==t&&(e||t&&u)?-t:t;return[{years:h(hr(r)),months:h(hr(n)),weeks:h(hr(s)),days:h(hr(i)),hours:h(hr(a)),minutes:h(hr(o)),seconds:h(hr(l),"-0"===l),milliseconds:h(mr(c),d)}]}const dn={GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function hn(t,e,r,n,s,i,a){const o={year:2===e.length?_r(dr(e)):dr(e),month:Ar.indexOf(r)+1,day:dr(n),hour:dr(s),minute:dr(i)};return a&&(o.second=dr(a)),t&&(o.weekday=t.length>3?Mr.indexOf(t)+1:Nr.indexOf(t)+1),o}const mn=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;function pn(t){const[,e,r,n,s,i,a,o,l,c,u,d]=t,h=hn(e,s,n,r,i,a,o);let m;return m=l?dn[l]:c?0:$r(u,d),[h,new $e(m)]}const gn=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,fn=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,yn=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;function vn(t){const[,e,r,n,s,i,a,o]=t;return[hn(e,s,n,r,i,a,o),$e.utcInstance]}function wn(t){const[,e,r,n,s,i,a,o]=t;return[hn(e,o,r,n,s,i,a),$e.utcInstance]}const bn=Rr(/([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,Kr),_n=Rr(/(\d{4})-?W(\d\d)(?:-?(\d))?/,Kr),Sn=Rr(/(\d{4})-?(\d{3})/,Kr),$n=Rr(Qr),xn=qr(function(t,e){return[{year:nn(t,e),month:nn(t,e+1,1),day:nn(t,e+2,1)},null,e+3]},sn,an,on),kn=qr(Xr,sn,an,on),Dn=qr(tn,sn,an,on),Cn=qr(sn,an,on);const On=qr(sn);const An=Rr(/(\d{4})-(\d\d)-(\d\d)/,rn),Tn=Rr(en),En=qr(sn,an,on);const Mn="Invalid Duration",Nn={weeks:{days:7,hours:168,minutes:10080,seconds:604800,milliseconds:6048e5},days:{hours:24,minutes:1440,seconds:86400,milliseconds:864e5},hours:{minutes:60,seconds:3600,milliseconds:36e5},minutes:{seconds:60,milliseconds:6e4},seconds:{milliseconds:1e3}},Ln={years:{quarters:4,months:12,weeks:52,days:365,hours:8760,minutes:525600,seconds:31536e3,milliseconds:31536e6},quarters:{months:3,weeks:13,days:91,hours:2184,minutes:131040,seconds:7862400,milliseconds:78624e5},months:{weeks:4,days:30,hours:720,minutes:43200,seconds:2592e3,milliseconds:2592e6},...Nn},Pn=365.2425,Vn=30.436875,In={years:{quarters:4,months:12,weeks:52.1775,days:Pn,hours:8765.82,minutes:525949.2,seconds:525949.2*60,milliseconds:525949.2*60*1e3},quarters:{months:3,weeks:13.044375,days:91.310625,hours:2191.455,minutes:131487.3,seconds:525949.2*60/4,milliseconds:7889237999.999999},months:{weeks:4.3481250000000005,days:Vn,hours:730.485,minutes:43829.1,seconds:2629746,milliseconds:2629746e3},...Nn},Fn=["years","quarters","months","weeks","days","hours","minutes","seconds","milliseconds"],zn=Fn.slice(0).reverse();function jn(t,e,r=!1){const n={values:r?e.values:{...t.values,...e.values||{}},loc:t.loc.clone(e.loc),conversionAccuracy:e.conversionAccuracy||t.conversionAccuracy,matrix:e.matrix||t.matrix};return new Wn(n)}function Hn(t,e){let r=e.milliseconds??0;for(const n of zn.slice(1))e[n]&&(r+=e[n]*t[n].milliseconds);return r}function Un(t,e){const r=Hn(t,e)<0?-1:1;Fn.reduceRight((n,s)=>{if(er(e[s]))return n;if(n){const i=e[n]*r,a=t[s][n],o=Math.floor(i/a);e[s]+=o*r,e[n]-=o*a*r}return s},null),Fn.reduce((r,n)=>{if(er(e[n]))return r;if(r){const s=e[r]%1;e[r]-=s,e[n]+=s*t[r][n]}return n},null)}function Zn(t){const e={};for(const[r,n]of Object.entries(t))0!==n&&(e[r]=n);return e}class Wn{constructor(t){const e="longterm"===t.conversionAccuracy||!1;let r=e?In:Ln;t.matrix&&(r=t.matrix),this.values=t.values,this.loc=t.loc||_e.create(),this.conversionAccuracy=e?"longterm":"casual",this.invalid=t.invalid||null,this.matrix=r,this.isLuxonDuration=!0}static fromMillis(t,e){return Wn.fromObject({milliseconds:t},e)}static fromObject(t,e={}){if(null==t||"object"!=typeof t)throw new Ct("Duration.fromObject: argument expected to be an object, got "+(null===t?"null":typeof t));return new Wn({values:kr(t,Wn.normalizeUnit),loc:_e.fromObject(e),conversionAccuracy:e.conversionAccuracy,matrix:e.matrix})}static fromDurationLike(t){if(rr(t))return Wn.fromMillis(t);if(Wn.isDuration(t))return t;if("object"==typeof t)return Wn.fromObject(t);throw new Ct(`Unknown duration argument ${t} of type ${typeof t}`)}static fromISO(t,e){const[r]=function(t){return Yr(t,[cn,un])}(t);return r?Wn.fromObject(r,e):Wn.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static fromISOTime(t,e){const[r]=function(t){return Yr(t,[ln,On])}(t);return r?Wn.fromObject(r,e):Wn.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static invalid(t,e=null){if(!t)throw new Ct("need to specify a reason the Duration is invalid");const r=t instanceof je?t:new je(t,e);if(ze.throwOnInvalid)throw new xt(r);return new Wn({invalid:r})}static normalizeUnit(t){const e={year:"years",years:"years",quarter:"quarters",quarters:"quarters",month:"months",months:"months",week:"weeks",weeks:"weeks",day:"days",days:"days",hour:"hours",hours:"hours",minute:"minutes",minutes:"minutes",second:"seconds",seconds:"seconds",millisecond:"milliseconds",milliseconds:"milliseconds"}[t?t.toLowerCase():t];if(!e)throw new Dt(t);return e}static isDuration(t){return t&&t.isLuxonDuration||!1}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}toFormat(t,e={}){const r={...e,floor:!1!==e.round&&!1!==e.floor};return this.isValid?Zr.create(this.loc,r).formatDurationFromString(this,t):Mn}toHuman(t={}){if(!this.isValid)return Mn;const e=!1!==t.showZeros,r=Fn.map(r=>{const n=this.values[r];return er(n)||0===n&&!e?null:this.loc.numberFormatter({style:"unit",unitDisplay:"long",...t,unit:r.slice(0,-1)}).format(n)}).filter(t=>t);return this.loc.listFormatter({type:"conjunction",style:t.listStyle||"narrow",...t}).format(r)}toObject(){return this.isValid?{...this.values}:{}}toISO(){if(!this.isValid)return null;let t="P";return 0!==this.years&&(t+=this.years+"Y"),0===this.months&&0===this.quarters||(t+=this.months+3*this.quarters+"M"),0!==this.weeks&&(t+=this.weeks+"W"),0!==this.days&&(t+=this.days+"D"),0===this.hours&&0===this.minutes&&0===this.seconds&&0===this.milliseconds||(t+="T"),0!==this.hours&&(t+=this.hours+"H"),0!==this.minutes&&(t+=this.minutes+"M"),0===this.seconds&&0===this.milliseconds||(t+=pr(this.seconds+this.milliseconds/1e3,3)+"S"),"P"===t&&(t+="T0S"),t}toISOTime(t={}){if(!this.isValid)return null;const e=this.toMillis();if(e<0||e>=864e5)return null;t={suppressMilliseconds:!1,suppressSeconds:!1,includePrefix:!1,format:"extended",...t,includeOffset:!1};return Is.fromMillis(e,{zone:"UTC"}).toISOTime(t)}toJSON(){return this.toISO()}toString(){return this.toISO()}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Duration { values: ${JSON.stringify(this.values)} }`:`Duration { Invalid, reason: ${this.invalidReason} }`}toMillis(){return this.isValid?Hn(this.matrix,this.values):NaN}valueOf(){return this.toMillis()}plus(t){if(!this.isValid)return this;const e=Wn.fromDurationLike(t),r={};for(const t of Fn)(or(e.values,t)||or(this.values,t))&&(r[t]=e.get(t)+this.get(t));return jn(this,{values:r},!0)}minus(t){if(!this.isValid)return this;const e=Wn.fromDurationLike(t);return this.plus(e.negate())}mapUnits(t){if(!this.isValid)return this;const e={};for(const r of Object.keys(this.values))e[r]=xr(t(this.values[r],r));return jn(this,{values:e},!0)}get(t){return this[Wn.normalizeUnit(t)]}set(t){if(!this.isValid)return this;return jn(this,{values:{...this.values,...kr(t,Wn.normalizeUnit)}})}reconfigure({locale:t,numberingSystem:e,conversionAccuracy:r,matrix:n}={}){return jn(this,{loc:this.loc.clone({locale:t,numberingSystem:e}),matrix:n,conversionAccuracy:r})}as(t){return this.isValid?this.shiftTo(t).get(t):NaN}normalize(){if(!this.isValid)return this;const t=this.toObject();return Un(this.matrix,t),jn(this,{values:t},!0)}rescale(){if(!this.isValid)return this;return jn(this,{values:Zn(this.normalize().shiftToAll().toObject())},!0)}shiftTo(...t){if(!this.isValid)return this;if(0===t.length)return this;t=t.map(t=>Wn.normalizeUnit(t));const e={},r={},n=this.toObject();let s;for(const i of Fn)if(t.indexOf(i)>=0){s=i;let t=0;for(const e in r)t+=this.matrix[e][i]*r[e],r[e]=0;rr(n[i])&&(t+=n[i]);const a=Math.trunc(t);e[i]=a,r[i]=(1e3*t-1e3*a)/1e3}else rr(n[i])&&(r[i]=n[i]);for(const t in r)0!==r[t]&&(e[s]+=t===s?r[t]:r[t]/this.matrix[s][t]);return Un(this.matrix,e),jn(this,{values:e},!0)}shiftToAll(){return this.isValid?this.shiftTo("years","months","weeks","days","hours","minutes","seconds","milliseconds"):this}negate(){if(!this.isValid)return this;const t={};for(const e of Object.keys(this.values))t[e]=0===this.values[e]?0:-this.values[e];return jn(this,{values:t},!0)}removeZeros(){if(!this.isValid)return this;return jn(this,{values:Zn(this.values)},!0)}get years(){return this.isValid?this.values.years||0:NaN}get quarters(){return this.isValid?this.values.quarters||0:NaN}get months(){return this.isValid?this.values.months||0:NaN}get weeks(){return this.isValid?this.values.weeks||0:NaN}get days(){return this.isValid?this.values.days||0:NaN}get hours(){return this.isValid?this.values.hours||0:NaN}get minutes(){return this.isValid?this.values.minutes||0:NaN}get seconds(){return this.isValid?this.values.seconds||0:NaN}get milliseconds(){return this.isValid?this.values.milliseconds||0:NaN}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}equals(t){if(!this.isValid||!t.isValid)return!1;if(!this.loc.equals(t.loc))return!1;function e(t,e){return void 0===t||0===t?void 0===e||0===e:t===e}for(const r of Fn)if(!e(this.values[r],t.values[r]))return!1;return!0}}const Rn="Invalid Interval";class qn{constructor(t){this.s=t.start,this.e=t.end,this.invalid=t.invalid||null,this.isLuxonInterval=!0}static invalid(t,e=null){if(!t)throw new Ct("need to specify a reason the Interval is invalid");const r=t instanceof je?t:new je(t,e);if(ze.throwOnInvalid)throw new $t(r);return new qn({invalid:r})}static fromDateTimes(t,e){const r=Fs(t),n=Fs(e),s=function(t,e){return t&&t.isValid?e&&e.isValid?e<t?qn.invalid("end before start",`The end of an interval must be after its start, but you had start=${t.toISO()} and end=${e.toISO()}`):null:qn.invalid("missing or invalid end"):qn.invalid("missing or invalid start")}(r,n);return null==s?new qn({start:r,end:n}):s}static after(t,e){const r=Wn.fromDurationLike(e),n=Fs(t);return qn.fromDateTimes(n,n.plus(r))}static before(t,e){const r=Wn.fromDurationLike(e),n=Fs(t);return qn.fromDateTimes(n.minus(r),n)}static fromISO(t,e){const[r,n]=(t||"").split("/",2);if(r&&n){let t,s,i,a;try{t=Is.fromISO(r,e),s=t.isValid}catch(n){s=!1}try{i=Is.fromISO(n,e),a=i.isValid}catch(n){a=!1}if(s&&a)return qn.fromDateTimes(t,i);if(s){const r=Wn.fromISO(n,e);if(r.isValid)return qn.after(t,r)}else if(a){const t=Wn.fromISO(r,e);if(t.isValid)return qn.before(i,t)}}return qn.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static isInterval(t){return t&&t.isLuxonInterval||!1}get start(){return this.isValid?this.s:null}get end(){return this.isValid?this.e:null}get lastDateTime(){return this.isValid&&this.e?this.e.minus(1):null}get isValid(){return null===this.invalidReason}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}length(t="milliseconds"){return this.isValid?this.toDuration(t).get(t):NaN}count(t="milliseconds",e){if(!this.isValid)return NaN;const r=this.start.startOf(t,e);let n;return n=e?.useLocaleWeeks?this.end.reconfigure({locale:r.locale}):this.end,n=n.startOf(t,e),Math.floor(n.diff(r,t).get(t))+(n.valueOf()!==this.end.valueOf())}hasSame(t){return!!this.isValid&&(this.isEmpty()||this.e.minus(1).hasSame(this.s,t))}isEmpty(){return this.s.valueOf()===this.e.valueOf()}isAfter(t){return!!this.isValid&&this.s>t}isBefore(t){return!!this.isValid&&this.e<=t}contains(t){return!!this.isValid&&(this.s<=t&&this.e>t)}set({start:t,end:e}={}){return this.isValid?qn.fromDateTimes(t||this.s,e||this.e):this}splitAt(...t){if(!this.isValid)return[];const e=t.map(Fs).filter(t=>this.contains(t)).sort((t,e)=>t.toMillis()-e.toMillis()),r=[];let{s:n}=this,s=0;for(;n<this.e;){const t=e[s]||this.e,i=+t>+this.e?this.e:t;r.push(qn.fromDateTimes(n,i)),n=i,s+=1}return r}splitBy(t){const e=Wn.fromDurationLike(t);if(!this.isValid||!e.isValid||0===e.as("milliseconds"))return[];let r,{s:n}=this,s=1;const i=[];for(;n<this.e;){const t=this.start.plus(e.mapUnits(t=>t*s));r=+t>+this.e?this.e:t,i.push(qn.fromDateTimes(n,r)),n=r,s+=1}return i}divideEqually(t){return this.isValid?this.splitBy(this.length()/t).slice(0,t):[]}overlaps(t){return this.e>t.s&&this.s<t.e}abutsStart(t){return!!this.isValid&&+this.e===+t.s}abutsEnd(t){return!!this.isValid&&+t.e===+this.s}engulfs(t){return!!this.isValid&&(this.s<=t.s&&this.e>=t.e)}equals(t){return!(!this.isValid||!t.isValid)&&(this.s.equals(t.s)&&this.e.equals(t.e))}intersection(t){if(!this.isValid)return this;const e=this.s>t.s?this.s:t.s,r=this.e<t.e?this.e:t.e;return e>=r?null:qn.fromDateTimes(e,r)}union(t){if(!this.isValid)return this;const e=this.s<t.s?this.s:t.s,r=this.e>t.e?this.e:t.e;return qn.fromDateTimes(e,r)}static merge(t){const[e,r]=t.sort((t,e)=>t.s-e.s).reduce(([t,e],r)=>e?e.overlaps(r)||e.abutsStart(r)?[t,e.union(r)]:[t.concat([e]),r]:[t,r],[[],null]);return r&&e.push(r),e}static xor(t){let e=null,r=0;const n=[],s=t.map(t=>[{time:t.s,type:"s"},{time:t.e,type:"e"}]),i=Array.prototype.concat(...s).sort((t,e)=>t.time-e.time);for(const t of i)r+="s"===t.type?1:-1,1===r?e=t.time:(e&&+e!==+t.time&&n.push(qn.fromDateTimes(e,t.time)),e=null);return qn.merge(n)}difference(...t){return qn.xor([this].concat(t)).map(t=>this.intersection(t)).filter(t=>t&&!t.isEmpty())}toString(){return this.isValid?`[${this.s.toISO()} – ${this.e.toISO()})`:Rn}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`:`Interval { Invalid, reason: ${this.invalidReason} }`}toLocaleString(t=Mt,e={}){return this.isValid?Zr.create(this.s.loc.clone(e),t).formatInterval(this):Rn}toISO(t){return this.isValid?`${this.s.toISO(t)}/${this.e.toISO(t)}`:Rn}toISODate(){return this.isValid?`${this.s.toISODate()}/${this.e.toISODate()}`:Rn}toISOTime(t){return this.isValid?`${this.s.toISOTime(t)}/${this.e.toISOTime(t)}`:Rn}toFormat(t,{separator:e=" – "}={}){return this.isValid?`${this.s.toFormat(t)}${e}${this.e.toFormat(t)}`:Rn}toDuration(t,e){return this.isValid?this.e.diff(this.s,t,e):Wn.invalid(this.invalidReason)}mapEndpoints(t){return qn.fromDateTimes(t(this.s),t(this.e))}}class Yn{static hasDST(t=ze.defaultZone){const e=Is.now().setZone(t).set({month:12});return!t.isUniversal&&e.offset!==e.set({month:6}).offset}static isValidIANAZone(t){return ae.isValidZone(t)}static normalizeZone(t){return ke(t,ze.defaultZone)}static getStartOfWeek({locale:t=null,locObj:e=null}={}){return(e||_e.create(t)).getStartOfWeek()}static getMinimumDaysInFirstWeek({locale:t=null,locObj:e=null}={}){return(e||_e.create(t)).getMinDaysInFirstWeek()}static getWeekendWeekdays({locale:t=null,locObj:e=null}={}){return(e||_e.create(t)).getWeekendDays().slice()}static months(t="long",{locale:e=null,numberingSystem:r=null,locObj:n=null,outputCalendar:s="gregory"}={}){return(n||_e.create(e,r,s)).months(t)}static monthsFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:n=null,outputCalendar:s="gregory"}={}){return(n||_e.create(e,r,s)).months(t,!0)}static weekdays(t="long",{locale:e=null,numberingSystem:r=null,locObj:n=null}={}){return(n||_e.create(e,r,null)).weekdays(t)}static weekdaysFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:n=null}={}){return(n||_e.create(e,r,null)).weekdays(t,!0)}static meridiems({locale:t=null}={}){return _e.create(t).meridiems()}static eras(t="short",{locale:e=null}={}){return _e.create(e,null,"gregory").eras(t)}static features(){return{relative:sr(),localeWeek:ir()}}}function Gn(t,e){const r=t=>t.toUTC(0,{keepLocalTime:!0}).startOf("day").valueOf(),n=r(e)-r(t);return Math.floor(Wn.fromMillis(n).as("days"))}function Bn(t,e,r,n){let[s,i,a,o]=function(t,e,r){const n=[["years",(t,e)=>e.year-t.year],["quarters",(t,e)=>e.quarter-t.quarter+4*(e.year-t.year)],["months",(t,e)=>e.month-t.month+12*(e.year-t.year)],["weeks",(t,e)=>{const r=Gn(t,e);return(r-r%7)/7}],["days",Gn]],s={},i=t;let a,o;for(const[l,c]of n)r.indexOf(l)>=0&&(a=l,s[l]=c(t,e),o=i.plus(s),o>e?(s[l]--,(t=i.plus(s))>e&&(o=t,s[l]--,t=i.plus(s))):t=o);return[t,s,o,a]}(t,e,r);const l=e-s,c=r.filter(t=>["hours","minutes","seconds","milliseconds"].indexOf(t)>=0);0===c.length&&(a<e&&(a=s.plus({[o]:1})),a!==s&&(i[o]=(i[o]||0)+l/(a-s)));const u=Wn.fromObject(i,n);return c.length>0?Wn.fromMillis(l,n).shiftTo(...c).plus(u):u}function Jn(t,e=t=>t){return{regex:t,deser:([t])=>e(function(t){let e=parseInt(t,10);if(isNaN(e)){e="";for(let r=0;r<t.length;r++){const n=t.charCodeAt(r);if(-1!==t[r].search(De.hanidec))e+=Oe.indexOf(t[r]);else for(const t in Ce){const[r,s]=Ce[t];n>=r&&n<=s&&(e+=n-r)}}return parseInt(e,10)}return e}(t))}}const Qn=`[ ${String.fromCharCode(160)}]`,Kn=new RegExp(Qn,"g");function Xn(t){return t.replace(/\./g,"\\.?").replace(Kn,Qn)}function ts(t){return t.replace(/\./g,"").replace(Kn," ").toLowerCase()}function es(t,e){return null===t?null:{regex:RegExp(t.map(Xn).join("|")),deser:([r])=>t.findIndex(t=>ts(r)===ts(t))+e}}function rs(t,e){return{regex:t,deser:([,t,e])=>$r(t,e),groups:e}}function ns(t){return{regex:t,deser:([t])=>t}}const ss={year:{"2-digit":"yy",numeric:"yyyyy"},month:{numeric:"M","2-digit":"MM",short:"MMM",long:"MMMM"},day:{numeric:"d","2-digit":"dd"},weekday:{short:"EEE",long:"EEEE"},dayperiod:"a",dayPeriod:"a",hour12:{numeric:"h","2-digit":"hh"},hour24:{numeric:"H","2-digit":"HH"},minute:{numeric:"m","2-digit":"mm"},second:{numeric:"s","2-digit":"ss"},timeZoneName:{long:"ZZZZZ",short:"ZZZ"}};let is=null;function as(t,e){return Array.prototype.concat(...t.map(t=>function(t,e){if(t.literal)return t;const r=cs(Zr.macroTokenToFormatOpts(t.val),e);return null==r||r.includes(void 0)?t:r}(t,e)))}class os{constructor(t,e){if(this.locale=t,this.format=e,this.tokens=as(Zr.parseFormat(e),t),this.units=this.tokens.map(e=>function(t,e){const r=Te(e),n=Te(e,"{2}"),s=Te(e,"{3}"),i=Te(e,"{4}"),a=Te(e,"{6}"),o=Te(e,"{1,2}"),l=Te(e,"{1,3}"),c=Te(e,"{1,6}"),u=Te(e,"{1,9}"),d=Te(e,"{2,4}"),h=Te(e,"{4,6}"),m=t=>{return{regex:RegExp((e=t.val,e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"))),deser:([t])=>t,literal:!0};var e},p=(p=>{if(t.literal)return m(p);switch(p.val){case"G":return es(e.eras("short"),0);case"GG":return es(e.eras("long"),0);case"y":return Jn(c);case"yy":case"kk":return Jn(d,_r);case"yyyy":case"kkkk":return Jn(i);case"yyyyy":return Jn(h);case"yyyyyy":return Jn(a);case"M":case"L":case"d":case"H":case"h":case"m":case"q":case"s":case"W":return Jn(o);case"MM":case"LL":case"dd":case"HH":case"hh":case"mm":case"qq":case"ss":case"WW":return Jn(n);case"MMM":return es(e.months("short",!0),1);case"MMMM":return es(e.months("long",!0),1);case"LLL":return es(e.months("short",!1),1);case"LLLL":return es(e.months("long",!1),1);case"o":case"S":return Jn(l);case"ooo":case"SSS":return Jn(s);case"u":return ns(u);case"uu":return ns(o);case"uuu":case"E":case"c":return Jn(r);case"a":return es(e.meridiems(),0);case"EEE":return es(e.weekdays("short",!1),1);case"EEEE":return es(e.weekdays("long",!1),1);case"ccc":return es(e.weekdays("short",!0),1);case"cccc":return es(e.weekdays("long",!0),1);case"Z":case"ZZ":return rs(new RegExp(`([+-]${o.source})(?::(${n.source}))?`),2);case"ZZZ":return rs(new RegExp(`([+-]${o.source})(${n.source})?`),2);case"z":return ns(/[a-z_+-/]{1,256}?/i);case" ":return ns(/[^\S\n\r]/);default:return m(p)}})(t)||{invalidReason:"missing Intl.DateTimeFormat.formatToParts support"};return p.token=t,p}(e,t)),this.disqualifyingUnit=this.units.find(t=>t.invalidReason),!this.disqualifyingUnit){const[t,e]=function(t){const e=t.map(t=>t.regex).reduce((t,e)=>`${t}(${e.source})`,"");return[`^${e}$`,t]}(this.units);this.regex=RegExp(t,"i"),this.handlers=e}}explainFromTokens(t){if(this.isValid){const[e,r]=function(t,e,r){const n=t.match(e);if(n){const t={};let e=1;for(const s in r)if(or(r,s)){const i=r[s],a=i.groups?i.groups+1:1;!i.literal&&i.token&&(t[i.token.val[0]]=i.deser(n.slice(e,e+a))),e+=a}return[n,t]}return[n,{}]}(t,this.regex,this.handlers),[n,s,i]=r?function(t){let e,r=null;er(t.z)||(r=ae.create(t.z)),er(t.Z)||(r||(r=new $e(t.Z)),e=t.Z),er(t.q)||(t.M=3*(t.q-1)+1),er(t.h)||(t.h<12&&1===t.a?t.h+=12:12===t.h&&0===t.a&&(t.h=0)),0===t.G&&t.y&&(t.y=-t.y),er(t.u)||(t.S=mr(t.u));const n=Object.keys(t).reduce((e,r)=>{const n=(t=>{switch(t){case"S":return"millisecond";case"s":return"second";case"m":return"minute";case"h":case"H":return"hour";case"d":return"day";case"o":return"ordinal";case"L":case"M":return"month";case"y":return"year";case"E":case"c":return"weekday";case"W":return"weekNumber";case"k":return"weekYear";case"q":return"quarter";default:return null}})(r);return n&&(e[n]=t[r]),e},{});return[n,r,e]}(r):[null,null,void 0];if(or(r,"a")&&or(r,"H"))throw new kt("Can't include meridiem when specifying 24-hour format");return{input:t,tokens:this.tokens,regex:this.regex,rawMatches:e,matches:r,result:n,zone:s,specificOffset:i}}return{input:t,tokens:this.tokens,invalidReason:this.invalidReason}}get isValid(){return!this.disqualifyingUnit}get invalidReason(){return this.disqualifyingUnit?this.disqualifyingUnit.invalidReason:null}}function ls(t,e,r){return new os(t,r).explainFromTokens(e)}function cs(t,e){if(!t)return null;const r=Zr.create(e,t).dtFormatter((is||(is=Is.fromMillis(1555555555555)),is)),n=r.formatToParts(),s=r.resolvedOptions();return n.map(e=>function(t,e,r){const{type:n,value:s}=t;if("literal"===n){const t=/^\s+$/.test(s);return{literal:!t,val:t?" ":s}}const i=e[n];let a=n;"hour"===n&&(a=null!=e.hour12?e.hour12?"hour12":"hour24":null!=e.hourCycle?"h11"===e.hourCycle||"h12"===e.hourCycle?"hour12":"hour24":r.hour12?"hour12":"hour24");let o=ss[a];if("object"==typeof o&&(o=o[i]),o)return{literal:!1,val:o}}(e,t,s))}const us="Invalid DateTime",ds=864e13;function hs(t){return new je("unsupported zone",`the zone "${t.name}" is not supported`)}function ms(t){return null===t.weekData&&(t.weekData=Ge(t.c)),t.weekData}function ps(t){return null===t.localWeekData&&(t.localWeekData=Ge(t.c,t.loc.getMinDaysInFirstWeek(),t.loc.getStartOfWeek())),t.localWeekData}function gs(t,e){const r={ts:t.ts,zone:t.zone,c:t.c,o:t.o,loc:t.loc,invalid:t.invalid};return new Is({...r,...e,old:r})}function fs(t,e,r){let n=t-60*e*1e3;const s=r.offset(n);if(e===s)return[n,e];n-=60*(s-e)*1e3;const i=r.offset(n);return s===i?[n,s]:[t-60*Math.min(s,i)*1e3,Math.max(s,i)]}function ys(t,e){const r=new Date(t+=60*e*1e3);return{year:r.getUTCFullYear(),month:r.getUTCMonth()+1,day:r.getUTCDate(),hour:r.getUTCHours(),minute:r.getUTCMinutes(),second:r.getUTCSeconds(),millisecond:r.getUTCMilliseconds()}}function vs(t,e,r){return fs(vr(t),e,r)}function ws(t,e){const r=t.o,n=t.c.year+Math.trunc(e.years),s=t.c.month+Math.trunc(e.months)+3*Math.trunc(e.quarters),i={...t.c,year:n,month:s,day:Math.min(t.c.day,yr(n,s))+Math.trunc(e.days)+7*Math.trunc(e.weeks)},a=Wn.fromObject({years:e.years-Math.trunc(e.years),quarters:e.quarters-Math.trunc(e.quarters),months:e.months-Math.trunc(e.months),weeks:e.weeks-Math.trunc(e.weeks),days:e.days-Math.trunc(e.days),hours:e.hours,minutes:e.minutes,seconds:e.seconds,milliseconds:e.milliseconds}).as("milliseconds"),o=vr(i);let[l,c]=fs(o,r,t.zone);return 0!==a&&(l+=a,c=t.zone.offset(l)),{ts:l,o:c}}function bs(t,e,r,n,s,i){const{setZone:a,zone:o}=r;if(t&&0!==Object.keys(t).length||e){const n=e||o,s=Is.fromObject(t,{...r,zone:n,specificOffset:i});return a?s:s.setZone(o)}return Is.invalid(new je("unparsable",`the input "${s}" can't be parsed as ${n}`))}function _s(t,e,r=!0){return t.isValid?Zr.create(_e.create("en-US"),{allowZ:r,forceSimple:!0}).formatDateTimeFromString(t,e):null}function Ss(t,e,r){const n=t.c.year>9999||t.c.year<0;let s="";if(n&&t.c.year>=0&&(s+="+"),s+=ur(t.c.year,n?6:4),"year"===r)return s;if(e){if(s+="-",s+=ur(t.c.month),"month"===r)return s;s+="-"}else if(s+=ur(t.c.month),"month"===r)return s;return s+=ur(t.c.day),s}function $s(t,e,r,n,s,i,a){let o=!r||0!==t.c.millisecond||0!==t.c.second,l="";switch(a){case"day":case"month":case"year":break;default:if(l+=ur(t.c.hour),"hour"===a)break;if(e){if(l+=":",l+=ur(t.c.minute),"minute"===a)break;o&&(l+=":",l+=ur(t.c.second))}else{if(l+=ur(t.c.minute),"minute"===a)break;o&&(l+=ur(t.c.second))}if("second"===a)break;!o||n&&0===t.c.millisecond||(l+=".",l+=ur(t.c.millisecond,3))}return s&&(t.isOffsetFixed&&0===t.offset&&!i?l+="Z":t.o<0?(l+="-",l+=ur(Math.trunc(-t.o/60)),l+=":",l+=ur(Math.trunc(-t.o%60))):(l+="+",l+=ur(Math.trunc(t.o/60)),l+=":",l+=ur(Math.trunc(t.o%60)))),i&&(l+="["+t.zone.ianaName+"]"),l}const xs={month:1,day:1,hour:0,minute:0,second:0,millisecond:0},ks={weekNumber:1,weekday:1,hour:0,minute:0,second:0,millisecond:0},Ds={ordinal:1,hour:0,minute:0,second:0,millisecond:0},Cs=["year","month","day","hour","minute","second","millisecond"],Os=["weekYear","weekNumber","weekday","hour","minute","second","millisecond"],As=["year","ordinal","hour","minute","second","millisecond"];function Ts(t){const e={year:"year",years:"year",month:"month",months:"month",day:"day",days:"day",hour:"hour",hours:"hour",minute:"minute",minutes:"minute",quarter:"quarter",quarters:"quarter",second:"second",seconds:"second",millisecond:"millisecond",milliseconds:"millisecond",weekday:"weekday",weekdays:"weekday",weeknumber:"weekNumber",weeksnumber:"weekNumber",weeknumbers:"weekNumber",weekyear:"weekYear",weekyears:"weekYear",ordinal:"ordinal"}[t.toLowerCase()];if(!e)throw new Dt(t);return e}function Es(t){switch(t.toLowerCase()){case"localweekday":case"localweekdays":return"localWeekday";case"localweeknumber":case"localweeknumbers":return"localWeekNumber";case"localweekyear":case"localweekyears":return"localWeekYear";default:return Ts(t)}}function Ms(t,e){const r=ke(e.zone,ze.defaultZone);if(!r.isValid)return Is.invalid(hs(r));const n=_e.fromObject(e);let s,i;if(er(t.year))s=ze.now();else{for(const e of Cs)er(t[e])&&(t[e]=xs[e]);const e=Xe(t)||tr(t);if(e)return Is.invalid(e);const n=function(t){if(void 0===Ps&&(Ps=ze.now()),"iana"!==t.type)return t.offset(Ps);const e=t.name;let r=Vs.get(e);return void 0===r&&(r=t.offset(Ps),Vs.set(e,r)),r}(r);[s,i]=vs(t,n,r)}return new Is({ts:s,zone:r,loc:n,o:i})}function Ns(t,e,r){const n=!!er(r.round)||r.round,s=er(r.rounding)?"trunc":r.rounding,i=(t,i)=>{t=pr(t,n||r.calendary?0:2,r.calendary?"round":s);return e.loc.clone(r).relFormatter(r).format(t,i)},a=n=>r.calendary?e.hasSame(t,n)?0:e.startOf(n).diff(t.startOf(n),n).get(n):e.diff(t,n).get(n);if(r.unit)return i(a(r.unit),r.unit);for(const t of r.units){const e=a(t);if(Math.abs(e)>=1)return i(e,t)}return i(t>e?-0:0,r.units[r.units.length-1])}function Ls(t){let e,r={};return t.length>0&&"object"==typeof t[t.length-1]?(r=t[t.length-1],e=Array.from(t).slice(0,t.length-1)):e=Array.from(t),[r,e]}let Ps;const Vs=new Map;class Is{constructor(t){const e=t.zone||ze.defaultZone;let r=t.invalid||(Number.isNaN(t.ts)?new je("invalid input"):null)||(e.isValid?null:hs(e));this.ts=er(t.ts)?ze.now():t.ts;let n=null,s=null;if(!r){if(t.old&&t.old.ts===this.ts&&t.old.zone.equals(e))[n,s]=[t.old.c,t.old.o];else{const i=rr(t.o)&&!t.old?t.o:e.offset(this.ts);n=ys(this.ts,i),r=Number.isNaN(n.year)?new je("invalid input"):null,n=r?null:n,s=r?null:i}}this._zone=e,this.loc=t.loc||_e.create(),this.invalid=r,this.weekData=null,this.localWeekData=null,this.c=n,this.o=s,this.isLuxonDateTime=!0}static now(){return new Is({})}static local(){const[t,e]=Ls(arguments),[r,n,s,i,a,o,l]=e;return Ms({year:r,month:n,day:s,hour:i,minute:a,second:o,millisecond:l},t)}static utc(){const[t,e]=Ls(arguments),[r,n,s,i,a,o,l]=e;return t.zone=$e.utcInstance,Ms({year:r,month:n,day:s,hour:i,minute:a,second:o,millisecond:l},t)}static fromJSDate(t,e={}){const r=function(t){return"[object Date]"===Object.prototype.toString.call(t)}(t)?t.valueOf():NaN;if(Number.isNaN(r))return Is.invalid("invalid input");const n=ke(e.zone,ze.defaultZone);return n.isValid?new Is({ts:r,zone:n,loc:_e.fromObject(e)}):Is.invalid(hs(n))}static fromMillis(t,e={}){if(rr(t))return t<-ds||t>ds?Is.invalid("Timestamp out of range"):new Is({ts:t,zone:ke(e.zone,ze.defaultZone),loc:_e.fromObject(e)});throw new Ct(`fromMillis requires a numerical input, but received a ${typeof t} with value ${t}`)}static fromSeconds(t,e={}){if(rr(t))return new Is({ts:1e3*t,zone:ke(e.zone,ze.defaultZone),loc:_e.fromObject(e)});throw new Ct("fromSeconds requires a numerical input")}static fromObject(t,e={}){t=t||{};const r=ke(e.zone,ze.defaultZone);if(!r.isValid)return Is.invalid(hs(r));const n=_e.fromObject(e),s=kr(t,Es),{minDaysInFirstWeek:i,startOfWeek:a}=Ke(s,n),o=ze.now(),l=er(e.specificOffset)?r.offset(o):e.specificOffset,c=!er(s.ordinal),u=!er(s.year),d=!er(s.month)||!er(s.day),h=u||d,m=s.weekYear||s.weekNumber;if((h||c)&&m)throw new kt("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(d&&c)throw new kt("Can't mix ordinal dates with month/day");const p=m||s.weekday&&!h;let g,f,y=ys(o,l);p?(g=Os,f=ks,y=Ge(y,i,a)):c?(g=As,f=Ds,y=Je(y)):(g=Cs,f=xs);let v=!1;for(const t of g){er(s[t])?s[t]=v?f[t]:y[t]:v=!0}const w=p?function(t,e=4,r=1){const n=nr(t.weekYear),s=cr(t.weekNumber,1,br(t.weekYear,e,r)),i=cr(t.weekday,1,7);return n?s?!i&&Ze("weekday",t.weekday):Ze("week",t.weekNumber):Ze("weekYear",t.weekYear)}(s,i,a):c?function(t){const e=nr(t.year),r=cr(t.ordinal,1,fr(t.year));return e?!r&&Ze("ordinal",t.ordinal):Ze("year",t.year)}(s):Xe(s),b=w||tr(s);if(b)return Is.invalid(b);const _=p?Be(s,i,a):c?Qe(s):s,[S,$]=vs(_,l,r),x=new Is({ts:S,zone:r,o:$,loc:n});return s.weekday&&h&&t.weekday!==x.weekday?Is.invalid("mismatched weekday",`you can't specify both a weekday of ${s.weekday} and a date of ${x.toISO()}`):x.isValid?x:Is.invalid(x.invalid)}static fromISO(t,e={}){const[r,n]=function(t){return Yr(t,[bn,xn],[_n,kn],[Sn,Dn],[$n,Cn])}(t);return bs(r,n,e,"ISO 8601",t)}static fromRFC2822(t,e={}){const[r,n]=function(t){return Yr(function(t){return t.replace(/\([^()]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").trim()}(t),[mn,pn])}(t);return bs(r,n,e,"RFC 2822",t)}static fromHTTP(t,e={}){const[r,n]=function(t){return Yr(t,[gn,vn],[fn,vn],[yn,wn])}(t);return bs(r,n,e,"HTTP",e)}static fromFormat(t,e,r={}){if(er(t)||er(e))throw new Ct("fromFormat requires an input string and a format");const{locale:n=null,numberingSystem:s=null}=r,i=_e.fromOpts({locale:n,numberingSystem:s,defaultToEN:!0}),[a,o,l,c]=function(t,e,r){const{result:n,zone:s,specificOffset:i,invalidReason:a}=ls(t,e,r);return[n,s,i,a]}(i,t,e);return c?Is.invalid(c):bs(a,o,r,`format ${e}`,t,l)}static fromString(t,e,r={}){return Is.fromFormat(t,e,r)}static fromSQL(t,e={}){const[r,n]=function(t){return Yr(t,[An,xn],[Tn,En])}(t);return bs(r,n,e,"SQL",t)}static invalid(t,e=null){if(!t)throw new Ct("need to specify a reason the DateTime is invalid");const r=t instanceof je?t:new je(t,e);if(ze.throwOnInvalid)throw new St(r);return new Is({invalid:r})}static isDateTime(t){return t&&t.isLuxonDateTime||!1}static parseFormatForOpts(t,e={}){const r=cs(t,_e.fromObject(e));return r?r.map(t=>t?t.val:null).join(""):null}static expandFormat(t,e={}){return as(Zr.parseFormat(t),_e.fromObject(e)).map(t=>t.val).join("")}static resetCache(){Ps=void 0,Vs.clear()}get(t){return this[t]}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}get outputCalendar(){return this.isValid?this.loc.outputCalendar:null}get zone(){return this._zone}get zoneName(){return this.isValid?this.zone.name:null}get year(){return this.isValid?this.c.year:NaN}get quarter(){return this.isValid?Math.ceil(this.c.month/3):NaN}get month(){return this.isValid?this.c.month:NaN}get day(){return this.isValid?this.c.day:NaN}get hour(){return this.isValid?this.c.hour:NaN}get minute(){return this.isValid?this.c.minute:NaN}get second(){return this.isValid?this.c.second:NaN}get millisecond(){return this.isValid?this.c.millisecond:NaN}get weekYear(){return this.isValid?ms(this).weekYear:NaN}get weekNumber(){return this.isValid?ms(this).weekNumber:NaN}get weekday(){return this.isValid?ms(this).weekday:NaN}get isWeekend(){return this.isValid&&this.loc.getWeekendDays().includes(this.weekday)}get localWeekday(){return this.isValid?ps(this).weekday:NaN}get localWeekNumber(){return this.isValid?ps(this).weekNumber:NaN}get localWeekYear(){return this.isValid?ps(this).weekYear:NaN}get ordinal(){return this.isValid?Je(this.c).ordinal:NaN}get monthShort(){return this.isValid?Yn.months("short",{locObj:this.loc})[this.month-1]:null}get monthLong(){return this.isValid?Yn.months("long",{locObj:this.loc})[this.month-1]:null}get weekdayShort(){return this.isValid?Yn.weekdays("short",{locObj:this.loc})[this.weekday-1]:null}get weekdayLong(){return this.isValid?Yn.weekdays("long",{locObj:this.loc})[this.weekday-1]:null}get offset(){return this.isValid?+this.o:NaN}get offsetNameShort(){return this.isValid?this.zone.offsetName(this.ts,{format:"short",locale:this.locale}):null}get offsetNameLong(){return this.isValid?this.zone.offsetName(this.ts,{format:"long",locale:this.locale}):null}get isOffsetFixed(){return this.isValid?this.zone.isUniversal:null}get isInDST(){return!this.isOffsetFixed&&(this.offset>this.set({month:1,day:1}).offset||this.offset>this.set({month:5}).offset)}getPossibleOffsets(){if(!this.isValid||this.isOffsetFixed)return[this];const t=864e5,e=6e4,r=vr(this.c),n=this.zone.offset(r-t),s=this.zone.offset(r+t),i=this.zone.offset(r-n*e),a=this.zone.offset(r-s*e);if(i===a)return[this];const o=r-i*e,l=r-a*e,c=ys(o,i),u=ys(l,a);return c.hour===u.hour&&c.minute===u.minute&&c.second===u.second&&c.millisecond===u.millisecond?[gs(this,{ts:o}),gs(this,{ts:l})]:[this]}get isInLeapYear(){return gr(this.year)}get daysInMonth(){return yr(this.year,this.month)}get daysInYear(){return this.isValid?fr(this.year):NaN}get weeksInWeekYear(){return this.isValid?br(this.weekYear):NaN}get weeksInLocalWeekYear(){return this.isValid?br(this.localWeekYear,this.loc.getMinDaysInFirstWeek(),this.loc.getStartOfWeek()):NaN}resolvedLocaleOptions(t={}){const{locale:e,numberingSystem:r,calendar:n}=Zr.create(this.loc.clone(t),t).resolvedOptions(this);return{locale:e,numberingSystem:r,outputCalendar:n}}toUTC(t=0,e={}){return this.setZone($e.instance(t),e)}toLocal(){return this.setZone(ze.defaultZone)}setZone(t,{keepLocalTime:e=!1,keepCalendarTime:r=!1}={}){if((t=ke(t,ze.defaultZone)).equals(this.zone))return this;if(t.isValid){let n=this.ts;if(e||r){const e=t.offset(this.ts),r=this.toObject();[n]=vs(r,e,t)}return gs(this,{ts:n,zone:t})}return Is.invalid(hs(t))}reconfigure({locale:t,numberingSystem:e,outputCalendar:r}={}){return gs(this,{loc:this.loc.clone({locale:t,numberingSystem:e,outputCalendar:r})})}setLocale(t){return this.reconfigure({locale:t})}set(t){if(!this.isValid)return this;const e=kr(t,Es),{minDaysInFirstWeek:r,startOfWeek:n}=Ke(e,this.loc),s=!er(e.weekYear)||!er(e.weekNumber)||!er(e.weekday),i=!er(e.ordinal),a=!er(e.year),o=!er(e.month)||!er(e.day),l=a||o,c=e.weekYear||e.weekNumber;if((l||i)&&c)throw new kt("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(o&&i)throw new kt("Can't mix ordinal dates with month/day");let u;s?u=Be({...Ge(this.c,r,n),...e},r,n):er(e.ordinal)?(u={...this.toObject(),...e},er(e.day)&&(u.day=Math.min(yr(u.year,u.month),u.day))):u=Qe({...Je(this.c),...e});const[d,h]=vs(u,this.o,this.zone);return gs(this,{ts:d,o:h})}plus(t){if(!this.isValid)return this;return gs(this,ws(this,Wn.fromDurationLike(t)))}minus(t){if(!this.isValid)return this;return gs(this,ws(this,Wn.fromDurationLike(t).negate()))}startOf(t,{useLocaleWeeks:e=!1}={}){if(!this.isValid)return this;const r={},n=Wn.normalizeUnit(t);switch(n){case"years":r.month=1;case"quarters":case"months":r.day=1;case"weeks":case"days":r.hour=0;case"hours":r.minute=0;case"minutes":r.second=0;case"seconds":r.millisecond=0}if("weeks"===n)if(e){const t=this.loc.getStartOfWeek(),{weekday:e}=this;e<t&&(r.weekNumber=this.weekNumber-1),r.weekday=t}else r.weekday=1;if("quarters"===n){const t=Math.ceil(this.month/3);r.month=3*(t-1)+1}return this.set(r)}endOf(t,e){return this.isValid?this.plus({[t]:1}).startOf(t,e).minus(1):this}toFormat(t,e={}){return this.isValid?Zr.create(this.loc.redefaultToEN(e)).formatDateTimeFromString(this,t):us}toLocaleString(t=Mt,e={}){return this.isValid?Zr.create(this.loc.clone(e),t).formatDateTime(this):us}toLocaleParts(t={}){return this.isValid?Zr.create(this.loc.clone(t),t).formatDateTimeParts(this):[]}toISO({format:t="extended",suppressSeconds:e=!1,suppressMilliseconds:r=!1,includeOffset:n=!0,extendedZone:s=!1,precision:i="milliseconds"}={}){if(!this.isValid)return null;const a="extended"===t;let o=Ss(this,a,i=Ts(i));return Cs.indexOf(i)>=3&&(o+="T"),o+=$s(this,a,e,r,n,s,i),o}toISODate({format:t="extended",precision:e="day"}={}){return this.isValid?Ss(this,"extended"===t,Ts(e)):null}toISOWeekDate(){return _s(this,"kkkk-'W'WW-c")}toISOTime({suppressMilliseconds:t=!1,suppressSeconds:e=!1,includeOffset:r=!0,includePrefix:n=!1,extendedZone:s=!1,format:i="extended",precision:a="milliseconds"}={}){if(!this.isValid)return null;return a=Ts(a),(n&&Cs.indexOf(a)>=3?"T":"")+$s(this,"extended"===i,e,t,r,s,a)}toRFC2822(){return _s(this,"EEE, dd LLL yyyy HH:mm:ss ZZZ",!1)}toHTTP(){return _s(this.toUTC(),"EEE, dd LLL yyyy HH:mm:ss 'GMT'")}toSQLDate(){return this.isValid?Ss(this,!0):null}toSQLTime({includeOffset:t=!0,includeZone:e=!1,includeOffsetSpace:r=!0}={}){let n="HH:mm:ss.SSS";return(e||t)&&(r&&(n+=" "),e?n+="z":t&&(n+="ZZ")),_s(this,n,!0)}toSQL(t={}){return this.isValid?`${this.toSQLDate()} ${this.toSQLTime(t)}`:null}toString(){return this.isValid?this.toISO():us}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`:`DateTime { Invalid, reason: ${this.invalidReason} }`}valueOf(){return this.toMillis()}toMillis(){return this.isValid?this.ts:NaN}toSeconds(){return this.isValid?this.ts/1e3:NaN}toUnixInteger(){return this.isValid?Math.floor(this.ts/1e3):NaN}toJSON(){return this.toISO()}toBSON(){return this.toJSDate()}toObject(t={}){if(!this.isValid)return{};const e={...this.c};return t.includeConfig&&(e.outputCalendar=this.outputCalendar,e.numberingSystem=this.loc.numberingSystem,e.locale=this.loc.locale),e}toJSDate(){return new Date(this.isValid?this.ts:NaN)}diff(t,e="milliseconds",r={}){if(!this.isValid||!t.isValid)return Wn.invalid("created by diffing an invalid DateTime");const n={locale:this.locale,numberingSystem:this.numberingSystem,...r},s=(o=e,Array.isArray(o)?o:[o]).map(Wn.normalizeUnit),i=t.valueOf()>this.valueOf(),a=Bn(i?this:t,i?t:this,s,n);var o;return i?a.negate():a}diffNow(t="milliseconds",e={}){return this.diff(Is.now(),t,e)}until(t){return this.isValid?qn.fromDateTimes(this,t):this}hasSame(t,e,r){if(!this.isValid)return!1;const n=t.valueOf(),s=this.setZone(t.zone,{keepLocalTime:!0});return s.startOf(e,r)<=n&&n<=s.endOf(e,r)}equals(t){return this.isValid&&t.isValid&&this.valueOf()===t.valueOf()&&this.zone.equals(t.zone)&&this.loc.equals(t.loc)}toRelative(t={}){if(!this.isValid)return null;const e=t.base||Is.fromObject({},{zone:this.zone}),r=t.padding?this<e?-t.padding:t.padding:0;let n=["years","months","days","hours","minutes","seconds"],s=t.unit;return Array.isArray(t.unit)&&(n=t.unit,s=void 0),Ns(e,this.plus(r),{...t,numeric:"always",units:n,unit:s})}toRelativeCalendar(t={}){return this.isValid?Ns(t.base||Is.fromObject({},{zone:this.zone}),this,{...t,numeric:"auto",units:["years","months","days"],calendary:!0}):null}static min(...t){if(!t.every(Is.isDateTime))throw new Ct("min requires all arguments be DateTimes");return ar(t,t=>t.valueOf(),Math.min)}static max(...t){if(!t.every(Is.isDateTime))throw new Ct("max requires all arguments be DateTimes");return ar(t,t=>t.valueOf(),Math.max)}static fromFormatExplain(t,e,r={}){const{locale:n=null,numberingSystem:s=null}=r;return ls(_e.fromOpts({locale:n,numberingSystem:s,defaultToEN:!0}),t,e)}static fromStringExplain(t,e,r={}){return Is.fromFormatExplain(t,e,r)}static buildFormatParser(t,e={}){const{locale:r=null,numberingSystem:n=null}=e,s=_e.fromOpts({locale:r,numberingSystem:n,defaultToEN:!0});return new os(s,t)}static fromFormatParser(t,e,r={}){if(er(t)||er(e))throw new Ct("fromFormatParser requires an input string and a format parser");const{locale:n=null,numberingSystem:s=null}=r,i=_e.fromOpts({locale:n,numberingSystem:s,defaultToEN:!0});if(!i.equals(e.locale))throw new Ct(`fromFormatParser called with a locale of ${i}, but the format parser was created for ${e.locale}`);const{result:a,zone:o,specificOffset:l,invalidReason:c}=e.explainFromTokens(t);return c?Is.invalid(c):bs(a,o,r,`format ${e.format}`,t,l)}static get DATE_SHORT(){return Mt}static get DATE_MED(){return Nt}static get DATE_MED_WITH_WEEKDAY(){return Lt}static get DATE_FULL(){return Pt}static get DATE_HUGE(){return Vt}static get TIME_SIMPLE(){return It}static get TIME_WITH_SECONDS(){return Ft}static get TIME_WITH_SHORT_OFFSET(){return zt}static get TIME_WITH_LONG_OFFSET(){return jt}static get TIME_24_SIMPLE(){return Ht}static get TIME_24_WITH_SECONDS(){return Ut}static get TIME_24_WITH_SHORT_OFFSET(){return Zt}static get TIME_24_WITH_LONG_OFFSET(){return Wt}static get DATETIME_SHORT(){return Rt}static get DATETIME_SHORT_WITH_SECONDS(){return qt}static get DATETIME_MED(){return Yt}static get DATETIME_MED_WITH_SECONDS(){return Gt}static get DATETIME_MED_WITH_WEEKDAY(){return Bt}static get DATETIME_FULL(){return Jt}static get DATETIME_FULL_WITH_SECONDS(){return Qt}static get DATETIME_HUGE(){return Kt}static get DATETIME_HUGE_WITH_SECONDS(){return Xt}}function Fs(t){if(Is.isDateTime(t))return t;if(t&&t.valueOf&&rr(t.valueOf()))return Is.fromJSDate(t);if(t&&"object"==typeof t)return Is.fromObject(t);throw new Ct(`Unknown datetime argument: ${t}, of type ${typeof t}`)}const zs=o`
  :host {
    --primary-gradient: linear-gradient(135deg, #4CAF50, #45a049);
    --secondary-gradient: linear-gradient(135deg, #2196F3, #1976D2);
    --danger-gradient: linear-gradient(135deg, #f44336, #d32f2f);
    --surface-elevation: 0 4px 8px rgba(0,0,0,0.12);
    --surface-elevation-hover: 0 8px 16px rgba(0,0,0,0.16);
    --border-radius: 12px;
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;

    --border-radius-sm: 4px;
    --border-radius-md: 8px;
    --border-radius-lg: 12px;

    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-md: 1rem;
    --font-size-lg: 1.25rem;
    --font-size-xl: 1.5rem;

    --font-weight-regular: 400;
    --font-weight-medium: 500;
    --font-weight-bold: 700;

    --growspace-card-bg: var(--card-background-color, #1e1e1e);
    --growspace-card-text: var(--primary-text-color, #fff);
    --growspace-card-accent: var(--primary-color, #4caf50);
    --growspace-empty-bg: rgba(255, 255, 255, 0.05);
    --growspace-empty-bg-hover: rgba(255, 255, 255, 0.1);
    --plant-border-color-default:  #2196f3; 

    --card-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    --card-shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.35);

    --transition-fast: 0.15s ease-in-out;
    --transition-medium: 0.3s ease-in-out;

    --divider-color: rgba(255, 255, 255, 0.12);

    --stage-veg: #4caf50;
    --stage-flower: #ff9800;
    --stage-dry: #9c27b0;
    --stage-cure: #2196f3;

    --error-color: #f44336;
    --error-bg: rgba(244, 67, 54, 0.1);
    --error-border: rgba(244, 67, 54, 0.3);
    --strain-dialog-bg: var(--ha-card-background, #1e1e1e);
    --strain-dialog-color: var(--primary-text-color, #fff);
    --strain-border-color: #4caf50;
    --strain-input-bg: #2a2a2a;
    --strain-input-border: #3a3a3a;
  }
`;class js{static normalizeStage(t){const e=t.toLowerCase();return"veg"===e?"vegetative":"mom"===e?"mother":e}static getPlantStageColor(t){const e=this.normalizeStage(t);return this.stageColors[e]??"#757575"}static getPlantStageIcon(t){const e=this.normalizeStage(t);return this.stageIcons[e]??bt}static getPlantStage(t){const e=t?.attributes??{},r=new Date;return e.cure_start?"cure":e.dry_start?"dry":e.mom_start?"mother":e.clone_start?"clone":e.flower_start&&new Date(e.flower_start)<=r?"flower":e.veg_start&&new Date(e.veg_start)<=r?"vegetative":"seedling"}static createGridLayout(t,e,r){const n=Array.from({length:e},()=>Array.from({length:r},()=>null));return t.forEach(t=>{const s=(t.attributes?.row??1)-1,i=(t.attributes?.col??1)-1;s>=0&&s<e&&i>=0&&i<r&&(n[s][i]=t)}),{rows:e,cols:r,grid:n}}static calculateEffectiveRows(t){const{name:e,plants:r,plants_per_row:n}=t;if("dry"===e||"cure"===e||"mother"===e||"clone"===e){if(0===r.length)return 1;const t=Math.max(...r.map(t=>t.attributes?.row||1)),e=r.filter(e=>(e.attributes?.row||1)===t).length;return e>=n?t+1:t}return n}static parseDateTimeLocal(t){if(t)try{const e=16===t.length?t+":00":t,r=new Date(e);if(isNaN(r.getTime()))return;const n=r.getFullYear(),s=String(r.getMonth()+1).padStart(2,"0"),i=String(r.getDate()).padStart(2,"0"),a=String(r.getHours()).padStart(2,"0"),o=String(r.getMinutes()).padStart(2,"0");return`${n}-${s}-${i}T${a}:${o}:${String(r.getSeconds()).padStart(2,"0")}`}catch{return}}static formatDateForBackend(t){if(t)try{const e=t.split("T");if(e.length>0&&e[0].match(/^\d{4}-\d{2}-\d{2}$/))return e[0];const r=new Date(t);if(isNaN(r.getTime()))return;const n=r.getFullYear(),s=String(r.getMonth()+1).padStart(2,"0");return`${n}-${s}-${String(r.getDate()).padStart(2,"0")}`}catch{return}}static getCurrentDateTime(){const t=new Date,e=t=>t.toString().padStart(2,"0");return`${t.getFullYear()}-${e(t.getMonth()+1)}-${e(t.getDate())}T${e(t.getHours())}:${e(t.getMinutes())}:00`}}js.stageColors={mother:"#E91E63",clone:"#FF5722",seedling:"#4CAF50",vegetative:"#8BC34A",flower:"#FF9800",dry:"#795548",cure:"#9C27B0"},js.stageIcons={mother:bt,clone:bt,seedling:bt,vegetative:bt,flower:yt,dry:vt,cure:pt};class Hs{constructor(t){this.hass=t}getGrowspaceDevices(){if(!this.hass)return[];const t=Object.values(this.hass.states),e=t.filter(t=>t.entity_id.startsWith("sensor.")&&void 0!==t.attributes?.growspace_id&&void 0!==t.attributes?.rows&&void 0!==t.attributes?.plants_per_row&&void 0===t.attributes?.row&&void 0===t.attributes?.col),r=new Map;return e.forEach(t=>{const e=t.attributes.growspace_id;r.set(e,[])}),t.forEach(t=>{if(void 0!==t.attributes?.row&&void 0!==t.attributes?.col){const e=this.getGrowspaceId(t);r.has(e)||r.set(e,[]),r.get(e).push(t)}}),Array.from(r.entries()).map(([t,r])=>{const n=e.find(e=>e.attributes?.growspace_id===t),s=n?.attributes?.friendly_name||`Growspace ${t}`,i=n?.attributes?.type??(s.toLowerCase().includes("dry")?"dry":s.toLowerCase().includes("cure")?"cure":"normal");return a={device_id:t,name:s,plants:r,rows:n?.attributes?.rows??3,plants_per_row:n?.attributes?.plants_per_row??3,type:i},{...a,type:a.type??"normal"};var a})}getGrowspaceId(t){return t.attributes?.growspace_id||"unknown"}getStrainLibrary(){const t=Object.values(this.hass.states).find(t=>void 0!==t.attributes?.strains&&null!==t.attributes?.strains),e=t?.attributes?.strains;return e?Array.isArray(e)?e.map(t=>({strain:t,phenotype:"",key:`${t}|default`})):"object"==typeof e?Object.keys(e).map(t=>{const e=t.split("|");return{strain:e[0],phenotype:e.length>1&&"default"!==e[1]?e[1]:"",key:t}}).sort((t,e)=>t.strain.localeCompare(e.strain)):[]:[]}async addPlant(t){console.log("[DataService:addPlant] Sending payload:",t);try{"mother"!==t.growspace_id&&"mother_overview"!==t.growspace_id||(t.mother_start=(new Date).toISOString().split("T")[0]),"clone"!==t.growspace_id&&"clone_overview"!==t.growspace_id||(t.clone_start=(new Date).toISOString().split("T")[0]);const e=await this.hass.callService("growspace_manager","add_plant",t);return console.log("[DataService:addPlant] Response:",e),e}catch(t){throw console.error("[DataService:addPlant] Error:",t),t}}async updatePlant(t){console.log("[DataService:updatePlant] Sending payload:",t);try{const e=await this.hass.callService("growspace_manager","update_plant",t);return console.log("[DataService:updatePlant] Response:",e),e}catch(t){throw console.error("[DataService:updatePlant] Error:",t),t}}async removePlant(t){console.log("[DataService:removePlant] Removing plant_id:",t);try{const e=await this.hass.callService("growspace_manager","remove_plant",{plant_id:t});return console.log("[DataService:removePlant] Response:",e),e}catch(t){throw console.error("[DataService:removePlant] Error:",t),t}}async harvestPlant(t,e="dry"){console.log("[DataService:harvestPlant] Harvesting plant:",t,"→ target:",e);try{const r=(e||"").toLowerCase(),n={plant_id:t};r.includes("dry")?n.target_growspace_id="dry_overview":r.includes("cure")?n.target_growspace_id="cure_overview":r.includes("mother")?n.target_growspace_id="mother_overview":r.includes("clone")?n.target_growspace_id="clone_overview":r&&(n.target_growspace_name=e);const s=await this.hass.callService("growspace_manager","harvest_plant",n);return console.log("[DataService:harvestPlant] Response:",s),s}catch(t){throw console.error("[DataService:harvestPlant] Error:",t),t}}async takeClone(t,e="clone"){console.log("[DataService:takeClone] Cloning plant:",t,"→ target:",e);try{const r=(e||"").toLowerCase(),n={plant_id:t};r.includes("dry")?n.target_growspace_id="dry_overview":r.includes("cure")?n.target_growspace_id="cure_overview":r.includes("mother")?n.target_growspace_id="mother_overview":r.includes("clone")?n.target_growspace_id="clone_overview":r&&(n.target_growspace_name=e);const s=await this.hass.callService("growspace_manager","takeClone",n);return console.log("[DataService:takeClone] Response:",s),s}catch(t){throw console.error("[DataService:takeClone] Error:",t),t}}async swapPlants(t,e){console.log(`[DataService:swapPlants] Swapping plants: ${t} and ${e}`);try{const r=await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e});return console.log("[DataService:swapPlants] Response:",r),r}catch(t){throw console.error("[DataService:swapPlants] Error:",t),t}}async addStrain(t,e){console.log("[DataService:addStrain] Adding strain:",t,e);try{const r=await this.hass.callService("growspace_manager","add_strain",{strain:t,phenotype:e});return console.log("[DataService:addStrain] Response:",r),r}catch(t){throw console.error("[DataService:addStrain] Error:",t),t}}async removeStrain(t,e){console.log("[DataService:removeStrain] Removing strain:",t,e);try{const r=await this.hass.callService("growspace_manager","remove_strain",{strain:t,phenotype:e});return console.log("[DataService:removeStrain] Response:",r),r}catch(t){throw console.error("[DataService:removeStrain] Error:",t),t}}async importStrainLibrary(t){console.log("[DataService:importStrainLibrary] Importing strains:",t);try{const e=await this.hass.callService("growspace_manager","import_strain_library",{strains:t});return console.log("[DataService:importStrainLibrary] Response:",e),e}catch(t){throw console.error("[DataService:importStrainLibrary] Error:",t),t}}async clearStrainLibrary(){console.log("[DataService:clearStrainLibrary] Clearing library");try{const t=await this.hass.callService("growspace_manager","clear_strain_library");return console.log("[DataService:clearStrainLibrary] Response:",t),t}catch(t){throw console.error("[DataService:clearStrainLibrary] Error:",t),t}}}class Us{static renderAddPlantDialog(t,e,r){if(!t?.open)return Z``;const n=[...new Set(e.map(t=>t.strain))].sort();return Z`
      <ha-dialog
        open
        @closed=${r.onClose}
        heading="Add New Plant"
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="dialog-content">
          <div class="form-group">
            <label>
              <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                <path d="${ft}"></path>
              </svg>
              Strain *
            </label>
            <select 
              class="form-input"
              .value=${t.strain||""}
              @change=${t=>r.onStrainChange(t.target.value)}
            >
              <option value="">Select a strain...</option>
              ${n.map(e=>Z`
                <option value="${e}" ?selected=${e===t.strain}>
                  ${e}
                </option>
              `)}
            </select>
          </div>

          <div class="form-group">
            <label>Phenotype</label>
            <input 
              type="text" 
              class="form-input"
              placeholder="e.g., Pheno #1, Purple variant..."
              .value=${t.phenotype||""} 
              @input=${t=>r.onPhenotypeChange(t.target.value)}
            />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${Us.renderDateTimeInput("Vegetative Start","M15,13H16.5V15.82L18.94,17.23L18.19,18.53L15,16.69V13M19,8H5V19H9.67C9.24,18.09 9,17.07 9,16A7,7 0 0,1 16,9C17.07,9 18.09,9.24 19,9.67V8M5,21C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H6V1H8V3H16V1H18V3H19A2,2 0 0,1 21,5V11.1C22.24,12.36 23,14.09 23,16A7,7 0 0,1 16,23C14.09,23 12.36,22.24 11.1,21H5M16,11.15A4.85,4.85 0 0,0 11.15,16C11.15,18.68 13.32,20.85 16,20.85A4.85,4.85 0 0,0 20.85,16C20.85,13.32 18.68,11.15 16,11.15Z",t.veg_start||"",r.onVegStartChange)}
            ${Us.renderDateTimeInput("Flower Start",yt,t.flower_start||"",r.onFlowerStartChange)}
          </div>

          <div style="background: rgba(var(--rgb-primary-color), 0.05); padding: var(--spacing-md); border-radius: var(--border-radius); border-left: 4px solid var(--primary-color);">
            <strong>Position:</strong> Row ${t.row+1}, Column ${t.col+1}
          </div>
        </div>

        <button class="action-button primary" slot="primaryAction" @click=${r.onConfirm}>
          <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${bt}"></path>
          </svg>
          Add Plant
        </button>
        <button class="action-button" slot="secondaryAction" @click=${r.onClose}>
          Cancel
        </button>
      </ha-dialog>
    `}static renderPlantOverviewDialog(t,e,r){if(!t?.open)return Z``;const{plant:n,editedAttributes:s}=t,i=n.attributes?.plant_id||n.entity_id.replace("sensor.",""),a=(t,e)=>{s[t]="number"==typeof e?e.toString():e,r.onAttributeChange(t,s[t])};return Z`
      <ha-dialog
        open
        @closed=${r.onClose}
        heading="${s.strain||"Plant"} Details"
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="dialog-content">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${Us.renderTextInput("Strain",s.strain||"",t=>r.onAttributeChange("strain",t))}
            ${Us.renderTextInput("Phenotype",s.phenotype||"",t=>r.onAttributeChange("phenotype",t))}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${Us.renderNumberInput("Row",s.row||1,t=>r.onAttributeChange("row",parseInt(t)))}
            ${Us.renderNumberInput("Column",s.col||1,t=>r.onAttributeChange("col",parseInt(t)))}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${"veg"===s.stage||"flower"===s.stage?Us.renderDateTimeInput("Vegetative Start",bt,s.veg_start??"",t=>a("veg_start",t)):R}
            ${"flower"===s.stage?Us.renderDateTimeInput("Flower Start",yt,s.flower_start??"",t=>a("flower_start",t)):R}
            ${"mother"===s.stage?Us.renderDateTimeInput("Mother Start",bt,s.mother_start??"",t=>a("mother_start",t)):R}
            ${"clone"===s.stage?Us.renderDateTimeInput("Clone Start",bt,s.clone_start??"",t=>a("clone_start",t)):R}

            ${"cure"===s.stage?Us.renderDateTimeInput("Cure Start",pt,s.cure_start??"",t=>a("cure_start",t)):R}
            ${"dry"===s.stage||"cure"===s.stage?Us.renderDateTimeInput("Dry Start",vt,s.dry_start??"",t=>a("dry_start",t)):R}

            ${"cure"===s.stage?Us.renderDateTimeInput("Cure Start",pt,s.cure_start??"",t=>a("cure_start",t)):R}
          </div>


          ${Us.renderPlantStats(n)}
        </div>

        <button class="action-button primary" slot="primaryAction" @click=${r.onUpdate}>
          <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"></path>
          </svg>
          Update Plant
        </button>
        
        <button class="action-button" slot="secondaryAction" @click=${()=>r.onDelete(i)}>
          Remove Plant
        </button>
        
        <button class="action-button" slot="secondaryAction" @click=${r.onClose}>
          Cancel
        </button>
        ${"mother"===n.state.toLowerCase()?Z`
          <div class="take-clone-container" data-plant-id="${n.entity_id}">
            <input 
              type="number" 
              min="1" 
              max="10" 
              value="1"
              data-plant-id="${n.entity_id}"
              class="num-clones-input"
            >
            <button class="action-button primary" 
              @click=${t=>{const e=t.currentTarget.closest(".take-clone-container");if(!e)return;const s=e.querySelector(".num-clones-input"),i=s?parseInt(s.value,10):1;r.onTakeClone(n,i)}}
            >
              Take Clone
            </button>
          </div>
        `:""}
       ${"clone"===n.state.toLowerCase()?Z`
          <div class="move-clone-container" style="display: flex; gap: var(--spacing-md); align-items: center;">
            <!-- Growspace dropdown -->
            <select class="form-input">
              <option value="">Select Growspace</option>
              ${Object.entries(e).map(([t,e])=>Z`<option value="${t}">${e}</option>`)}
            </select>

            <!-- Checkbox to confirm sending clone -->
            <label style="display:flex; align-items:center; gap:4px;">
              <input type="checkbox">
              Confirm Move
            </label>

            <button class="action-button primary" 
              @click=${t=>{const e=t.currentTarget.closest(".move-clone-container");if(!e)return;const s=e.querySelector("select"),i=e.querySelector('input[type="checkbox"]'),a=s?.value,o=i?.checked;a?o?r.onMoveClone(n,a):alert("Please confirm moving the clone by checking the box."):alert("Please select a growspace.")}}
            >
              Move Clone
            </button>
          </div>
        `:""}
  
        ${"flower"===n.state.toLowerCase()?Z`
          <button class="action-button primary" @click=${()=>r.onHarvest(n)}>
            Harvest
          </button>
        `:""}

        ${"dry"===n.state.toLowerCase()?Z`
          <button class="action-button primary" @click=${()=>r.onFinishDrying(n)}>
            Finish Drying
          </button>
  `:""}
      </ha-dialog>
    `}static renderStrainLibraryDialog(t,e){if(!t?.open)return Z``;const r={},n=(t.searchQuery||"").toLowerCase();t.strains.forEach(t=>{const e=t.strain;(!n||e.toLowerCase().includes(n)||t.phenotype&&t.phenotype.toLowerCase().includes(n))&&(r[e]||(r[e]=[]),r[e].push(t))});const s=Object.keys(r).sort();return Z`
      <ha-dialog
        open
        @closed=${e.onClose}
        heading="Strain Library"
        class="strain-dialog"
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="dialog-content" style="position: relative; min-height: 400px;">

          <!-- Search Bar -->
          <div class="strain-search-container">
            <svg class="search-icon" viewBox="0 0 24 24">
                <path d="${"M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"}"></path>
            </svg>
            <input
                type="text" 
                class="search-input"
                placeholder="Search strains & phenotypes..."
                .value=${t.searchQuery||""}
                @input=${t=>e.onSearch(t.target.value)}
            />
          </div>

          <!-- Strain Table -->
          <div class="strain-table-container">
            ${s.length>0?Z`
              <table class="strain-table">
                ${s.map(n=>{const s=t.expandedStrains?.includes(n),i=r[n];return i.filter(t=>t.phenotype).length,Z`
                    <tr class="strain-row" @click=${()=>e.onToggleExpand(n)}>
                      <td class="strain-cell expand-icon">
                        <svg style="width:24px;height:24px;fill:currentColor;"
                             class="rotate-icon ${s?"expanded":""}"
                             viewBox="0 0 24 24">
                          <path d="${"M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"}"></path>
                        </svg>
                      </td>
                      <td class="strain-cell content">
                        ${n}
                        <span class="badge">${i.length} Var.</span>
                      </td>
                    </tr>
                    ${s?Z`
                      <tr class="pheno-row">
                        <td colspan="3" class="pheno-list">
                           ${i.map(t=>Z`
                              <div class="pheno-item">
                                <span>${t.phenotype||"Default (No Phenotype)"}</span>
                                <button
                                  class="remove-button"
                                  title="Remove ${t.strain} ${t.phenotype}"
                                  @click=${r=>{r.stopPropagation(),e.onRemoveStrain(t.key)}}
                                >
                                  <svg class="remove-icon" viewBox="0 0 24 24">
                                    <path d="${gt}"></path>
                                  </svg>
                                </button>
                              </div>
                           `)}
                        </td>
                      </tr>
                    `:R}
                  `})}
              </table>
            `:Z`
              <div class="no-data" style="background: transparent;">
                ${0===t.strains.length?"Library is empty. Add your first strain!":"No matches found."}
              </div>
            `}
          </div>

          <!-- FAB for Adding Strains -->
          <button class="fab-button" @click=${e.onToggleAddForm}>
             <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${t.isAddFormOpen?gt:wt}"></path>
             </svg>
          </button>

          <!-- Add Strain Form Overlay -->
          ${t.isAddFormOpen?Z`
            <div class="add-form-overlay">
                <h3 style="margin-top:0; margin-bottom: var(--spacing-md);">Add New Strain</h3>
                <div class="form-group">
                  <label>Strain Name</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Strain Name"
                    .value=${t.newStrain}
                    @input=${t=>e.onNewStrainChange(t.target.value)}
                    @keypress=${e.onEnterKey}
                  />
                </div>
                <div class="form-group">
                  <label>Phenotype (Optional)</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="Phenotype (e.g. #1)"
                    .value=${t.newPhenotype||""}
                    @input=${t=>e.onNewPhenotypeChange(t.target.value)}
                    @keypress=${e.onEnterKey}
                  />
                </div>
                <div style="display:flex; justify-content: flex-end; margin-top: var(--spacing-md);">
                    <button class="action-button primary" @click=${e.onAddStrain} ?disabled=${!t.newStrain}>
                      Add
                    </button>
                </div>
            </div>
          `:R}

          <!-- Clear All Confirmation Overlay -->
          ${t.confirmClearAll?Z`
             <div class="confirmation-overlay">
                 <span style="color: white;">Delete all strains?</span>
                 <button class="action-button danger" @click=${e.onClearAll}>Yes</button>
                 <button class="action-button" @click=${e.onCancelClear}>No</button>
             </div>
          `:R}

        </div>

        <!-- Footer Actions -->
        <div slot="secondaryAction">
           ${t.confirmClearAll?R:Z`
              <button class="action-button danger" @click=${e.onPromptClear} ?disabled=${0===t.strains.length}>
                Clear All
              </button>
           `}
        </div>

        <button class="action-button" slot="primaryAction" @click=${e.onClose}>
          Done
        </button>
      </ha-dialog>
    `}static renderTextInput(t,e,r){return Z`
      <div class="form-group">
        <label>${t}</label>
        <input 
          type="text" 
          class="form-input"
          .value=${e}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderNumberInput(t,e,r){return Z`
      <div class="form-group">
        <label>${t}</label>
        <input 
          type="number" 
          class="form-input"
          min="1"
          .value=${e}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderDateTimeInput(t,e,r,n){return Z`
      <div class="form-group">
        <label>
          <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
            <path d="${e}"></path>
          </svg>
          ${t}
        </label>
        <input 
          type="datetime-local" 
          class="form-input"
          .value=${r}
          @input=${t=>n(t.target.value)}
        />
      </div>
    `}static renderPlantStats(t){return t.attributes?.veg_days||t.attributes?.flower_days||t.attributes?.dry_days||t.attributes?.cure_days?Z`
      <div style="background: rgba(var(--rgb-info-color, 33, 150, 243), 0.05); padding: var(--spacing-md); border-radius: var(--border-radius); border-left: 4px solid var(--info-color, #2196F3);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="margin-right: 5px"><strong>Current Stage:</strong> ${t.state}</span>
          <div style="display: flex; gap: var(--spacing-md);">
            ${t.attributes?.veg_days?Z`<span>${t.attributes.veg_days} days veg</span>`:""}
            ${t.attributes?.flower_days?Z`<span>${t.attributes.flower_days} days flower</span>`:""}
            ${t.attributes?.dry_days?Z`<span>${t.attributes.dry_days} days drying</span>`:""}
            ${t.attributes?.cure_days?Z`<span>${t.attributes.cure_days} days curing</span>`:""}
          </div>
        </div>
      </div>
    `:Z``}}let Zs=class extends ot{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._strainLibraryDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1,this._handleTakeClone=t=>{const e=t.attributes?.plant_id||t.entity_id.replace("sensor.","");this.hass.callService("growspace_manager","take_clone",{mother_plant_id:e}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})},this.clonePlant=(t,e)=>{const r=t.attributes?.plant_id||t.entity_id.replace("sensor.",""),n=e;this.hass.callService("growspace_manager","take_clone",{mother_plant_id:r,num_clones:n}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})}}firstUpdated(){this.dataService=new Hs(this.hass),this.initializeSelectedDevice()}initializeSelectedDevice(){const t=this.dataService.getGrowspaceDevices();if(t.length&&!this.selectedDevice){if(this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);if(e)return void(this.selectedDevice=e.device_id)}this.selectedDevice=t[0].device_id}}static async getConfigElement(){await Promise.resolve().then(function(){return Rs});return document.createElement("growspace-manager-card-editor")}static getStubConfig(){return{default_growspace:"4x4",compact:!0}}setConfig(t){if(!t)throw new Error("Invalid configuration");this._config=t}getCardSize(){return 4}_handleDeviceChange(t){const e=t.target;this.selectedDevice=e.value}_handlePlantClick(t){this._plantOverviewDialog={open:!0,plant:t,editedAttributes:{...t.attributes}}}getHaDateTimeString(){const t=this.hass.config.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone;return Is.now().setZone(t).toFormat("yyyy-LL-dd'T'HH:mm")}_openAddPlantDialog(t,e){const r=this.getHaDateTimeString(),n=this.dataService.getStrainLibrary(),s=n.length>0?n[0].strain:"",i=n.length>0?n[0].phenotype:"";this._addPlantDialog={open:!0,row:t,col:e,strain:s,phenotype:i,veg_start:r,flower_start:r}}async _confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const{row:t,col:e,strain:r,phenotype:n,veg_start:s,flower_start:i}=this._addPlantDialog;try{const a={growspace_id:this.selectedDevice,row:t+1,col:e+1,strain:r,phenotype:n,veg_start:js.formatDateForBackend(s)??js.formatDateForBackend(js.getCurrentDateTime()),flower_start:js.formatDateForBackend(i)??js.formatDateForBackend(js.getCurrentDateTime())};console.log("Adding plant to growspace:",this.selectedDevice,a),console.log("Adding plant:",a),await this.dataService.addPlant(a),this._addPlantDialog=null}catch(t){console.error("Error adding plant:",t)}}async _updatePlant(){if(!this._plantOverviewDialog)return;const{plant:t,editedAttributes:e}=this._plantOverviewDialog,r={plant_id:t.attributes?.plant_id||t.entity_id.replace("sensor.","")},n=["seedling_start","mother_start","clone_start","veg_start","flower_start","dry_start","cure_start"];["strain","phenotype","row","col",...n].forEach(t=>{if(void 0!==e[t]&&null!==e[t])if(n.includes(t)){const n=js.formatDateForBackend(String(e[t]));n&&(r[t]=n)}else r[t]=e[t]});try{await this.dataService.updatePlant(r),this._plantOverviewDialog=null}catch(t){console.error("Error updating plant:",t)}}async _handleDeletePlant(t){if(confirm("Are you sure you want to delete this plant?"))try{await this.dataService.removePlant(t),this._plantOverviewDialog=null}catch(t){console.error("Error deleting plant:",t)}}async _movePlantToNextStage(t){if(!this._plantOverviewDialog?.plant)return void console.error("No plant found in overview dialog");const e=this._plantOverviewDialog.plant,r=e.attributes?.stage;let n="";const s=new Set(["mother","flower","dry","cure"]);if(r&&s.has(r)){"flower"===r?n="dry":"dry"===r?n="cure":"mother"===r?n="clone":(console.error("Unknown stage, cannot move plant",n),n="error");try{const t=e.attributes?.plant_id||e.entity_id.replace("sensor.","");await this.dataService.harvestPlant(t,n),this._plantOverviewDialog=null}catch(t){console.error("Error moving plant to next stage:",t)}}else alert("Plant must be in mother or flower or dry or cure stage to move. stage is "+r)}async _harvestPlant(t){await this._movePlantToNextStage(t)}async _finishDryingPlant(t){await this._movePlantToNextStage(t)}_openStrainLibraryDialog(){const t=this.dataService.getStrainLibrary();this._strainLibraryDialog={open:!0,newStrain:"",newPhenotype:"",strains:t,searchQuery:"",isAddFormOpen:!1,expandedStrains:[],confirmClearAll:!1}}_toggleStrainExpansion(t){if(!this._strainLibraryDialog)return;const e=this._strainLibraryDialog.expandedStrains||[],r=e.includes(t);this._strainLibraryDialog.expandedStrains=r?e.filter(e=>e!==t):[...e,t],this.requestUpdate()}_setStrainSearchQuery(t){this._strainLibraryDialog&&(this._strainLibraryDialog.searchQuery=t,this.requestUpdate())}_toggleAddStrainForm(){this._strainLibraryDialog&&(this._strainLibraryDialog.isAddFormOpen=!this._strainLibraryDialog.isAddFormOpen,this.requestUpdate())}_promptClearAll(){this._strainLibraryDialog&&(this._strainLibraryDialog.confirmClearAll=!0,this.requestUpdate())}_cancelClearAll(){this._strainLibraryDialog&&(this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate())}async _addStrain(){if(!this._strainLibraryDialog?.newStrain)return;const t=this._strainLibraryDialog.newStrain,e=this._strainLibraryDialog.newPhenotype;try{await this.dataService.addStrain(t,e);const r=`${t}|${e||"default"}`,n={strain:t,phenotype:e,key:r};this._strainLibraryDialog.strains.some(t=>t.key===r)||this._strainLibraryDialog.strains.push(n),this._strainLibraryDialog.newStrain="",this._strainLibraryDialog.newPhenotype="",this._strainLibraryDialog.isAddFormOpen=!1,this.requestUpdate()}catch(t){console.error("Error adding strain:",t)}}async _removeStrain(t){if(this._strainLibraryDialog)try{const e=t.split("|"),r=e[0],n=e.length>1&&"default"!==e[1]?e[1]:void 0;await this.dataService.removeStrain(r,n),this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e.key!==t),this.requestUpdate()}catch(t){console.error("Error removing strain:",t)}}async _clearStrains(){await this.dataService.clearStrainLibrary(),this._strainLibraryDialog&&(this._strainLibraryDialog.strains=[],this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate())}updateGrid(){this.dataService=new Hs(this.hass),this.requestUpdate()}_handleDragStart(t,e){this._draggedPlant=e,t.dataTransfer?.setData("text/plain",JSON.stringify({id:e.entity_id}));t.target.classList.add("dragging")}_handleDragEnd(t){t.target.classList.remove("dragging")}_handleDragOver(t){t.preventDefault()}async _handleDrop(t,e,r,n){if(t.preventDefault(),!this._draggedPlant||!this.selectedDevice)return;const s=this._draggedPlant;this._draggedPlant=null;try{if(n){const t=s.attributes.plant_id||s.entity_id.replace("sensor.",""),e=n.attributes.plant_id||n.entity_id.replace("sensor.","");await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e}),this.updateGrid()}else await this._movePlant(s,e,r)}catch(t){console.error("Error during drag-and-drop:",t)}}async _movePlant(t,e,r){try{const n=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.dataService.updatePlant({plant_id:n,row:e,col:r})}catch(t){console.error("Error moving plant:",t)}}_moveClonePlant(t,e){this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Moved clone ${t.attributes.friendly_name} to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})}render(){if(!this.hass)return Z`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;this.dataService=new Hs(this.hass);const t=this.dataService.getGrowspaceDevices();if(!t.length)return Z`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;if(!this._defaultApplied&&this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);e&&(this.selectedDevice=e.device_id),this._defaultApplied=!0}this.selectedDevice&&t.find(t=>t.device_id===this.selectedDevice)||(this.selectedDevice=t[0].device_id);const e=t.find(t=>t.device_id===this.selectedDevice);if(!e)return Z`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;const r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;r&&Object.entries(r).forEach(([t,e])=>{});const n=js.calculateEffectiveRows(e),{grid:s}=js.createGridLayout(e.plants,n,e.plants_per_row),i=e.plants_per_row>6;return Z`
      <ha-card class=${i?"wide-growspace":""}>
        ${this.renderHeader(t)}
        ${this.renderGrid(s,n,e.plants_per_row)}
      </ha-card>
      
      ${this.renderDialogs()}
    `}renderHeader(t){const e=t.find(t=>t.device_id===this.selectedDevice);return Z`
      <div class="header">
        ${this._config?.title?Z`<h2 class="header-title">${this._config.title}</h2>`:""}
        
        <div class="selector-container">
          ${this._config?.default_growspace?Z`<span class="selected-growspace">${e?.name}</span>`:Z`
            <label for="device-select">Growspace:</label>
            <select 
              id="device-select" 
              class="growspace-select"
              .value=${this.selectedDevice||""} 
              @change=${this._handleDeviceChange}
            >
              ${t.map(t=>Z`<option value="${t.device_id}">${t.name}</option>`)}
            </select>
          `}
        </div>

        <div style="display: flex; gap: var(--spacing-sm); align-items: center;">
          <div class="view-toggle">
            <input 
              type="checkbox" 
              id="compact-view" 
              .checked=${this._isCompactView}
              @change=${t=>this._isCompactView=t.target.checked}
            >
            <label for="compact-view">Compact</label>
          </div>
          
          <button class="action-button" @click=${this._openStrainLibraryDialog}>
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${ft}"></path>
            </svg>
            Strains
          </button>
        </div>
      </div>
    `}renderGrid(t,e,r){return Z`
      <div class="grid ${this._isCompactView?"compact":""}" 
           style="grid-template-columns: repeat(${r}, 1fr); grid-template-rows: repeat(${e}, 1fr);">
        ${t.flat().map((t,e)=>{const n=Math.floor(e/r)+1,s=e%r+1;return t?this.renderPlantSlot(t,n,s):this.renderEmptySlot(n,s)})}
      </div>
    `}renderEmptySlot(t,e){return Z`
      <div 
        class="plant empty" 
        style="grid-row: ${t}; grid-column: ${e}" 
        @click=${()=>this._openAddPlantDialog(t-1,e-1)}
        @dragover=${this._handleDragOver}
        @drop=${r=>this._handleDrop(r,t,e,null)}
      >
        <div class="plant-header">
          <svg class="plant-icon" viewBox="0 0 24 24">
            <path d="${wt}"></path>
          </svg>
        </div>
        <div class="plant-name">Add Plant</div>
        <div class="plant-stage">Empty Slot</div>
      </div>
    `}renderPlantSlot(t,e,r){const n=js.getPlantStageColor(t.state),s=js.getPlantStageIcon(t.state);return Z`
      <div 
        class="plant" 
        style="grid-row: ${e}; grid-column: ${r}; --stage-color: ${n}" 
        draggable="true"
        @dragstart=${e=>this._handleDragStart(e,t)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${n=>this._handleDrop(n,e,r,t)}
        @click=${()=>this._handlePlantClick(t)}
      >
        <div class="plant-header">
          <svg class="plant-icon" viewBox="0 0 24 24">
            <path d="${s}"></path>
          </svg>
        </div>

        <!-- Always render strain slot -->
        <div class="plant-name">
          ${t.attributes?.strain||"—"}
        </div>

        <!-- Always render phenotype slot -->
        <div class="plant-phenotype">
          ${t.attributes?.phenotype||"—"}
        </div>

        <!-- Always render state slot -->
        <div class="plant-stage">
          ${t.state||"—"}
        </div>

        <!-- Always render plant-days slot -->
        <div class="plant-days">
          ${this._isCompactView?"—":this.renderPlantDays(t)}
        </div>
      </div>
    `}renderPlantDays(t){const e=[{days:t.attributes?.seedling_days,icon:bt,title:"Days in Seedling",stage:"seedling"},{days:t.attributes?.mother_days,icon:bt,title:"Days in Mother",stage:"mother"},{days:t.attributes?.clone_days,icon:bt,title:"Days in Clone",stage:"clone"},{days:t.attributes?.veg_days,icon:bt,title:"Days in Vegetative",stage:"vegetative"},{days:t.attributes?.flower_days,icon:yt,title:"Days in Flower",stage:"flower"},{days:t.attributes?.dry_days,icon:vt,title:"Days in Dry",stage:"dry"},{days:t.attributes?.cure_days,icon:pt,title:"Days in Cure",stage:"cure"}].filter(t=>t.days);return e.length?Z`
      <div class="plant-days">
        ${e.map(({days:t,icon:e,title:r,stage:n})=>{const s=js.getPlantStageColor(n);return Z`
            <span title="${r}" style="color: ${s}">
              <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${e}"></path>
              </svg>
              ${t}d
            </span>
          `})}
      </div>
    `:Z``}renderDialogs(){const t=this.dataService?.getStrainLibrary()||[],e={},r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;return r&&Object.entries(r).forEach(([t,r])=>{e[t]=r}),Z`
      ${Us.renderAddPlantDialog(this._addPlantDialog,t,{onClose:()=>this._addPlantDialog=null,onConfirm:()=>this._confirmAddPlant(),onStrainChange:e=>{if(this._addPlantDialog){this._addPlantDialog.strain=e;const r=t.find(t=>t.strain===e);r&&r.phenotype?this._addPlantDialog.phenotype=r.phenotype:this._addPlantDialog.phenotype=""}},onPhenotypeChange:t=>{this._addPlantDialog&&(this._addPlantDialog.phenotype=t)},onVegStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.veg_start=t)},onFlowerStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.flower_start=t)}})}

      ${Us.renderPlantOverviewDialog(this._plantOverviewDialog,e,{onClose:()=>this._plantOverviewDialog=null,onUpdate:()=>{this._updatePlant()},onDelete:t=>{this._handleDeletePlant(t)},onHarvest:t=>{this._harvestPlant(t)},onClone:(t,e)=>{this.clonePlant(t,e)},onTakeClone:(t,e)=>{this.clonePlant(t,e)},onMoveClone:(t,e)=>{this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Clone ${t.attributes.friendly_name} moved to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})},onFinishDrying:t=>{this._finishDryingPlant(t)},_harvestPlant:this._harvestPlant.bind(this),_finishDryingPlant:this._finishDryingPlant.bind(this),onAttributeChange:(t,e)=>{this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes[t]=e)}})}

      ${Us.renderStrainLibraryDialog(this._strainLibraryDialog,{onClose:()=>this._strainLibraryDialog=null,onAddStrain:()=>this._addStrain(),onRemoveStrain:t=>this._removeStrain(t),onClearAll:()=>this._clearStrains(),onNewStrainChange:t=>{this._strainLibraryDialog&&(this._strainLibraryDialog.newStrain=t)},onNewPhenotypeChange:t=>{this._strainLibraryDialog&&(this._strainLibraryDialog.newPhenotype=t)},onEnterKey:t=>{"Enter"===t.key&&this._addStrain()},onToggleExpand:t=>this._toggleStrainExpansion(t),onSearch:t=>this._setStrainSearchQuery(t),onToggleAddForm:()=>this._toggleAddStrainForm(),onPromptClear:()=>this._promptClearAll(),onCancelClear:()=>this._cancelClearAll()})}
    `}};Zs.styles=[zs,o`
      :host {
        display: block;
        font-family: 'Roboto', sans-serif;
        color: var(--growspace-card-text);
      }

      ha-card {
        padding: var(--spacing-lg);
        border-radius: var(--border-radius-lg);
        background: var(--growspace-card-bg);
        box-shadow: var(--card-shadow);
        transition: var(--transition-medium);
      }

      ha-card:hover {
        box-shadow: var(--card-shadow-hover);
      }

      ha-card.wide-growspace .plant-name,
      ha-card.wide-growspace .plant-stage,
      ha-card.wide-growspace .plant-phenotype {
        font-size: var(--font-size-sm);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--spacing-md);
        padding: var(--spacing-sm) 0;
        border-bottom: 2px solid var(--divider-color);
      }

      .header-title {
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-bold);
        margin: 0;
      }

      .selector-container {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        flex: 1;
        text-transform: capitalize;
      }
      
      .growspace-select {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 2px solid var(--divider-color);
        border-radius: var(--border-radius-md);
        background: var(--growspace-card-bg);
        color: var(--growspace-card-text);
        font-family: inherit;
        font-size: var(--font-size-sm);
        cursor: pointer;
        min-width: 180px;
        transition: var(--transition-fast);
      }

      .growspace-select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
      }

      .action-button {
        padding: var(--spacing-sm) var(--spacing-md);
        border: none;
        border-radius: var(--border-radius-md);
        font-family: inherit;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs);
        background: var(--plant-border-color-default);
        color: var(--growspace-card-text);
        box-shadow: var(--card-shadow);
        transition: var(--transition-fast);
      }

      .action-button:hover {
        transform: translateY(-2px);
        box-shadow: var(--card-shadow-hover);
      }

      .view-toggle {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-size: var(--font-size-xs);
        color: var(--secondary-text-color);
      }

      .grid {
        display: grid;
        gap: var(--spacing-md);
        margin-top: var(--spacing-lg);
        padding: var(--spacing-sm);
      }

      .grid.compact {
        gap: var(--spacing-sm);
      }

      .plant {
        border: 2px solid transparent;
        border-radius: var(--border-radius-md);
        text-align: center;
        padding: var(--spacing-md);
        background: var(--growspace-card-bg);
        box-shadow: var(--card-shadow);
        transition: var(--transition-medium);
        min-height: 100px;
        display: grid; 
          grid-template-columns: 1fr; 
          grid-template-rows: 2fr 1fr 1fr 2fr; 
          gap: 0px 0px; 
          grid-template-areas: 
            "icon"
            "name"
            "stage"
            "days"; 
        align-items: center;
        justify-items: center;
        cursor: pointer;
        aspect-ratio: 1;
        position: relative;
        overflow: hidden;
      }

      .plant::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--plant-border-color-default);
        transition: var(--transition-medium);
      }

      .plant:hover {
        transform: translateY(-4px);
        box-shadow: var(--card-shadow-hover);
        border-color: var(--plant-border-color-default);
      }

      .plant.empty {
        background: var(--growspace-empty-bg);
        border: 2px dashed var(--divider-color);
        opacity: 0.7;
      }

      .plant.empty:hover {
        opacity: 1;
        background: var(--growspace-empty-bg-hover);
        border-color: var(--plant-border-color-default);
      }

      .plant.dragging {
        opacity: 0.5;
        transform: rotate(5deg);
      }
      .plant-name,
      .plant-phenotype,
      .plant-stage,
      .plant-days {
        min-height: 1.2em; /* reserve space */
        text-align: center;
      }

      .plant-phenotype:empty::before,
      .plant-name:empty::before,
      .plant-stage:empty::before,
      .plant-days:empty::before {
        content: "—";
        color: var(--disabled-text-color);
      }

      .plant-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-xs);
        color: var(--stage-color, var(--secondary-text-color));
      }

      .plant.empty .plant-header {
        margin-top: inherit;
      }

      .plant-icon {
        width: 2rem;
        height: 2rem;
        fill: var(--stage-color, var(--secondary-text-color));
      }

      .plant-name {
        font-weight: var(--font-weight-bold);
        color: var(--growspace-card-text);
        font-size: var(--font-size-lg);
        margin-bottom: var(--spacing-xs);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .plant-stage {
        color: var(--stage-color, var(--secondary-text-color));
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--spacing-xs);
        text-transform: capitalize;
      }

      .plant-phenotype {
        color: var(--secondary-text-color);
        font-size: var(--font-size-md);
        margin-bottom: var(--spacing-xs);
        font-style: italic;
      }

      .plant-days {
        display: flex;
        justify-content: space-around;
        align-items: center;
        font-size: var(--font-size-md);
        color: var(--secondary-text-color);
        width: 100%;
      }

      .plant-days span {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 5px;
      }

      .compact .plant {
        min-height: 80px;
        padding: var(--spacing-sm);
      }

      .compact .plant-name {
        font-size: var(--font-size-sm);
      }

      .compact .plant-days {
        font-size: var(--font-size-xs);
      }

      ha-dialog {
        --mdc-dialog-border-radius: var(--border-radius-md);
        --mdc-dialog-box-shadow: var(--card-shadow-hover);
      }

      .no-data {
        text-align: center;
        color: var(--secondary-text-color);
        padding: var(--spacing-lg);
        font-style: italic;
        background: var(--growspace-empty-bg);
        border-radius: var(--border-radius-md);
        margin: var(--spacing-md) 0;
      }

      .error {
        color: var(--error-color);
        padding: var(--spacing-md);
        background: var(--error-bg);
        border: 1px solid var(--error-border);
        border-radius: var(--border-radius-md);
        margin: var(--spacing-md) 0;
      }
      /* Dialog Styles */
      ha-dialog {
        --mdc-dialog-border-radius: var(--border-radius);
        --mdc-dialog-box-shadow: var(--surface-elevation-hover);
      }
      
      ha-dialog .mdc-dialog--open .mdc-dialog__container,
      ha-dialog .mdc-dialog--open {
        align-items: start;
        margin-top: 5vh;
      }
      
      ha-dialog.strain-dialog .mdc-dialog--open .mdc-dialog__container .mdc-dialog__surface {
        width: 800px;
        max-width: 90vw;
        height: 600px;
        max-height: 90vh;
      }
      ha-dialog.strain-dialog .mdc-dialog--open .dialog-content .strain-library-header {
        justify-content: space-between;
      }
      ha-dialog.strain-dialog {
        --mdc-dialog-min-width: 45vw;
        --mdc-dialog-max-width: 45vw;
      }
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        padding: var(--spacing-md) 0;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }

      .form-group label {
        font-weight: 500;
        color: var(--primary-text-color);
        font-size: 0.9rem;
      }

      .form-input {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 2px solid var(--divider-color);
        border-radius: var(--border-radius);
        font-family: inherit;
        font-size: 0.9rem;
        transition: var(--transition);
        background: var(--card-background-color);
        color: var(--primary-text-color);
      }

      .form-input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
      }

      /* Strain Library Styles - Glassmorphism & Table */
      .strain-search-container {
        position: relative;
        margin-bottom: var(--spacing-md);
      }
      .search-input {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-lg);
        padding-left: 40px;
        border-radius: 24px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: var(--primary-text-color);
        backdrop-filter: blur(10px);
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
        transition: var(--transition);
      }
      .search-input:focus {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--primary-color);
        outline: none;
      }
      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        color: var(--secondary-text-color);
        pointer-events: none;
      }

      .strain-table-container {
        background: rgba(255, 255, 255, 0.02);
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        overflow: hidden;
        max-height: 60vh;
        overflow-y: auto;
      }

      .strain-table {
        width: 100%;
        border-collapse: collapse;
      }

      .strain-row {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .strain-row:last-child {
        border-bottom: none;
      }
      .strain-row:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .strain-cell {
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
      }
      .strain-cell.expand-icon {
        width: 40px;
        justify-content: center;
        color: var(--secondary-text-color);
      }
      .strain-cell.content {
        flex: 1;
        font-weight: 500;
        font-size: 1.1rem;
      }
      .strain-cell.actions {
        justify-content: flex-end;
        gap: var(--spacing-sm);
      }

      .pheno-row {
        background: rgba(0, 0, 0, 0.2);
      }
      .pheno-list {
        padding: var(--spacing-sm) var(--spacing-lg);
      }
      .pheno-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--spacing-sm) 0;
        border-bottom: 1px dashed rgba(255,255,255,0.1);
        color: var(--secondary-text-color);
      }
      .pheno-item:last-child {
        border-bottom: none;
      }

      .fab-button {
        position: absolute;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--plant-border-color-default);
        color: var(--growspace-card-text);
        border: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: 10;
      }
      .fab-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0,0,0,0.4);
      }
      .fab-button:active {
        transform: scale(0.95);
      }

      /* Add Form Overlay */
      .add-form-overlay {
        position: absolute;
        bottom: 90px;
        right: 24px;
        width: 300px;
        background: var(--card-background-color);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: var(--spacing-md);
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        backdrop-filter: blur(12px);
        z-index: 10;
        animation: slideUp 0.3s ease-out;
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .badge {
        background: rgba(255,255,255,0.1);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.8em;
        margin-left: 8px;
        color: var(--secondary-text-color);
      }

      /* Clear Confirmation */
      .confirmation-overlay {
        position: absolute;
        bottom: 24px;
        left: 24px;
        background: var(--error-bg);
        border: 1px solid var(--error-border);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: 24px;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: fadeIn 0.2s ease-out;
      }

      .rotate-icon {
         transition: transform 0.3s ease;
      }
      .rotate-icon.expanded {
         transform: rotate(90deg);
      }

      @media (max-width: 600px) {
        .header {
          flex-direction: column;
          align-items: stretch;
        }
        .selector-container {
          justify-content: center;
        }
        .grid {
          gap: var(--spacing-sm);
        }
        .plant {
          min-height: 80px;
        }
        /* Mobile specific dialog adjustments */
        ha-dialog.strain-dialog .mdc-dialog__surface {
            width: 100vw !important;
            height: 100vh !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
        }
        .fab-button {
            bottom: 16px;
            right: 16px;
        }
        .add-form-overlay {
            bottom: 80px;
            right: 16px;
            left: 16px;
            width: auto;
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .plant {
        animation: fadeIn 0.3s ease-out;
      }
    `],t([mt(),e("design:type",Object)],Zs.prototype,"_addPlantDialog",void 0),t([mt(),e("design:type",Object)],Zs.prototype,"_defaultApplied",void 0),t([mt(),e("design:type",Object)],Zs.prototype,"_plantOverviewDialog",void 0),t([mt(),e("design:type",Object)],Zs.prototype,"_strainLibraryDialog",void 0),t([mt(),e("design:type",Object)],Zs.prototype,"selectedDevice",void 0),t([mt(),e("design:type",Object)],Zs.prototype,"_draggedPlant",void 0),t([mt(),e("design:type",Boolean)],Zs.prototype,"_isCompactView",void 0),t([ht({attribute:!1}),e("design:type",Object)],Zs.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],Zs.prototype,"_config",void 0),Zs=t([ct("growspace-manager-card")],Zs);let Ws=class extends ot{constructor(){super(...arguments),this._growspaceOptions=[]}setConfig(t){this._config=t,this._loadGrowspaces()}updated(t){t.has("hass")&&this.hass&&(this._loadGrowspaces(),this._subscribeToSensorUpdates())}disconnectedCallback(){super.disconnectedCallback(),this._unsubStateChanged&&(this._unsubStateChanged(),this._unsubStateChanged=void 0)}_subscribeToSensorUpdates(){this.hass&&!this._unsubStateChanged&&(this._unsubStateChanged=this.hass.connection.subscribeEvents(t=>{const e=t.data.new_state;"sensor.growspaces_list"===e?.entity_id&&(Array.isArray(e.attributes?.growspaces)?this._growspaceOptions=e.attributes.growspaces:this._growspaceOptions=[])},"state_changed"))}_loadGrowspaces(){if(!this.hass)return;const t=this.hass.states["sensor.growspaces_list"];if(t&&t.attributes?.growspaces){const e=t.attributes.growspaces;this._growspaceOptions=Object.values(e)}else this._growspaceOptions=[]}render(){return this._config?Z`
      <div class="form-group">
        <label>Default Growspace</label>
        <select
          .value=${this._config.default_growspace??""}
          @change=${t=>this._valueChanged("default_growspace",t.target.value)}
        >
          <option value="">Select a growspace</option>
          ${0===this._growspaceOptions.length?Z`<option disabled>No growspaces found</option>`:this._growspaceOptions.map(t=>Z`<option value="${t}">${t}</option>`)}
        </select>
      </div>
    `:Z``}_valueChanged(t,e){if(!this._config)return;const r={...this._config,[t]:e};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:r},bubbles:!0,composed:!0}))}};Ws.styles=o`
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
  `,t([ht({attribute:!1}),e("design:type",Object)],Ws.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],Ws.prototype,"_config",void 0),t([mt(),e("design:type",Array)],Ws.prototype,"_growspaceOptions",void 0),Ws=t([ct("growspace-manager-card-editor")],Ws);var Rs=Object.freeze({__proto__:null,get GrowspaceManagerCardEditor(){return Ws}});export{Zs as GrowspaceManagerCard};
