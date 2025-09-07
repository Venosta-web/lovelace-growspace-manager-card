function t(t,e,r,n){var i,s=arguments.length,a=s<3?e:null===n?n=Object.getOwnPropertyDescriptor(e,r):n;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,r,n);else for(var o=t.length-1;o>=0;o--)(i=t[o])&&(a=(s<3?i(a):s>3?i(e,r,a):i(e,r))||a);return s>3&&a&&Object.defineProperty(e,r,a),a}function e(t,e){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(t,e)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const r=globalThis,n=r.ShadowRoot&&(void 0===r.ShadyCSS||r.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,i=Symbol(),s=new WeakMap;class a{constructor(t,e,r){if(this._$cssResult$=!0,r!==i)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(n&&void 0===t){const r=void 0!==e&&1===e.length;r&&(t=s.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),r&&s.set(e,t))}return t}toString(){return this.cssText}}const o=(t,...e)=>{const r=1===t.length?t[0]:e.reduce((e,r,n)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+t[n+1],t[0]);return new a(r,t,i)},l=n?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const r of t.cssRules)e+=r.cssText;return(t=>new a("string"==typeof t?t:t+"",void 0,i))(e)})(t):t,{is:c,defineProperty:u,getOwnPropertyDescriptor:d,getOwnPropertyNames:h,getOwnPropertySymbols:m,getPrototypeOf:f}=Object,p=globalThis,g=p.trustedTypes,y=g?g.emptyScript:"",v=p.reactiveElementPolyfillSupport,w=(t,e)=>t,b={toAttribute(t,e){switch(e){case Boolean:t=t?y:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let r=t;switch(e){case Boolean:r=null!==t;break;case Number:r=null===t?null:Number(t);break;case Object:case Array:try{r=JSON.parse(t)}catch(t){r=null}}return r}},_=(t,e)=>!c(t,e),S={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:_};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),p.litPropertyMetadata??=new WeakMap;class $ extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=S){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const r=Symbol(),n=this.getPropertyDescriptor(t,r,e);void 0!==n&&u(this.prototype,t,n)}}static getPropertyDescriptor(t,e,r){const{get:n,set:i}=d(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:n,set(e){const s=n?.call(this);i?.call(this,e),this.requestUpdate(t,s,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??S}static _$Ei(){if(this.hasOwnProperty(w("elementProperties")))return;const t=f(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(w("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(w("properties"))){const t=this.properties,e=[...h(t),...m(t)];for(const r of e)this.createProperty(r,t[r])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,r]of e)this.elementProperties.set(t,r)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const r=this._$Eu(t,e);void 0!==r&&this._$Eh.set(r,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const r=new Set(t.flat(1/0).reverse());for(const t of r)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const r=e.attribute;return!1===r?void 0:"string"==typeof r?r:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const r of e.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(n)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const n of e){const e=document.createElement("style"),i=r.litNonce;void 0!==i&&e.setAttribute("nonce",i),e.textContent=n.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,r){this._$AK(t,r)}_$ET(t,e){const r=this.constructor.elementProperties.get(t),n=this.constructor._$Eu(t,r);if(void 0!==n&&!0===r.reflect){const i=(void 0!==r.converter?.toAttribute?r.converter:b).toAttribute(e,r.type);this._$Em=t,null==i?this.removeAttribute(n):this.setAttribute(n,i),this._$Em=null}}_$AK(t,e){const r=this.constructor,n=r._$Eh.get(t);if(void 0!==n&&this._$Em!==n){const t=r.getPropertyOptions(n),i="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:b;this._$Em=n;const s=i.fromAttribute(e,t.type);this[n]=s??this._$Ej?.get(n)??s,this._$Em=null}}requestUpdate(t,e,r){if(void 0!==t){const n=this.constructor,i=this[t];if(r??=n.getPropertyOptions(t),!((r.hasChanged??_)(i,e)||r.useDefault&&r.reflect&&i===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,r))))return;this.C(t,e,r)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:r,reflect:n,wrapped:i},s){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,s??e??this[t]),!0!==i||void 0!==s)||(this._$AL.has(t)||(this.hasUpdated||r||(e=void 0),this._$AL.set(t,e)),!0===n&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,r]of t){const{wrapped:t}=r,n=this[e];!0!==t||this._$AL.has(e)||void 0===n||this.C(e,void 0,r,n)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[w("elementProperties")]=new Map,$[w("finalized")]=new Map,v?.({ReactiveElement:$}),(p.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const k=globalThis,D=k.trustedTypes,C=D?D.createPolicy("lit-html",{createHTML:t=>t}):void 0,x="$lit$",O=`lit$${Math.random().toFixed(9).slice(2)}$`,T="?"+O,A=`<${T}>`,M=document,E=()=>M.createComment(""),N=t=>null===t||"object"!=typeof t&&"function"!=typeof t,V=Array.isArray,I="[ \t\n\f\r]",L=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,P=/-->/g,F=/>/g,Z=RegExp(`>|${I}(?:([^\\s"'>=/]+)(${I}*=${I}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),z=/'/g,H=/"/g,W=/^(?:script|style|textarea|title)$/i,j=(t=>(e,...r)=>({_$litType$:t,strings:e,values:r}))(1),U=Symbol.for("lit-noChange"),R=Symbol.for("lit-nothing"),q=new WeakMap,Y=M.createTreeWalker(M,129);function G(t,e){if(!V(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(e):e}const J=(t,e)=>{const r=t.length-1,n=[];let i,s=2===e?"<svg>":3===e?"<math>":"",a=L;for(let e=0;e<r;e++){const r=t[e];let o,l,c=-1,u=0;for(;u<r.length&&(a.lastIndex=u,l=a.exec(r),null!==l);)u=a.lastIndex,a===L?"!--"===l[1]?a=P:void 0!==l[1]?a=F:void 0!==l[2]?(W.test(l[2])&&(i=RegExp("</"+l[2],"g")),a=Z):void 0!==l[3]&&(a=Z):a===Z?">"===l[0]?(a=i??L,c=-1):void 0===l[1]?c=-2:(c=a.lastIndex-l[2].length,o=l[1],a=void 0===l[3]?Z:'"'===l[3]?H:z):a===H||a===z?a=Z:a===P||a===F?a=L:(a=Z,i=void 0);const d=a===Z&&t[e+1].startsWith("/>")?" ":"";s+=a===L?r+A:c>=0?(n.push(o),r.slice(0,c)+x+r.slice(c)+O+d):r+O+(-2===c?e:d)}return[G(t,s+(t[r]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),n]};class B{constructor({strings:t,_$litType$:e},r){let n;this.parts=[];let i=0,s=0;const a=t.length-1,o=this.parts,[l,c]=J(t,e);if(this.el=B.createElement(l,r),Y.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(n=Y.nextNode())&&o.length<a;){if(1===n.nodeType){if(n.hasAttributes())for(const t of n.getAttributeNames())if(t.endsWith(x)){const e=c[s++],r=n.getAttribute(t).split(O),a=/([.?@])?(.*)/.exec(e);o.push({type:1,index:i,name:a[2],strings:r,ctor:"."===a[1]?et:"?"===a[1]?rt:"@"===a[1]?nt:tt}),n.removeAttribute(t)}else t.startsWith(O)&&(o.push({type:6,index:i}),n.removeAttribute(t));if(W.test(n.tagName)){const t=n.textContent.split(O),e=t.length-1;if(e>0){n.textContent=D?D.emptyScript:"";for(let r=0;r<e;r++)n.append(t[r],E()),Y.nextNode(),o.push({type:2,index:++i});n.append(t[e],E())}}}else if(8===n.nodeType)if(n.data===T)o.push({type:2,index:i});else{let t=-1;for(;-1!==(t=n.data.indexOf(O,t+1));)o.push({type:7,index:i}),t+=O.length-1}i++}}static createElement(t,e){const r=M.createElement("template");return r.innerHTML=t,r}}function K(t,e,r=t,n){if(e===U)return e;let i=void 0!==n?r._$Co?.[n]:r._$Cl;const s=N(e)?void 0:e._$litDirective$;return i?.constructor!==s&&(i?._$AO?.(!1),void 0===s?i=void 0:(i=new s(t),i._$AT(t,r,n)),void 0!==n?(r._$Co??=[])[n]=i:r._$Cl=i),void 0!==i&&(e=K(t,i._$AS(t,e.values),i,n)),e}class Q{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:r}=this._$AD,n=(t?.creationScope??M).importNode(e,!0);Y.currentNode=n;let i=Y.nextNode(),s=0,a=0,o=r[0];for(;void 0!==o;){if(s===o.index){let e;2===o.type?e=new X(i,i.nextSibling,this,t):1===o.type?e=new o.ctor(i,o.name,o.strings,this,t):6===o.type&&(e=new it(i,this,t)),this._$AV.push(e),o=r[++a]}s!==o?.index&&(i=Y.nextNode(),s++)}return Y.currentNode=M,n}p(t){let e=0;for(const r of this._$AV)void 0!==r&&(void 0!==r.strings?(r._$AI(t,r,e),e+=r.strings.length-2):r._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,r,n){this.type=2,this._$AH=R,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=r,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=K(this,t,e),N(t)?t===R||null==t||""===t?(this._$AH!==R&&this._$AR(),this._$AH=R):t!==this._$AH&&t!==U&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>V(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==R&&N(this._$AH)?this._$AA.nextSibling.data=t:this.T(M.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:r}=t,n="number"==typeof r?this._$AC(t):(void 0===r.el&&(r.el=B.createElement(G(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===n)this._$AH.p(e);else{const t=new Q(n,this),r=t.u(this.options);t.p(e),this.T(r),this._$AH=t}}_$AC(t){let e=q.get(t.strings);return void 0===e&&q.set(t.strings,e=new B(t)),e}k(t){V(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let r,n=0;for(const i of t)n===e.length?e.push(r=new X(this.O(E()),this.O(E()),this,this.options)):r=e[n],r._$AI(i),n++;n<e.length&&(this._$AR(r&&r._$AB.nextSibling,n),e.length=n)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,r,n,i){this.type=1,this._$AH=R,this._$AN=void 0,this.element=t,this.name=e,this._$AM=n,this.options=i,r.length>2||""!==r[0]||""!==r[1]?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=R}_$AI(t,e=this,r,n){const i=this.strings;let s=!1;if(void 0===i)t=K(this,t,e,0),s=!N(t)||t!==this._$AH&&t!==U,s&&(this._$AH=t);else{const n=t;let a,o;for(t=i[0],a=0;a<i.length-1;a++)o=K(this,n[r+a],e,a),o===U&&(o=this._$AH[a]),s||=!N(o)||o!==this._$AH[a],o===R?t=R:t!==R&&(t+=(o??"")+i[a+1]),this._$AH[a]=o}s&&!n&&this.j(t)}j(t){t===R?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===R?void 0:t}}class rt extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==R)}}class nt extends tt{constructor(t,e,r,n,i){super(t,e,r,n,i),this.type=5}_$AI(t,e=this){if((t=K(this,t,e,0)??R)===U)return;const r=this._$AH,n=t===R&&r!==R||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,i=t!==R&&(r===R||n);n&&this.element.removeEventListener(this.name,this,r),i&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class it{constructor(t,e,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){K(this,t)}}const st=k.litHtmlPolyfillSupport;st?.(B,X),(k.litHtmlVersions??=[]).push("3.3.1");const at=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,r)=>{const n=r?.renderBefore??e;let i=n._$litPart$;if(void 0===i){const t=r?.renderBefore??null;n._$litPart$=i=new X(e.insertBefore(E(),t),t,void 0,r??{})}return i._$AI(t),i})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return U}}ot._$litElement$=!0,ot.finalized=!0,at.litElementHydrateSupport?.({LitElement:ot});const lt=at.litElementPolyfillSupport;lt?.({LitElement:ot}),(at.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ct=t=>(e,r)=>{void 0!==r?r.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},ut={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:_},dt=(t=ut,e,r)=>{const{kind:n,metadata:i}=r;let s=globalThis.litPropertyMetadata.get(i);if(void 0===s&&globalThis.litPropertyMetadata.set(i,s=new Map),"setter"===n&&((t=Object.create(t)).wrapped=!0),s.set(r.name,t),"accessor"===n){const{name:n}=r;return{set(r){const i=e.get.call(this);e.set.call(this,r),this.requestUpdate(n,i,t)},init(e){return void 0!==e&&this.C(n,void 0,t,e),e}}}if("setter"===n){const{name:n}=r;return function(r){const i=this[n];e.call(this,r),this.requestUpdate(n,i,t)}}throw Error("Unsupported decorator location: "+n)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ht(t){return(e,r)=>"object"==typeof r?dt(t,e,r):((t,e,r)=>{const n=e.hasOwnProperty(r);return e.constructor.createProperty(r,t),n?Object.getOwnPropertyDescriptor(e,r):void 0})(t,e,r)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function mt(t){return ht({...t,state:!0,attribute:!1})}var ft="M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z",pt="M4,2H6V4C6,5.44 6.68,6.61 7.88,7.78C8.74,8.61 9.89,9.41 11.09,10.2L9.26,11.39C8.27,10.72 7.31,10 6.5,9.21C5.07,7.82 4,6.1 4,4V2M18,2H20V4C20,6.1 18.93,7.82 17.5,9.21C16.09,10.59 14.29,11.73 12.54,12.84C10.79,13.96 9.09,15.05 7.88,16.22C6.68,17.39 6,18.56 6,20V22H4V20C4,17.9 5.07,16.18 6.5,14.79C7.91,13.41 9.71,12.27 11.46,11.16C13.21,10.04 14.91,8.95 16.12,7.78C17.32,6.61 18,5.44 18,4V2M14.74,12.61C15.73,13.28 16.69,14 17.5,14.79C18.93,16.18 20,17.9 20,20V22H18V20C18,18.56 17.32,17.39 16.12,16.22C15.26,15.39 14.11,14.59 12.91,13.8L14.74,12.61M7,3H17V4L16.94,4.5H7.06L7,4V3M7.68,6H16.32C16.08,6.34 15.8,6.69 15.42,7.06L14.91,7.5H9.07L8.58,7.06C8.2,6.69 7.92,6.34 7.68,6M9.09,16.5H14.93L15.42,16.94C15.8,17.31 16.08,17.66 16.32,18H7.68C7.92,17.66 8.2,17.31 8.58,16.94L9.09,16.5M7.06,19.5H16.94L17,20V21H7V20L7.06,19.5Z",gt="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",yt="M22 9A4.32 4.32 0 0 1 19.78 8.45A3.4 3.4 0 0 0 18 8V7A4.32 4.32 0 0 1 20.22 7.55A3.4 3.4 0 0 0 22 8M22 6A3.4 3.4 0 0 1 20.22 5.55A4.32 4.32 0 0 0 18 5V6A3.4 3.4 0 0 1 19.78 6.45A4.32 4.32 0 0 0 22 7M22 10A3.4 3.4 0 0 1 20.22 9.55A4.32 4.32 0 0 0 18 9V10A3.4 3.4 0 0 1 19.78 10.45A4.32 4.32 0 0 0 22 11M10 12.73A70.39 70.39 0 0 0 17 11V4S10.5 2 7.5 2A5.5 5.5 0 0 0 6.12 12.82L7 19H8A3 3 0 0 0 9.46 21.33A3.15 3.15 0 0 1 11 24H12A4.12 4.12 0 0 0 10.09 20.55C9.39 20 9 19.63 9 19H10M7.5 10A2.5 2.5 0 1 1 10 7.5A2.5 2.5 0 0 1 7.5 10Z",vt="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",wt="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z";class bt extends Error{}class _t extends bt{constructor(t){super(`Invalid DateTime: ${t.toMessage()}`)}}class St extends bt{constructor(t){super(`Invalid Interval: ${t.toMessage()}`)}}class $t extends bt{constructor(t){super(`Invalid Duration: ${t.toMessage()}`)}}class kt extends bt{}class Dt extends bt{constructor(t){super(`Invalid unit ${t}`)}}class Ct extends bt{}class xt extends bt{constructor(){super("Zone is an abstract class")}}const Ot="numeric",Tt="short",At="long",Mt={year:Ot,month:Ot,day:Ot},Et={year:Ot,month:Tt,day:Ot},Nt={year:Ot,month:Tt,day:Ot,weekday:Tt},Vt={year:Ot,month:At,day:Ot},It={year:Ot,month:At,day:Ot,weekday:At},Lt={hour:Ot,minute:Ot},Pt={hour:Ot,minute:Ot,second:Ot},Ft={hour:Ot,minute:Ot,second:Ot,timeZoneName:Tt},Zt={hour:Ot,minute:Ot,second:Ot,timeZoneName:At},zt={hour:Ot,minute:Ot,hourCycle:"h23"},Ht={hour:Ot,minute:Ot,second:Ot,hourCycle:"h23"},Wt={hour:Ot,minute:Ot,second:Ot,hourCycle:"h23",timeZoneName:Tt},jt={hour:Ot,minute:Ot,second:Ot,hourCycle:"h23",timeZoneName:At},Ut={year:Ot,month:Ot,day:Ot,hour:Ot,minute:Ot},Rt={year:Ot,month:Ot,day:Ot,hour:Ot,minute:Ot,second:Ot},qt={year:Ot,month:Tt,day:Ot,hour:Ot,minute:Ot},Yt={year:Ot,month:Tt,day:Ot,hour:Ot,minute:Ot,second:Ot},Gt={year:Ot,month:Tt,day:Ot,weekday:Tt,hour:Ot,minute:Ot},Jt={year:Ot,month:At,day:Ot,hour:Ot,minute:Ot,timeZoneName:Tt},Bt={year:Ot,month:At,day:Ot,hour:Ot,minute:Ot,second:Ot,timeZoneName:Tt},Kt={year:Ot,month:At,day:Ot,weekday:At,hour:Ot,minute:Ot,timeZoneName:At},Qt={year:Ot,month:At,day:Ot,weekday:At,hour:Ot,minute:Ot,second:Ot,timeZoneName:At};class Xt{get type(){throw new xt}get name(){throw new xt}get ianaName(){return this.name}get isUniversal(){throw new xt}offsetName(t,e){throw new xt}formatOffset(t,e){throw new xt}offset(t){throw new xt}equals(t){throw new xt}get isValid(){throw new xt}}let te=null;class ee extends Xt{static get instance(){return null===te&&(te=new ee),te}get type(){return"system"}get name(){return(new Intl.DateTimeFormat).resolvedOptions().timeZone}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return _r(t,e,r)}formatOffset(t,e){return Dr(this.offset(t),e)}offset(t){return-new Date(t).getTimezoneOffset()}equals(t){return"system"===t.type}get isValid(){return!0}}const re=new Map;const ne={year:0,month:1,day:2,era:3,hour:4,minute:5,second:6};const ie=new Map;class se extends Xt{static create(t){let e=ie.get(t);return void 0===e&&ie.set(t,e=new se(t)),e}static resetCache(){ie.clear(),re.clear()}static isValidSpecifier(t){return this.isValidZone(t)}static isValidZone(t){if(!t)return!1;try{return new Intl.DateTimeFormat("en-US",{timeZone:t}).format(),!0}catch(t){return!1}}constructor(t){super(),this.zoneName=t,this.valid=se.isValidZone(t)}get type(){return"iana"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return _r(t,e,r,this.name)}formatOffset(t,e){return Dr(this.offset(t),e)}offset(t){if(!this.valid)return NaN;const e=new Date(t);if(isNaN(e))return NaN;const r=function(t){let e=re.get(t);return void 0===e&&(e=new Intl.DateTimeFormat("en-US",{hour12:!1,timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",era:"short"}),re.set(t,e)),e}(this.name);let[n,i,s,a,o,l,c]=r.formatToParts?function(t,e){const r=t.formatToParts(e),n=[];for(let t=0;t<r.length;t++){const{type:e,value:i}=r[t],s=ne[e];"era"===e?n[s]=i:tr(s)||(n[s]=parseInt(i,10))}return n}(r,e):function(t,e){const r=t.format(e).replace(/\u200E/g,""),n=/(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(r),[,i,s,a,o,l,c,u]=n;return[a,i,s,o,l,c,u]}(r,e);"BC"===a&&(n=1-Math.abs(n));let u=+e;const d=u%1e3;return u-=d>=0?d:1e3+d,(yr({year:n,month:i,day:s,hour:24===o?0:o,minute:l,second:c,millisecond:0})-u)/6e4}equals(t){return"iana"===t.type&&t.name===this.name}get isValid(){return this.valid}}let ae={};const oe=new Map;function le(t,e={}){const r=JSON.stringify([t,e]);let n=oe.get(r);return void 0===n&&(n=new Intl.DateTimeFormat(t,e),oe.set(r,n)),n}const ce=new Map;const ue=new Map;let de=null;const he=new Map;function me(t){let e=he.get(t);return void 0===e&&(e=new Intl.DateTimeFormat(t).resolvedOptions(),he.set(t,e)),e}const fe=new Map;function pe(t,e,r,n){const i=t.listingMode();return"error"===i?null:"en"===i?r(e):n(e)}class ge{constructor(t,e,r){this.padTo=r.padTo||0,this.floor=r.floor||!1;const{padTo:n,floor:i,...s}=r;if(!e||Object.keys(s).length>0){const e={useGrouping:!1,...r};r.padTo>0&&(e.minimumIntegerDigits=r.padTo),this.inf=function(t,e={}){const r=JSON.stringify([t,e]);let n=ce.get(r);return void 0===n&&(n=new Intl.NumberFormat(t,e),ce.set(r,n)),n}(t,e)}}format(t){if(this.inf){const e=this.floor?Math.floor(t):t;return this.inf.format(e)}return cr(this.floor?Math.floor(t):mr(t,3),this.padTo)}}class ye{constructor(t,e,r){let n;if(this.opts=r,this.originalZone=void 0,this.opts.timeZone)this.dt=t;else if("fixed"===t.zone.type){const e=t.offset/60*-1,r=e>=0?`Etc/GMT+${e}`:`Etc/GMT${e}`;0!==t.offset&&se.create(r).valid?(n=r,this.dt=t):(n="UTC",this.dt=0===t.offset?t:t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone)}else"system"===t.zone.type?this.dt=t:"iana"===t.zone.type?(this.dt=t,n=t.zone.name):(n="UTC",this.dt=t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone);const i={...this.opts};i.timeZone=i.timeZone||n,this.dtf=le(e,i)}format(){return this.originalZone?this.formatToParts().map(({value:t})=>t).join(""):this.dtf.format(this.dt.toJSDate())}formatToParts(){const t=this.dtf.formatToParts(this.dt.toJSDate());return this.originalZone?t.map(t=>{if("timeZoneName"===t.type){const e=this.originalZone.offsetName(this.dt.ts,{locale:this.dt.locale,format:this.opts.timeZoneName});return{...t,value:e}}return t}):t}resolvedOptions(){return this.dtf.resolvedOptions()}}class ve{constructor(t,e,r){this.opts={style:"long",...r},!e&&nr()&&(this.rtf=function(t,e={}){const{base:r,...n}=e,i=JSON.stringify([t,n]);let s=ue.get(i);return void 0===s&&(s=new Intl.RelativeTimeFormat(t,e),ue.set(i,s)),s}(t,r))}format(t,e){return this.rtf?this.rtf.format(t,e):function(t,e,r="always",n=!1){const i={years:["year","yr."],quarters:["quarter","qtr."],months:["month","mo."],weeks:["week","wk."],days:["day","day","days"],hours:["hour","hr."],minutes:["minute","min."],seconds:["second","sec."]},s=-1===["hours","minutes","seconds"].indexOf(t);if("auto"===r&&s){const r="days"===t;switch(e){case 1:return r?"tomorrow":`next ${i[t][0]}`;case-1:return r?"yesterday":`last ${i[t][0]}`;case 0:return r?"today":`this ${i[t][0]}`}}const a=Object.is(e,-0)||e<0,o=Math.abs(e),l=1===o,c=i[t],u=n?l?c[1]:c[2]||c[1]:l?i[t][0]:t;return a?`${o} ${u} ago`:`in ${o} ${u}`}(e,t,this.opts.numeric,"long"!==this.opts.style)}formatToParts(t,e){return this.rtf?this.rtf.formatToParts(t,e):[]}}const we={firstDay:1,minimalDays:4,weekend:[6,7]};class be{static fromOpts(t){return be.create(t.locale,t.numberingSystem,t.outputCalendar,t.weekSettings,t.defaultToEN)}static create(t,e,r,n,i=!1){const s=t||Fe.defaultLocale,a=s||(i?"en-US":de||(de=(new Intl.DateTimeFormat).resolvedOptions().locale,de)),o=e||Fe.defaultNumberingSystem,l=r||Fe.defaultOutputCalendar,c=or(n)||Fe.defaultWeekSettings;return new be(a,o,l,c,s)}static resetCache(){de=null,oe.clear(),ce.clear(),ue.clear(),he.clear(),fe.clear()}static fromObject({locale:t,numberingSystem:e,outputCalendar:r,weekSettings:n}={}){return be.create(t,e,r,n)}constructor(t,e,r,n,i){const[s,a,o]=function(t){const e=t.indexOf("-x-");-1!==e&&(t=t.substring(0,e));const r=t.indexOf("-u-");if(-1===r)return[t];{let e,n;try{e=le(t).resolvedOptions(),n=t}catch(i){const s=t.substring(0,r);e=le(s).resolvedOptions(),n=s}const{numberingSystem:i,calendar:s}=e;return[n,i,s]}}(t);this.locale=s,this.numberingSystem=e||a||null,this.outputCalendar=r||o||null,this.weekSettings=n,this.intl=function(t,e,r){return r||e?(t.includes("-u-")||(t+="-u"),r&&(t+=`-ca-${r}`),e&&(t+=`-nu-${e}`),t):t}(this.locale,this.numberingSystem,this.outputCalendar),this.weekdaysCache={format:{},standalone:{}},this.monthsCache={format:{},standalone:{}},this.meridiemCache=null,this.eraCache={},this.specifiedLocale=i,this.fastNumbersCached=null}get fastNumbers(){var t;return null==this.fastNumbersCached&&(this.fastNumbersCached=(!(t=this).numberingSystem||"latn"===t.numberingSystem)&&("latn"===t.numberingSystem||!t.locale||t.locale.startsWith("en")||"latn"===me(t.locale).numberingSystem)),this.fastNumbersCached}listingMode(){const t=this.isEnglish(),e=!(null!==this.numberingSystem&&"latn"!==this.numberingSystem||null!==this.outputCalendar&&"gregory"!==this.outputCalendar);return t&&e?"en":"intl"}clone(t){return t&&0!==Object.getOwnPropertyNames(t).length?be.create(t.locale||this.specifiedLocale,t.numberingSystem||this.numberingSystem,t.outputCalendar||this.outputCalendar,or(t.weekSettings)||this.weekSettings,t.defaultToEN||!1):this}redefaultToEN(t={}){return this.clone({...t,defaultToEN:!0})}redefaultToSystem(t={}){return this.clone({...t,defaultToEN:!1})}months(t,e=!1){return pe(this,t,Ar,()=>{const r="ja"===this.intl||this.intl.startsWith("ja-"),n=(e&=!r)?{month:t,day:"numeric"}:{month:t},i=e?"format":"standalone";if(!this.monthsCache[i][t]){const e=r?t=>this.dtFormatter(t,n).format():t=>this.extract(t,n,"month");this.monthsCache[i][t]=function(t){const e=[];for(let r=1;r<=12;r++){const n=Li.utc(2009,r,1);e.push(t(n))}return e}(e)}return this.monthsCache[i][t]})}weekdays(t,e=!1){return pe(this,t,Vr,()=>{const r=e?{weekday:t,year:"numeric",month:"long",day:"numeric"}:{weekday:t},n=e?"format":"standalone";return this.weekdaysCache[n][t]||(this.weekdaysCache[n][t]=function(t){const e=[];for(let r=1;r<=7;r++){const n=Li.utc(2016,11,13+r);e.push(t(n))}return e}(t=>this.extract(t,r,"weekday"))),this.weekdaysCache[n][t]})}meridiems(){return pe(this,void 0,()=>Ir,()=>{if(!this.meridiemCache){const t={hour:"numeric",hourCycle:"h12"};this.meridiemCache=[Li.utc(2016,11,13,9),Li.utc(2016,11,13,19)].map(e=>this.extract(e,t,"dayperiod"))}return this.meridiemCache})}eras(t){return pe(this,t,Zr,()=>{const e={era:t};return this.eraCache[t]||(this.eraCache[t]=[Li.utc(-40,1,1),Li.utc(2017,1,1)].map(t=>this.extract(t,e,"era"))),this.eraCache[t]})}extract(t,e,r){const n=this.dtFormatter(t,e).formatToParts().find(t=>t.type.toLowerCase()===r);return n?n.value:null}numberFormatter(t={}){return new ge(this.intl,t.forceSimple||this.fastNumbers,t)}dtFormatter(t,e={}){return new ye(t,this.intl,e)}relFormatter(t={}){return new ve(this.intl,this.isEnglish(),t)}listFormatter(t={}){return function(t,e={}){const r=JSON.stringify([t,e]);let n=ae[r];return n||(n=new Intl.ListFormat(t,e),ae[r]=n),n}(this.intl,t)}isEnglish(){return"en"===this.locale||"en-us"===this.locale.toLowerCase()||me(this.intl).locale.startsWith("en-us")}getWeekSettings(){return this.weekSettings?this.weekSettings:ir()?function(t){let e=fe.get(t);if(!e){const r=new Intl.Locale(t);e="getWeekInfo"in r?r.getWeekInfo():r.weekInfo,"minimalDays"in e||(e={...we,...e}),fe.set(t,e)}return e}(this.locale):we}getStartOfWeek(){return this.getWeekSettings().firstDay}getMinDaysInFirstWeek(){return this.getWeekSettings().minimalDays}getWeekendDays(){return this.getWeekSettings().weekend}equals(t){return this.locale===t.locale&&this.numberingSystem===t.numberingSystem&&this.outputCalendar===t.outputCalendar}toString(){return`Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`}}let _e=null;class Se extends Xt{static get utcInstance(){return null===_e&&(_e=new Se(0)),_e}static instance(t){return 0===t?Se.utcInstance:new Se(t)}static parseSpecifier(t){if(t){const e=t.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);if(e)return new Se(Sr(e[1],e[2]))}return null}constructor(t){super(),this.fixed=t}get type(){return"fixed"}get name(){return 0===this.fixed?"UTC":`UTC${Dr(this.fixed,"narrow")}`}get ianaName(){return 0===this.fixed?"Etc/UTC":`Etc/GMT${Dr(-this.fixed,"narrow")}`}offsetName(){return this.name}formatOffset(t,e){return Dr(this.fixed,e)}get isUniversal(){return!0}offset(){return this.fixed}equals(t){return"fixed"===t.type&&t.fixed===this.fixed}get isValid(){return!0}}class $e extends Xt{constructor(t){super(),this.zoneName=t}get type(){return"invalid"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(){return null}formatOffset(){return""}offset(){return NaN}equals(){return!1}get isValid(){return!1}}function ke(t,e){if(tr(t)||null===t)return e;if(t instanceof Xt)return t;if(function(t){return"string"==typeof t}(t)){const r=t.toLowerCase();return"default"===r?e:"local"===r||"system"===r?ee.instance:"utc"===r||"gmt"===r?Se.utcInstance:Se.parseSpecifier(r)||se.create(t)}return er(t)?Se.instance(t):"object"==typeof t&&"offset"in t&&"function"==typeof t.offset?t:new $e(t)}const De={arab:"[٠-٩]",arabext:"[۰-۹]",bali:"[᭐-᭙]",beng:"[০-৯]",deva:"[०-९]",fullwide:"[０-９]",gujr:"[૦-૯]",hanidec:"[〇|一|二|三|四|五|六|七|八|九]",khmr:"[០-៩]",knda:"[೦-೯]",laoo:"[໐-໙]",limb:"[᥆-᥏]",mlym:"[൦-൯]",mong:"[᠐-᠙]",mymr:"[၀-၉]",orya:"[୦-୯]",tamldec:"[௦-௯]",telu:"[౦-౯]",thai:"[๐-๙]",tibt:"[༠-༩]",latn:"\\d"},Ce={arab:[1632,1641],arabext:[1776,1785],bali:[6992,7001],beng:[2534,2543],deva:[2406,2415],fullwide:[65296,65303],gujr:[2790,2799],khmr:[6112,6121],knda:[3302,3311],laoo:[3792,3801],limb:[6470,6479],mlym:[3430,3439],mong:[6160,6169],mymr:[4160,4169],orya:[2918,2927],tamldec:[3046,3055],telu:[3174,3183],thai:[3664,3673],tibt:[3872,3881]},xe=De.hanidec.replace(/[\[|\]]/g,"").split("");const Oe=new Map;function Te({numberingSystem:t},e=""){const r=t||"latn";let n=Oe.get(r);void 0===n&&(n=new Map,Oe.set(r,n));let i=n.get(e);return void 0===i&&(i=new RegExp(`${De[r]}${e}`),n.set(e,i)),i}let Ae,Me=()=>Date.now(),Ee="system",Ne=null,Ve=null,Ie=null,Le=60,Pe=null;class Fe{static get now(){return Me}static set now(t){Me=t}static set defaultZone(t){Ee=t}static get defaultZone(){return ke(Ee,ee.instance)}static get defaultLocale(){return Ne}static set defaultLocale(t){Ne=t}static get defaultNumberingSystem(){return Ve}static set defaultNumberingSystem(t){Ve=t}static get defaultOutputCalendar(){return Ie}static set defaultOutputCalendar(t){Ie=t}static get defaultWeekSettings(){return Pe}static set defaultWeekSettings(t){Pe=or(t)}static get twoDigitCutoffYear(){return Le}static set twoDigitCutoffYear(t){Le=t%100}static get throwOnInvalid(){return Ae}static set throwOnInvalid(t){Ae=t}static resetCaches(){be.resetCache(),se.resetCache(),Li.resetCache(),Oe.clear()}}class Ze{constructor(t,e){this.reason=t,this.explanation=e}toMessage(){return this.explanation?`${this.reason}: ${this.explanation}`:this.reason}}const ze=[0,31,59,90,120,151,181,212,243,273,304,334],He=[0,31,60,91,121,152,182,213,244,274,305,335];function We(t,e){return new Ze("unit out of range",`you specified ${e} (of type ${typeof e}) as a ${t}, which is invalid`)}function je(t,e,r){const n=new Date(Date.UTC(t,e-1,r));t<100&&t>=0&&n.setUTCFullYear(n.getUTCFullYear()-1900);const i=n.getUTCDay();return 0===i?7:i}function Ue(t,e,r){return r+(fr(t)?He:ze)[e-1]}function Re(t,e){const r=fr(t)?He:ze,n=r.findIndex(t=>t<e);return{month:n+1,day:e-r[n]}}function qe(t,e){return(t-e+7)%7+1}function Ye(t,e=4,r=1){const{year:n,month:i,day:s}=t,a=Ue(n,i,s),o=qe(je(n,i,s),r);let l,c=Math.floor((a-o+14-e)/7);return c<1?(l=n-1,c=wr(l,e,r)):c>wr(n,e,r)?(l=n+1,c=1):l=n,{weekYear:l,weekNumber:c,weekday:o,...Cr(t)}}function Ge(t,e=4,r=1){const{weekYear:n,weekNumber:i,weekday:s}=t,a=qe(je(n,1,e),r),o=pr(n);let l,c=7*i+s-a-7+e;c<1?(l=n-1,c+=pr(l)):c>o?(l=n+1,c-=pr(n)):l=n;const{month:u,day:d}=Re(l,c);return{year:l,month:u,day:d,...Cr(t)}}function Je(t){const{year:e,month:r,day:n}=t;return{year:e,ordinal:Ue(e,r,n),...Cr(t)}}function Be(t){const{year:e,ordinal:r}=t,{month:n,day:i}=Re(e,r);return{year:e,month:n,day:i,...Cr(t)}}function Ke(t,e){if(!tr(t.localWeekday)||!tr(t.localWeekNumber)||!tr(t.localWeekYear)){if(!tr(t.weekday)||!tr(t.weekNumber)||!tr(t.weekYear))throw new kt("Cannot mix locale-based week fields with ISO-based week fields");return tr(t.localWeekday)||(t.weekday=t.localWeekday),tr(t.localWeekNumber)||(t.weekNumber=t.localWeekNumber),tr(t.localWeekYear)||(t.weekYear=t.localWeekYear),delete t.localWeekday,delete t.localWeekNumber,delete t.localWeekYear,{minDaysInFirstWeek:e.getMinDaysInFirstWeek(),startOfWeek:e.getStartOfWeek()}}return{minDaysInFirstWeek:4,startOfWeek:1}}function Qe(t){const e=rr(t.year),r=lr(t.month,1,12),n=lr(t.day,1,gr(t.year,t.month));return e?r?!n&&We("day",t.day):We("month",t.month):We("year",t.year)}function Xe(t){const{hour:e,minute:r,second:n,millisecond:i}=t,s=lr(e,0,23)||24===e&&0===r&&0===n&&0===i,a=lr(r,0,59),o=lr(n,0,59),l=lr(i,0,999);return s?a?o?!l&&We("millisecond",i):We("second",n):We("minute",r):We("hour",e)}function tr(t){return void 0===t}function er(t){return"number"==typeof t}function rr(t){return"number"==typeof t&&t%1==0}function nr(){try{return"undefined"!=typeof Intl&&!!Intl.RelativeTimeFormat}catch(t){return!1}}function ir(){try{return"undefined"!=typeof Intl&&!!Intl.Locale&&("weekInfo"in Intl.Locale.prototype||"getWeekInfo"in Intl.Locale.prototype)}catch(t){return!1}}function sr(t,e,r){if(0!==t.length)return t.reduce((t,n)=>{const i=[e(n),n];return t&&r(t[0],i[0])===t[0]?t:i},null)[1]}function ar(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function or(t){if(null==t)return null;if("object"!=typeof t)throw new Ct("Week settings must be an object");if(!lr(t.firstDay,1,7)||!lr(t.minimalDays,1,7)||!Array.isArray(t.weekend)||t.weekend.some(t=>!lr(t,1,7)))throw new Ct("Invalid week settings");return{firstDay:t.firstDay,minimalDays:t.minimalDays,weekend:Array.from(t.weekend)}}function lr(t,e,r){return rr(t)&&t>=e&&t<=r}function cr(t,e=2){let r;return r=t<0?"-"+(""+-t).padStart(e,"0"):(""+t).padStart(e,"0"),r}function ur(t){return tr(t)||null===t||""===t?void 0:parseInt(t,10)}function dr(t){return tr(t)||null===t||""===t?void 0:parseFloat(t)}function hr(t){if(!tr(t)&&null!==t&&""!==t){const e=1e3*parseFloat("0."+t);return Math.floor(e)}}function mr(t,e,r="round"){const n=10**e;switch(r){case"expand":return t>0?Math.ceil(t*n)/n:Math.floor(t*n)/n;case"trunc":return Math.trunc(t*n)/n;case"round":return Math.round(t*n)/n;case"floor":return Math.floor(t*n)/n;case"ceil":return Math.ceil(t*n)/n;default:throw new RangeError(`Value rounding ${r} is out of range`)}}function fr(t){return t%4==0&&(t%100!=0||t%400==0)}function pr(t){return fr(t)?366:365}function gr(t,e){const r=function(t,e){return t-e*Math.floor(t/e)}(e-1,12)+1;return 2===r?fr(t+(e-r)/12)?29:28:[31,null,31,30,31,30,31,31,30,31,30,31][r-1]}function yr(t){let e=Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second,t.millisecond);return t.year<100&&t.year>=0&&(e=new Date(e),e.setUTCFullYear(t.year,t.month-1,t.day)),+e}function vr(t,e,r){return-qe(je(t,1,e),r)+e-1}function wr(t,e=4,r=1){const n=vr(t,e,r),i=vr(t+1,e,r);return(pr(t)-n+i)/7}function br(t){return t>99?t:t>Fe.twoDigitCutoffYear?1900+t:2e3+t}function _r(t,e,r,n=null){const i=new Date(t),s={hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"};n&&(s.timeZone=n);const a={timeZoneName:e,...s},o=new Intl.DateTimeFormat(r,a).formatToParts(i).find(t=>"timezonename"===t.type.toLowerCase());return o?o.value:null}function Sr(t,e){let r=parseInt(t,10);Number.isNaN(r)&&(r=0);const n=parseInt(e,10)||0;return 60*r+(r<0||Object.is(r,-0)?-n:n)}function $r(t){const e=Number(t);if("boolean"==typeof t||""===t||!Number.isFinite(e))throw new Ct(`Invalid unit value ${t}`);return e}function kr(t,e){const r={};for(const n in t)if(ar(t,n)){const i=t[n];if(null==i)continue;r[e(n)]=$r(i)}return r}function Dr(t,e){const r=Math.trunc(Math.abs(t/60)),n=Math.trunc(Math.abs(t%60)),i=t>=0?"+":"-";switch(e){case"short":return`${i}${cr(r,2)}:${cr(n,2)}`;case"narrow":return`${i}${r}${n>0?`:${n}`:""}`;case"techie":return`${i}${cr(r,2)}${cr(n,2)}`;default:throw new RangeError(`Value format ${e} is out of range for property format`)}}function Cr(t){return function(t,e){return e.reduce((e,r)=>(e[r]=t[r],e),{})}(t,["hour","minute","second","millisecond"])}const xr=["January","February","March","April","May","June","July","August","September","October","November","December"],Or=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],Tr=["J","F","M","A","M","J","J","A","S","O","N","D"];function Ar(t){switch(t){case"narrow":return[...Tr];case"short":return[...Or];case"long":return[...xr];case"numeric":return["1","2","3","4","5","6","7","8","9","10","11","12"];case"2-digit":return["01","02","03","04","05","06","07","08","09","10","11","12"];default:return null}}const Mr=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],Er=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],Nr=["M","T","W","T","F","S","S"];function Vr(t){switch(t){case"narrow":return[...Nr];case"short":return[...Er];case"long":return[...Mr];case"numeric":return["1","2","3","4","5","6","7"];default:return null}}const Ir=["AM","PM"],Lr=["Before Christ","Anno Domini"],Pr=["BC","AD"],Fr=["B","A"];function Zr(t){switch(t){case"narrow":return[...Fr];case"short":return[...Pr];case"long":return[...Lr];default:return null}}function zr(t,e){let r="";for(const n of t)n.literal?r+=n.val:r+=e(n.val);return r}const Hr={D:Mt,DD:Et,DDD:Vt,DDDD:It,t:Lt,tt:Pt,ttt:Ft,tttt:Zt,T:zt,TT:Ht,TTT:Wt,TTTT:jt,f:Ut,ff:qt,fff:Jt,ffff:Kt,F:Rt,FF:Yt,FFF:Bt,FFFF:Qt};class Wr{static create(t,e={}){return new Wr(t,e)}static parseFormat(t){let e=null,r="",n=!1;const i=[];for(let s=0;s<t.length;s++){const a=t.charAt(s);"'"===a?((r.length>0||n)&&i.push({literal:n||/^\s+$/.test(r),val:""===r?"'":r}),e=null,r="",n=!n):n||a===e?r+=a:(r.length>0&&i.push({literal:/^\s+$/.test(r),val:r}),r=a,e=a)}return r.length>0&&i.push({literal:n||/^\s+$/.test(r),val:r}),i}static macroTokenToFormatOpts(t){return Hr[t]}constructor(t,e){this.opts=e,this.loc=t,this.systemLoc=null}formatWithSystemDefault(t,e){null===this.systemLoc&&(this.systemLoc=this.loc.redefaultToSystem());return this.systemLoc.dtFormatter(t,{...this.opts,...e}).format()}dtFormatter(t,e={}){return this.loc.dtFormatter(t,{...this.opts,...e})}formatDateTime(t,e){return this.dtFormatter(t,e).format()}formatDateTimeParts(t,e){return this.dtFormatter(t,e).formatToParts()}formatInterval(t,e){return this.dtFormatter(t.start,e).dtf.formatRange(t.start.toJSDate(),t.end.toJSDate())}resolvedOptions(t,e){return this.dtFormatter(t,e).resolvedOptions()}num(t,e=0,r=void 0){if(this.opts.forceSimple)return cr(t,e);const n={...this.opts};return e>0&&(n.padTo=e),r&&(n.signDisplay=r),this.loc.numberFormatter(n).format(t)}formatDateTimeFromString(t,e){const r="en"===this.loc.listingMode(),n=this.loc.outputCalendar&&"gregory"!==this.loc.outputCalendar,i=(e,r)=>this.loc.extract(t,e,r),s=e=>t.isOffsetFixed&&0===t.offset&&e.allowZ?"Z":t.isValid?t.zone.formatOffset(t.ts,e.format):"",a=()=>r?function(t){return Ir[t.hour<12?0:1]}(t):i({hour:"numeric",hourCycle:"h12"},"dayperiod"),o=(e,n)=>r?function(t,e){return Ar(e)[t.month-1]}(t,e):i(n?{month:e}:{month:e,day:"numeric"},"month"),l=(e,n)=>r?function(t,e){return Vr(e)[t.weekday-1]}(t,e):i(n?{weekday:e}:{weekday:e,month:"long",day:"numeric"},"weekday"),c=e=>{const r=Wr.macroTokenToFormatOpts(e);return r?this.formatWithSystemDefault(t,r):e},u=e=>r?function(t,e){return Zr(e)[t.year<0?0:1]}(t,e):i({era:e},"era");return zr(Wr.parseFormat(e),e=>{switch(e){case"S":return this.num(t.millisecond);case"u":case"SSS":return this.num(t.millisecond,3);case"s":return this.num(t.second);case"ss":return this.num(t.second,2);case"uu":return this.num(Math.floor(t.millisecond/10),2);case"uuu":return this.num(Math.floor(t.millisecond/100));case"m":return this.num(t.minute);case"mm":return this.num(t.minute,2);case"h":return this.num(t.hour%12==0?12:t.hour%12);case"hh":return this.num(t.hour%12==0?12:t.hour%12,2);case"H":return this.num(t.hour);case"HH":return this.num(t.hour,2);case"Z":return s({format:"narrow",allowZ:this.opts.allowZ});case"ZZ":return s({format:"short",allowZ:this.opts.allowZ});case"ZZZ":return s({format:"techie",allowZ:this.opts.allowZ});case"ZZZZ":return t.zone.offsetName(t.ts,{format:"short",locale:this.loc.locale});case"ZZZZZ":return t.zone.offsetName(t.ts,{format:"long",locale:this.loc.locale});case"z":return t.zoneName;case"a":return a();case"d":return n?i({day:"numeric"},"day"):this.num(t.day);case"dd":return n?i({day:"2-digit"},"day"):this.num(t.day,2);case"c":case"E":return this.num(t.weekday);case"ccc":return l("short",!0);case"cccc":return l("long",!0);case"ccccc":return l("narrow",!0);case"EEE":return l("short",!1);case"EEEE":return l("long",!1);case"EEEEE":return l("narrow",!1);case"L":return n?i({month:"numeric",day:"numeric"},"month"):this.num(t.month);case"LL":return n?i({month:"2-digit",day:"numeric"},"month"):this.num(t.month,2);case"LLL":return o("short",!0);case"LLLL":return o("long",!0);case"LLLLL":return o("narrow",!0);case"M":return n?i({month:"numeric"},"month"):this.num(t.month);case"MM":return n?i({month:"2-digit"},"month"):this.num(t.month,2);case"MMM":return o("short",!1);case"MMMM":return o("long",!1);case"MMMMM":return o("narrow",!1);case"y":return n?i({year:"numeric"},"year"):this.num(t.year);case"yy":return n?i({year:"2-digit"},"year"):this.num(t.year.toString().slice(-2),2);case"yyyy":return n?i({year:"numeric"},"year"):this.num(t.year,4);case"yyyyyy":return n?i({year:"numeric"},"year"):this.num(t.year,6);case"G":return u("short");case"GG":return u("long");case"GGGGG":return u("narrow");case"kk":return this.num(t.weekYear.toString().slice(-2),2);case"kkkk":return this.num(t.weekYear,4);case"W":return this.num(t.weekNumber);case"WW":return this.num(t.weekNumber,2);case"n":return this.num(t.localWeekNumber);case"nn":return this.num(t.localWeekNumber,2);case"ii":return this.num(t.localWeekYear.toString().slice(-2),2);case"iiii":return this.num(t.localWeekYear,4);case"o":return this.num(t.ordinal);case"ooo":return this.num(t.ordinal,3);case"q":return this.num(t.quarter);case"qq":return this.num(t.quarter,2);case"X":return this.num(Math.floor(t.ts/1e3));case"x":return this.num(t.ts);default:return c(e)}})}formatDurationFromString(t,e){const r="negativeLargestOnly"===this.opts.signMode?-1:1,n=t=>{switch(t[0]){case"S":return"milliseconds";case"s":return"seconds";case"m":return"minutes";case"h":return"hours";case"d":return"days";case"w":return"weeks";case"M":return"months";case"y":return"years";default:return null}},i=Wr.parseFormat(e),s=i.reduce((t,{literal:e,val:r})=>e?t:t.concat(r),[]),a=t.shiftTo(...s.map(n).filter(t=>t));return zr(i,((t,e)=>i=>{const s=n(i);if(s){const n=e.isNegativeDuration&&s!==e.largestUnit?r:1;let a;return a="negativeLargestOnly"===this.opts.signMode&&s!==e.largestUnit?"never":"all"===this.opts.signMode?"always":"auto",this.num(t.get(s)*n,i.length,a)}return i})(a,{isNegativeDuration:a<0,largestUnit:Object.keys(a.values)[0]}))}}const jr=/[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;function Ur(...t){const e=t.reduce((t,e)=>t+e.source,"");return RegExp(`^${e}$`)}function Rr(...t){return e=>t.reduce(([t,r,n],i)=>{const[s,a,o]=i(e,n);return[{...t,...s},a||r,o]},[{},null,1]).slice(0,2)}function qr(t,...e){if(null==t)return[null,null];for(const[r,n]of e){const e=r.exec(t);if(e)return n(e)}return[null,null]}function Yr(...t){return(e,r)=>{const n={};let i;for(i=0;i<t.length;i++)n[t[i]]=ur(e[r+i]);return[n,null,r+i]}}const Gr=/(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/,Jr=/(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/,Br=RegExp(`${Jr.source}${`(?:${Gr.source}?(?:\\[(${jr.source})\\])?)?`}`),Kr=RegExp(`(?:[Tt]${Br.source})?`),Qr=Yr("weekYear","weekNumber","weekDay"),Xr=Yr("year","ordinal"),tn=RegExp(`${Jr.source} ?(?:${Gr.source}|(${jr.source}))?`),en=RegExp(`(?: ${tn.source})?`);function rn(t,e,r){const n=t[e];return tr(n)?r:ur(n)}function nn(t,e){return[{hours:rn(t,e,0),minutes:rn(t,e+1,0),seconds:rn(t,e+2,0),milliseconds:hr(t[e+3])},null,e+4]}function sn(t,e){const r=!t[e]&&!t[e+1],n=Sr(t[e+1],t[e+2]);return[{},r?null:Se.instance(n),e+3]}function an(t,e){return[{},t[e]?se.create(t[e]):null,e+1]}const on=RegExp(`^T?${Jr.source}$`),ln=/^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;function cn(t){const[e,r,n,i,s,a,o,l,c]=t,u="-"===e[0],d=l&&"-"===l[0],h=(t,e=!1)=>void 0!==t&&(e||t&&u)?-t:t;return[{years:h(dr(r)),months:h(dr(n)),weeks:h(dr(i)),days:h(dr(s)),hours:h(dr(a)),minutes:h(dr(o)),seconds:h(dr(l),"-0"===l),milliseconds:h(hr(c),d)}]}const un={GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function dn(t,e,r,n,i,s,a){const o={year:2===e.length?br(ur(e)):ur(e),month:Or.indexOf(r)+1,day:ur(n),hour:ur(i),minute:ur(s)};return a&&(o.second=ur(a)),t&&(o.weekday=t.length>3?Mr.indexOf(t)+1:Er.indexOf(t)+1),o}const hn=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;function mn(t){const[,e,r,n,i,s,a,o,l,c,u,d]=t,h=dn(e,i,n,r,s,a,o);let m;return m=l?un[l]:c?0:Sr(u,d),[h,new Se(m)]}const fn=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,pn=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,gn=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;function yn(t){const[,e,r,n,i,s,a,o]=t;return[dn(e,i,n,r,s,a,o),Se.utcInstance]}function vn(t){const[,e,r,n,i,s,a,o]=t;return[dn(e,o,r,n,i,s,a),Se.utcInstance]}const wn=Ur(/([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,Kr),bn=Ur(/(\d{4})-?W(\d\d)(?:-?(\d))?/,Kr),_n=Ur(/(\d{4})-?(\d{3})/,Kr),Sn=Ur(Br),$n=Rr(function(t,e){return[{year:rn(t,e),month:rn(t,e+1,1),day:rn(t,e+2,1)},null,e+3]},nn,sn,an),kn=Rr(Qr,nn,sn,an),Dn=Rr(Xr,nn,sn,an),Cn=Rr(nn,sn,an);const xn=Rr(nn);const On=Ur(/(\d{4})-(\d\d)-(\d\d)/,en),Tn=Ur(tn),An=Rr(nn,sn,an);const Mn="Invalid Duration",En={weeks:{days:7,hours:168,minutes:10080,seconds:604800,milliseconds:6048e5},days:{hours:24,minutes:1440,seconds:86400,milliseconds:864e5},hours:{minutes:60,seconds:3600,milliseconds:36e5},minutes:{seconds:60,milliseconds:6e4},seconds:{milliseconds:1e3}},Nn={years:{quarters:4,months:12,weeks:52,days:365,hours:8760,minutes:525600,seconds:31536e3,milliseconds:31536e6},quarters:{months:3,weeks:13,days:91,hours:2184,minutes:131040,seconds:7862400,milliseconds:78624e5},months:{weeks:4,days:30,hours:720,minutes:43200,seconds:2592e3,milliseconds:2592e6},...En},Vn=365.2425,In=30.436875,Ln={years:{quarters:4,months:12,weeks:52.1775,days:Vn,hours:8765.82,minutes:525949.2,seconds:525949.2*60,milliseconds:525949.2*60*1e3},quarters:{months:3,weeks:13.044375,days:91.310625,hours:2191.455,minutes:131487.3,seconds:525949.2*60/4,milliseconds:7889237999.999999},months:{weeks:4.3481250000000005,days:In,hours:730.485,minutes:43829.1,seconds:2629746,milliseconds:2629746e3},...En},Pn=["years","quarters","months","weeks","days","hours","minutes","seconds","milliseconds"],Fn=Pn.slice(0).reverse();function Zn(t,e,r=!1){const n={values:r?e.values:{...t.values,...e.values||{}},loc:t.loc.clone(e.loc),conversionAccuracy:e.conversionAccuracy||t.conversionAccuracy,matrix:e.matrix||t.matrix};return new jn(n)}function zn(t,e){let r=e.milliseconds??0;for(const n of Fn.slice(1))e[n]&&(r+=e[n]*t[n].milliseconds);return r}function Hn(t,e){const r=zn(t,e)<0?-1:1;Pn.reduceRight((n,i)=>{if(tr(e[i]))return n;if(n){const s=e[n]*r,a=t[i][n],o=Math.floor(s/a);e[i]+=o*r,e[n]-=o*a*r}return i},null),Pn.reduce((r,n)=>{if(tr(e[n]))return r;if(r){const i=e[r]%1;e[r]-=i,e[n]+=i*t[r][n]}return n},null)}function Wn(t){const e={};for(const[r,n]of Object.entries(t))0!==n&&(e[r]=n);return e}class jn{constructor(t){const e="longterm"===t.conversionAccuracy||!1;let r=e?Ln:Nn;t.matrix&&(r=t.matrix),this.values=t.values,this.loc=t.loc||be.create(),this.conversionAccuracy=e?"longterm":"casual",this.invalid=t.invalid||null,this.matrix=r,this.isLuxonDuration=!0}static fromMillis(t,e){return jn.fromObject({milliseconds:t},e)}static fromObject(t,e={}){if(null==t||"object"!=typeof t)throw new Ct("Duration.fromObject: argument expected to be an object, got "+(null===t?"null":typeof t));return new jn({values:kr(t,jn.normalizeUnit),loc:be.fromObject(e),conversionAccuracy:e.conversionAccuracy,matrix:e.matrix})}static fromDurationLike(t){if(er(t))return jn.fromMillis(t);if(jn.isDuration(t))return t;if("object"==typeof t)return jn.fromObject(t);throw new Ct(`Unknown duration argument ${t} of type ${typeof t}`)}static fromISO(t,e){const[r]=function(t){return qr(t,[ln,cn])}(t);return r?jn.fromObject(r,e):jn.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static fromISOTime(t,e){const[r]=function(t){return qr(t,[on,xn])}(t);return r?jn.fromObject(r,e):jn.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static invalid(t,e=null){if(!t)throw new Ct("need to specify a reason the Duration is invalid");const r=t instanceof Ze?t:new Ze(t,e);if(Fe.throwOnInvalid)throw new $t(r);return new jn({invalid:r})}static normalizeUnit(t){const e={year:"years",years:"years",quarter:"quarters",quarters:"quarters",month:"months",months:"months",week:"weeks",weeks:"weeks",day:"days",days:"days",hour:"hours",hours:"hours",minute:"minutes",minutes:"minutes",second:"seconds",seconds:"seconds",millisecond:"milliseconds",milliseconds:"milliseconds"}[t?t.toLowerCase():t];if(!e)throw new Dt(t);return e}static isDuration(t){return t&&t.isLuxonDuration||!1}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}toFormat(t,e={}){const r={...e,floor:!1!==e.round&&!1!==e.floor};return this.isValid?Wr.create(this.loc,r).formatDurationFromString(this,t):Mn}toHuman(t={}){if(!this.isValid)return Mn;const e=!1!==t.showZeros,r=Pn.map(r=>{const n=this.values[r];return tr(n)||0===n&&!e?null:this.loc.numberFormatter({style:"unit",unitDisplay:"long",...t,unit:r.slice(0,-1)}).format(n)}).filter(t=>t);return this.loc.listFormatter({type:"conjunction",style:t.listStyle||"narrow",...t}).format(r)}toObject(){return this.isValid?{...this.values}:{}}toISO(){if(!this.isValid)return null;let t="P";return 0!==this.years&&(t+=this.years+"Y"),0===this.months&&0===this.quarters||(t+=this.months+3*this.quarters+"M"),0!==this.weeks&&(t+=this.weeks+"W"),0!==this.days&&(t+=this.days+"D"),0===this.hours&&0===this.minutes&&0===this.seconds&&0===this.milliseconds||(t+="T"),0!==this.hours&&(t+=this.hours+"H"),0!==this.minutes&&(t+=this.minutes+"M"),0===this.seconds&&0===this.milliseconds||(t+=mr(this.seconds+this.milliseconds/1e3,3)+"S"),"P"===t&&(t+="T0S"),t}toISOTime(t={}){if(!this.isValid)return null;const e=this.toMillis();if(e<0||e>=864e5)return null;t={suppressMilliseconds:!1,suppressSeconds:!1,includePrefix:!1,format:"extended",...t,includeOffset:!1};return Li.fromMillis(e,{zone:"UTC"}).toISOTime(t)}toJSON(){return this.toISO()}toString(){return this.toISO()}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Duration { values: ${JSON.stringify(this.values)} }`:`Duration { Invalid, reason: ${this.invalidReason} }`}toMillis(){return this.isValid?zn(this.matrix,this.values):NaN}valueOf(){return this.toMillis()}plus(t){if(!this.isValid)return this;const e=jn.fromDurationLike(t),r={};for(const t of Pn)(ar(e.values,t)||ar(this.values,t))&&(r[t]=e.get(t)+this.get(t));return Zn(this,{values:r},!0)}minus(t){if(!this.isValid)return this;const e=jn.fromDurationLike(t);return this.plus(e.negate())}mapUnits(t){if(!this.isValid)return this;const e={};for(const r of Object.keys(this.values))e[r]=$r(t(this.values[r],r));return Zn(this,{values:e},!0)}get(t){return this[jn.normalizeUnit(t)]}set(t){if(!this.isValid)return this;return Zn(this,{values:{...this.values,...kr(t,jn.normalizeUnit)}})}reconfigure({locale:t,numberingSystem:e,conversionAccuracy:r,matrix:n}={}){return Zn(this,{loc:this.loc.clone({locale:t,numberingSystem:e}),matrix:n,conversionAccuracy:r})}as(t){return this.isValid?this.shiftTo(t).get(t):NaN}normalize(){if(!this.isValid)return this;const t=this.toObject();return Hn(this.matrix,t),Zn(this,{values:t},!0)}rescale(){if(!this.isValid)return this;return Zn(this,{values:Wn(this.normalize().shiftToAll().toObject())},!0)}shiftTo(...t){if(!this.isValid)return this;if(0===t.length)return this;t=t.map(t=>jn.normalizeUnit(t));const e={},r={},n=this.toObject();let i;for(const s of Pn)if(t.indexOf(s)>=0){i=s;let t=0;for(const e in r)t+=this.matrix[e][s]*r[e],r[e]=0;er(n[s])&&(t+=n[s]);const a=Math.trunc(t);e[s]=a,r[s]=(1e3*t-1e3*a)/1e3}else er(n[s])&&(r[s]=n[s]);for(const t in r)0!==r[t]&&(e[i]+=t===i?r[t]:r[t]/this.matrix[i][t]);return Hn(this.matrix,e),Zn(this,{values:e},!0)}shiftToAll(){return this.isValid?this.shiftTo("years","months","weeks","days","hours","minutes","seconds","milliseconds"):this}negate(){if(!this.isValid)return this;const t={};for(const e of Object.keys(this.values))t[e]=0===this.values[e]?0:-this.values[e];return Zn(this,{values:t},!0)}removeZeros(){if(!this.isValid)return this;return Zn(this,{values:Wn(this.values)},!0)}get years(){return this.isValid?this.values.years||0:NaN}get quarters(){return this.isValid?this.values.quarters||0:NaN}get months(){return this.isValid?this.values.months||0:NaN}get weeks(){return this.isValid?this.values.weeks||0:NaN}get days(){return this.isValid?this.values.days||0:NaN}get hours(){return this.isValid?this.values.hours||0:NaN}get minutes(){return this.isValid?this.values.minutes||0:NaN}get seconds(){return this.isValid?this.values.seconds||0:NaN}get milliseconds(){return this.isValid?this.values.milliseconds||0:NaN}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}equals(t){if(!this.isValid||!t.isValid)return!1;if(!this.loc.equals(t.loc))return!1;function e(t,e){return void 0===t||0===t?void 0===e||0===e:t===e}for(const r of Pn)if(!e(this.values[r],t.values[r]))return!1;return!0}}const Un="Invalid Interval";class Rn{constructor(t){this.s=t.start,this.e=t.end,this.invalid=t.invalid||null,this.isLuxonInterval=!0}static invalid(t,e=null){if(!t)throw new Ct("need to specify a reason the Interval is invalid");const r=t instanceof Ze?t:new Ze(t,e);if(Fe.throwOnInvalid)throw new St(r);return new Rn({invalid:r})}static fromDateTimes(t,e){const r=Pi(t),n=Pi(e),i=function(t,e){return t&&t.isValid?e&&e.isValid?e<t?Rn.invalid("end before start",`The end of an interval must be after its start, but you had start=${t.toISO()} and end=${e.toISO()}`):null:Rn.invalid("missing or invalid end"):Rn.invalid("missing or invalid start")}(r,n);return null==i?new Rn({start:r,end:n}):i}static after(t,e){const r=jn.fromDurationLike(e),n=Pi(t);return Rn.fromDateTimes(n,n.plus(r))}static before(t,e){const r=jn.fromDurationLike(e),n=Pi(t);return Rn.fromDateTimes(n.minus(r),n)}static fromISO(t,e){const[r,n]=(t||"").split("/",2);if(r&&n){let t,i,s,a;try{t=Li.fromISO(r,e),i=t.isValid}catch(n){i=!1}try{s=Li.fromISO(n,e),a=s.isValid}catch(n){a=!1}if(i&&a)return Rn.fromDateTimes(t,s);if(i){const r=jn.fromISO(n,e);if(r.isValid)return Rn.after(t,r)}else if(a){const t=jn.fromISO(r,e);if(t.isValid)return Rn.before(s,t)}}return Rn.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static isInterval(t){return t&&t.isLuxonInterval||!1}get start(){return this.isValid?this.s:null}get end(){return this.isValid?this.e:null}get lastDateTime(){return this.isValid&&this.e?this.e.minus(1):null}get isValid(){return null===this.invalidReason}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}length(t="milliseconds"){return this.isValid?this.toDuration(t).get(t):NaN}count(t="milliseconds",e){if(!this.isValid)return NaN;const r=this.start.startOf(t,e);let n;return n=e?.useLocaleWeeks?this.end.reconfigure({locale:r.locale}):this.end,n=n.startOf(t,e),Math.floor(n.diff(r,t).get(t))+(n.valueOf()!==this.end.valueOf())}hasSame(t){return!!this.isValid&&(this.isEmpty()||this.e.minus(1).hasSame(this.s,t))}isEmpty(){return this.s.valueOf()===this.e.valueOf()}isAfter(t){return!!this.isValid&&this.s>t}isBefore(t){return!!this.isValid&&this.e<=t}contains(t){return!!this.isValid&&(this.s<=t&&this.e>t)}set({start:t,end:e}={}){return this.isValid?Rn.fromDateTimes(t||this.s,e||this.e):this}splitAt(...t){if(!this.isValid)return[];const e=t.map(Pi).filter(t=>this.contains(t)).sort((t,e)=>t.toMillis()-e.toMillis()),r=[];let{s:n}=this,i=0;for(;n<this.e;){const t=e[i]||this.e,s=+t>+this.e?this.e:t;r.push(Rn.fromDateTimes(n,s)),n=s,i+=1}return r}splitBy(t){const e=jn.fromDurationLike(t);if(!this.isValid||!e.isValid||0===e.as("milliseconds"))return[];let r,{s:n}=this,i=1;const s=[];for(;n<this.e;){const t=this.start.plus(e.mapUnits(t=>t*i));r=+t>+this.e?this.e:t,s.push(Rn.fromDateTimes(n,r)),n=r,i+=1}return s}divideEqually(t){return this.isValid?this.splitBy(this.length()/t).slice(0,t):[]}overlaps(t){return this.e>t.s&&this.s<t.e}abutsStart(t){return!!this.isValid&&+this.e===+t.s}abutsEnd(t){return!!this.isValid&&+t.e===+this.s}engulfs(t){return!!this.isValid&&(this.s<=t.s&&this.e>=t.e)}equals(t){return!(!this.isValid||!t.isValid)&&(this.s.equals(t.s)&&this.e.equals(t.e))}intersection(t){if(!this.isValid)return this;const e=this.s>t.s?this.s:t.s,r=this.e<t.e?this.e:t.e;return e>=r?null:Rn.fromDateTimes(e,r)}union(t){if(!this.isValid)return this;const e=this.s<t.s?this.s:t.s,r=this.e>t.e?this.e:t.e;return Rn.fromDateTimes(e,r)}static merge(t){const[e,r]=t.sort((t,e)=>t.s-e.s).reduce(([t,e],r)=>e?e.overlaps(r)||e.abutsStart(r)?[t,e.union(r)]:[t.concat([e]),r]:[t,r],[[],null]);return r&&e.push(r),e}static xor(t){let e=null,r=0;const n=[],i=t.map(t=>[{time:t.s,type:"s"},{time:t.e,type:"e"}]),s=Array.prototype.concat(...i).sort((t,e)=>t.time-e.time);for(const t of s)r+="s"===t.type?1:-1,1===r?e=t.time:(e&&+e!==+t.time&&n.push(Rn.fromDateTimes(e,t.time)),e=null);return Rn.merge(n)}difference(...t){return Rn.xor([this].concat(t)).map(t=>this.intersection(t)).filter(t=>t&&!t.isEmpty())}toString(){return this.isValid?`[${this.s.toISO()} – ${this.e.toISO()})`:Un}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`:`Interval { Invalid, reason: ${this.invalidReason} }`}toLocaleString(t=Mt,e={}){return this.isValid?Wr.create(this.s.loc.clone(e),t).formatInterval(this):Un}toISO(t){return this.isValid?`${this.s.toISO(t)}/${this.e.toISO(t)}`:Un}toISODate(){return this.isValid?`${this.s.toISODate()}/${this.e.toISODate()}`:Un}toISOTime(t){return this.isValid?`${this.s.toISOTime(t)}/${this.e.toISOTime(t)}`:Un}toFormat(t,{separator:e=" – "}={}){return this.isValid?`${this.s.toFormat(t)}${e}${this.e.toFormat(t)}`:Un}toDuration(t,e){return this.isValid?this.e.diff(this.s,t,e):jn.invalid(this.invalidReason)}mapEndpoints(t){return Rn.fromDateTimes(t(this.s),t(this.e))}}class qn{static hasDST(t=Fe.defaultZone){const e=Li.now().setZone(t).set({month:12});return!t.isUniversal&&e.offset!==e.set({month:6}).offset}static isValidIANAZone(t){return se.isValidZone(t)}static normalizeZone(t){return ke(t,Fe.defaultZone)}static getStartOfWeek({locale:t=null,locObj:e=null}={}){return(e||be.create(t)).getStartOfWeek()}static getMinimumDaysInFirstWeek({locale:t=null,locObj:e=null}={}){return(e||be.create(t)).getMinDaysInFirstWeek()}static getWeekendWeekdays({locale:t=null,locObj:e=null}={}){return(e||be.create(t)).getWeekendDays().slice()}static months(t="long",{locale:e=null,numberingSystem:r=null,locObj:n=null,outputCalendar:i="gregory"}={}){return(n||be.create(e,r,i)).months(t)}static monthsFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:n=null,outputCalendar:i="gregory"}={}){return(n||be.create(e,r,i)).months(t,!0)}static weekdays(t="long",{locale:e=null,numberingSystem:r=null,locObj:n=null}={}){return(n||be.create(e,r,null)).weekdays(t)}static weekdaysFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:n=null}={}){return(n||be.create(e,r,null)).weekdays(t,!0)}static meridiems({locale:t=null}={}){return be.create(t).meridiems()}static eras(t="short",{locale:e=null}={}){return be.create(e,null,"gregory").eras(t)}static features(){return{relative:nr(),localeWeek:ir()}}}function Yn(t,e){const r=t=>t.toUTC(0,{keepLocalTime:!0}).startOf("day").valueOf(),n=r(e)-r(t);return Math.floor(jn.fromMillis(n).as("days"))}function Gn(t,e,r,n){let[i,s,a,o]=function(t,e,r){const n=[["years",(t,e)=>e.year-t.year],["quarters",(t,e)=>e.quarter-t.quarter+4*(e.year-t.year)],["months",(t,e)=>e.month-t.month+12*(e.year-t.year)],["weeks",(t,e)=>{const r=Yn(t,e);return(r-r%7)/7}],["days",Yn]],i={},s=t;let a,o;for(const[l,c]of n)r.indexOf(l)>=0&&(a=l,i[l]=c(t,e),o=s.plus(i),o>e?(i[l]--,(t=s.plus(i))>e&&(o=t,i[l]--,t=s.plus(i))):t=o);return[t,i,o,a]}(t,e,r);const l=e-i,c=r.filter(t=>["hours","minutes","seconds","milliseconds"].indexOf(t)>=0);0===c.length&&(a<e&&(a=i.plus({[o]:1})),a!==i&&(s[o]=(s[o]||0)+l/(a-i)));const u=jn.fromObject(s,n);return c.length>0?jn.fromMillis(l,n).shiftTo(...c).plus(u):u}function Jn(t,e=t=>t){return{regex:t,deser:([t])=>e(function(t){let e=parseInt(t,10);if(isNaN(e)){e="";for(let r=0;r<t.length;r++){const n=t.charCodeAt(r);if(-1!==t[r].search(De.hanidec))e+=xe.indexOf(t[r]);else for(const t in Ce){const[r,i]=Ce[t];n>=r&&n<=i&&(e+=n-r)}}return parseInt(e,10)}return e}(t))}}const Bn=`[ ${String.fromCharCode(160)}]`,Kn=new RegExp(Bn,"g");function Qn(t){return t.replace(/\./g,"\\.?").replace(Kn,Bn)}function Xn(t){return t.replace(/\./g,"").replace(Kn," ").toLowerCase()}function ti(t,e){return null===t?null:{regex:RegExp(t.map(Qn).join("|")),deser:([r])=>t.findIndex(t=>Xn(r)===Xn(t))+e}}function ei(t,e){return{regex:t,deser:([,t,e])=>Sr(t,e),groups:e}}function ri(t){return{regex:t,deser:([t])=>t}}const ni={year:{"2-digit":"yy",numeric:"yyyyy"},month:{numeric:"M","2-digit":"MM",short:"MMM",long:"MMMM"},day:{numeric:"d","2-digit":"dd"},weekday:{short:"EEE",long:"EEEE"},dayperiod:"a",dayPeriod:"a",hour12:{numeric:"h","2-digit":"hh"},hour24:{numeric:"H","2-digit":"HH"},minute:{numeric:"m","2-digit":"mm"},second:{numeric:"s","2-digit":"ss"},timeZoneName:{long:"ZZZZZ",short:"ZZZ"}};let ii=null;function si(t,e){return Array.prototype.concat(...t.map(t=>function(t,e){if(t.literal)return t;const r=li(Wr.macroTokenToFormatOpts(t.val),e);return null==r||r.includes(void 0)?t:r}(t,e)))}class ai{constructor(t,e){if(this.locale=t,this.format=e,this.tokens=si(Wr.parseFormat(e),t),this.units=this.tokens.map(e=>function(t,e){const r=Te(e),n=Te(e,"{2}"),i=Te(e,"{3}"),s=Te(e,"{4}"),a=Te(e,"{6}"),o=Te(e,"{1,2}"),l=Te(e,"{1,3}"),c=Te(e,"{1,6}"),u=Te(e,"{1,9}"),d=Te(e,"{2,4}"),h=Te(e,"{4,6}"),m=t=>{return{regex:RegExp((e=t.val,e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"))),deser:([t])=>t,literal:!0};var e},f=(f=>{if(t.literal)return m(f);switch(f.val){case"G":return ti(e.eras("short"),0);case"GG":return ti(e.eras("long"),0);case"y":return Jn(c);case"yy":case"kk":return Jn(d,br);case"yyyy":case"kkkk":return Jn(s);case"yyyyy":return Jn(h);case"yyyyyy":return Jn(a);case"M":case"L":case"d":case"H":case"h":case"m":case"q":case"s":case"W":return Jn(o);case"MM":case"LL":case"dd":case"HH":case"hh":case"mm":case"qq":case"ss":case"WW":return Jn(n);case"MMM":return ti(e.months("short",!0),1);case"MMMM":return ti(e.months("long",!0),1);case"LLL":return ti(e.months("short",!1),1);case"LLLL":return ti(e.months("long",!1),1);case"o":case"S":return Jn(l);case"ooo":case"SSS":return Jn(i);case"u":return ri(u);case"uu":return ri(o);case"uuu":case"E":case"c":return Jn(r);case"a":return ti(e.meridiems(),0);case"EEE":return ti(e.weekdays("short",!1),1);case"EEEE":return ti(e.weekdays("long",!1),1);case"ccc":return ti(e.weekdays("short",!0),1);case"cccc":return ti(e.weekdays("long",!0),1);case"Z":case"ZZ":return ei(new RegExp(`([+-]${o.source})(?::(${n.source}))?`),2);case"ZZZ":return ei(new RegExp(`([+-]${o.source})(${n.source})?`),2);case"z":return ri(/[a-z_+-/]{1,256}?/i);case" ":return ri(/[^\S\n\r]/);default:return m(f)}})(t)||{invalidReason:"missing Intl.DateTimeFormat.formatToParts support"};return f.token=t,f}(e,t)),this.disqualifyingUnit=this.units.find(t=>t.invalidReason),!this.disqualifyingUnit){const[t,e]=function(t){const e=t.map(t=>t.regex).reduce((t,e)=>`${t}(${e.source})`,"");return[`^${e}$`,t]}(this.units);this.regex=RegExp(t,"i"),this.handlers=e}}explainFromTokens(t){if(this.isValid){const[e,r]=function(t,e,r){const n=t.match(e);if(n){const t={};let e=1;for(const i in r)if(ar(r,i)){const s=r[i],a=s.groups?s.groups+1:1;!s.literal&&s.token&&(t[s.token.val[0]]=s.deser(n.slice(e,e+a))),e+=a}return[n,t]}return[n,{}]}(t,this.regex,this.handlers),[n,i,s]=r?function(t){let e,r=null;tr(t.z)||(r=se.create(t.z)),tr(t.Z)||(r||(r=new Se(t.Z)),e=t.Z),tr(t.q)||(t.M=3*(t.q-1)+1),tr(t.h)||(t.h<12&&1===t.a?t.h+=12:12===t.h&&0===t.a&&(t.h=0)),0===t.G&&t.y&&(t.y=-t.y),tr(t.u)||(t.S=hr(t.u));const n=Object.keys(t).reduce((e,r)=>{const n=(t=>{switch(t){case"S":return"millisecond";case"s":return"second";case"m":return"minute";case"h":case"H":return"hour";case"d":return"day";case"o":return"ordinal";case"L":case"M":return"month";case"y":return"year";case"E":case"c":return"weekday";case"W":return"weekNumber";case"k":return"weekYear";case"q":return"quarter";default:return null}})(r);return n&&(e[n]=t[r]),e},{});return[n,r,e]}(r):[null,null,void 0];if(ar(r,"a")&&ar(r,"H"))throw new kt("Can't include meridiem when specifying 24-hour format");return{input:t,tokens:this.tokens,regex:this.regex,rawMatches:e,matches:r,result:n,zone:i,specificOffset:s}}return{input:t,tokens:this.tokens,invalidReason:this.invalidReason}}get isValid(){return!this.disqualifyingUnit}get invalidReason(){return this.disqualifyingUnit?this.disqualifyingUnit.invalidReason:null}}function oi(t,e,r){return new ai(t,r).explainFromTokens(e)}function li(t,e){if(!t)return null;const r=Wr.create(e,t).dtFormatter((ii||(ii=Li.fromMillis(1555555555555)),ii)),n=r.formatToParts(),i=r.resolvedOptions();return n.map(e=>function(t,e,r){const{type:n,value:i}=t;if("literal"===n){const t=/^\s+$/.test(i);return{literal:!t,val:t?" ":i}}const s=e[n];let a=n;"hour"===n&&(a=null!=e.hour12?e.hour12?"hour12":"hour24":null!=e.hourCycle?"h11"===e.hourCycle||"h12"===e.hourCycle?"hour12":"hour24":r.hour12?"hour12":"hour24");let o=ni[a];if("object"==typeof o&&(o=o[s]),o)return{literal:!1,val:o}}(e,t,i))}const ci="Invalid DateTime",ui=864e13;function di(t){return new Ze("unsupported zone",`the zone "${t.name}" is not supported`)}function hi(t){return null===t.weekData&&(t.weekData=Ye(t.c)),t.weekData}function mi(t){return null===t.localWeekData&&(t.localWeekData=Ye(t.c,t.loc.getMinDaysInFirstWeek(),t.loc.getStartOfWeek())),t.localWeekData}function fi(t,e){const r={ts:t.ts,zone:t.zone,c:t.c,o:t.o,loc:t.loc,invalid:t.invalid};return new Li({...r,...e,old:r})}function pi(t,e,r){let n=t-60*e*1e3;const i=r.offset(n);if(e===i)return[n,e];n-=60*(i-e)*1e3;const s=r.offset(n);return i===s?[n,i]:[t-60*Math.min(i,s)*1e3,Math.max(i,s)]}function gi(t,e){const r=new Date(t+=60*e*1e3);return{year:r.getUTCFullYear(),month:r.getUTCMonth()+1,day:r.getUTCDate(),hour:r.getUTCHours(),minute:r.getUTCMinutes(),second:r.getUTCSeconds(),millisecond:r.getUTCMilliseconds()}}function yi(t,e,r){return pi(yr(t),e,r)}function vi(t,e){const r=t.o,n=t.c.year+Math.trunc(e.years),i=t.c.month+Math.trunc(e.months)+3*Math.trunc(e.quarters),s={...t.c,year:n,month:i,day:Math.min(t.c.day,gr(n,i))+Math.trunc(e.days)+7*Math.trunc(e.weeks)},a=jn.fromObject({years:e.years-Math.trunc(e.years),quarters:e.quarters-Math.trunc(e.quarters),months:e.months-Math.trunc(e.months),weeks:e.weeks-Math.trunc(e.weeks),days:e.days-Math.trunc(e.days),hours:e.hours,minutes:e.minutes,seconds:e.seconds,milliseconds:e.milliseconds}).as("milliseconds"),o=yr(s);let[l,c]=pi(o,r,t.zone);return 0!==a&&(l+=a,c=t.zone.offset(l)),{ts:l,o:c}}function wi(t,e,r,n,i,s){const{setZone:a,zone:o}=r;if(t&&0!==Object.keys(t).length||e){const n=e||o,i=Li.fromObject(t,{...r,zone:n,specificOffset:s});return a?i:i.setZone(o)}return Li.invalid(new Ze("unparsable",`the input "${i}" can't be parsed as ${n}`))}function bi(t,e,r=!0){return t.isValid?Wr.create(be.create("en-US"),{allowZ:r,forceSimple:!0}).formatDateTimeFromString(t,e):null}function _i(t,e,r){const n=t.c.year>9999||t.c.year<0;let i="";if(n&&t.c.year>=0&&(i+="+"),i+=cr(t.c.year,n?6:4),"year"===r)return i;if(e){if(i+="-",i+=cr(t.c.month),"month"===r)return i;i+="-"}else if(i+=cr(t.c.month),"month"===r)return i;return i+=cr(t.c.day),i}function Si(t,e,r,n,i,s,a){let o=!r||0!==t.c.millisecond||0!==t.c.second,l="";switch(a){case"day":case"month":case"year":break;default:if(l+=cr(t.c.hour),"hour"===a)break;if(e){if(l+=":",l+=cr(t.c.minute),"minute"===a)break;o&&(l+=":",l+=cr(t.c.second))}else{if(l+=cr(t.c.minute),"minute"===a)break;o&&(l+=cr(t.c.second))}if("second"===a)break;!o||n&&0===t.c.millisecond||(l+=".",l+=cr(t.c.millisecond,3))}return i&&(t.isOffsetFixed&&0===t.offset&&!s?l+="Z":t.o<0?(l+="-",l+=cr(Math.trunc(-t.o/60)),l+=":",l+=cr(Math.trunc(-t.o%60))):(l+="+",l+=cr(Math.trunc(t.o/60)),l+=":",l+=cr(Math.trunc(t.o%60)))),s&&(l+="["+t.zone.ianaName+"]"),l}const $i={month:1,day:1,hour:0,minute:0,second:0,millisecond:0},ki={weekNumber:1,weekday:1,hour:0,minute:0,second:0,millisecond:0},Di={ordinal:1,hour:0,minute:0,second:0,millisecond:0},Ci=["year","month","day","hour","minute","second","millisecond"],xi=["weekYear","weekNumber","weekday","hour","minute","second","millisecond"],Oi=["year","ordinal","hour","minute","second","millisecond"];function Ti(t){const e={year:"year",years:"year",month:"month",months:"month",day:"day",days:"day",hour:"hour",hours:"hour",minute:"minute",minutes:"minute",quarter:"quarter",quarters:"quarter",second:"second",seconds:"second",millisecond:"millisecond",milliseconds:"millisecond",weekday:"weekday",weekdays:"weekday",weeknumber:"weekNumber",weeksnumber:"weekNumber",weeknumbers:"weekNumber",weekyear:"weekYear",weekyears:"weekYear",ordinal:"ordinal"}[t.toLowerCase()];if(!e)throw new Dt(t);return e}function Ai(t){switch(t.toLowerCase()){case"localweekday":case"localweekdays":return"localWeekday";case"localweeknumber":case"localweeknumbers":return"localWeekNumber";case"localweekyear":case"localweekyears":return"localWeekYear";default:return Ti(t)}}function Mi(t,e){const r=ke(e.zone,Fe.defaultZone);if(!r.isValid)return Li.invalid(di(r));const n=be.fromObject(e);let i,s;if(tr(t.year))i=Fe.now();else{for(const e of Ci)tr(t[e])&&(t[e]=$i[e]);const e=Qe(t)||Xe(t);if(e)return Li.invalid(e);const n=function(t){if(void 0===Vi&&(Vi=Fe.now()),"iana"!==t.type)return t.offset(Vi);const e=t.name;let r=Ii.get(e);return void 0===r&&(r=t.offset(Vi),Ii.set(e,r)),r}(r);[i,s]=yi(t,n,r)}return new Li({ts:i,zone:r,loc:n,o:s})}function Ei(t,e,r){const n=!!tr(r.round)||r.round,i=tr(r.rounding)?"trunc":r.rounding,s=(t,s)=>{t=mr(t,n||r.calendary?0:2,r.calendary?"round":i);return e.loc.clone(r).relFormatter(r).format(t,s)},a=n=>r.calendary?e.hasSame(t,n)?0:e.startOf(n).diff(t.startOf(n),n).get(n):e.diff(t,n).get(n);if(r.unit)return s(a(r.unit),r.unit);for(const t of r.units){const e=a(t);if(Math.abs(e)>=1)return s(e,t)}return s(t>e?-0:0,r.units[r.units.length-1])}function Ni(t){let e,r={};return t.length>0&&"object"==typeof t[t.length-1]?(r=t[t.length-1],e=Array.from(t).slice(0,t.length-1)):e=Array.from(t),[r,e]}let Vi;const Ii=new Map;class Li{constructor(t){const e=t.zone||Fe.defaultZone;let r=t.invalid||(Number.isNaN(t.ts)?new Ze("invalid input"):null)||(e.isValid?null:di(e));this.ts=tr(t.ts)?Fe.now():t.ts;let n=null,i=null;if(!r){if(t.old&&t.old.ts===this.ts&&t.old.zone.equals(e))[n,i]=[t.old.c,t.old.o];else{const s=er(t.o)&&!t.old?t.o:e.offset(this.ts);n=gi(this.ts,s),r=Number.isNaN(n.year)?new Ze("invalid input"):null,n=r?null:n,i=r?null:s}}this._zone=e,this.loc=t.loc||be.create(),this.invalid=r,this.weekData=null,this.localWeekData=null,this.c=n,this.o=i,this.isLuxonDateTime=!0}static now(){return new Li({})}static local(){const[t,e]=Ni(arguments),[r,n,i,s,a,o,l]=e;return Mi({year:r,month:n,day:i,hour:s,minute:a,second:o,millisecond:l},t)}static utc(){const[t,e]=Ni(arguments),[r,n,i,s,a,o,l]=e;return t.zone=Se.utcInstance,Mi({year:r,month:n,day:i,hour:s,minute:a,second:o,millisecond:l},t)}static fromJSDate(t,e={}){const r=function(t){return"[object Date]"===Object.prototype.toString.call(t)}(t)?t.valueOf():NaN;if(Number.isNaN(r))return Li.invalid("invalid input");const n=ke(e.zone,Fe.defaultZone);return n.isValid?new Li({ts:r,zone:n,loc:be.fromObject(e)}):Li.invalid(di(n))}static fromMillis(t,e={}){if(er(t))return t<-ui||t>ui?Li.invalid("Timestamp out of range"):new Li({ts:t,zone:ke(e.zone,Fe.defaultZone),loc:be.fromObject(e)});throw new Ct(`fromMillis requires a numerical input, but received a ${typeof t} with value ${t}`)}static fromSeconds(t,e={}){if(er(t))return new Li({ts:1e3*t,zone:ke(e.zone,Fe.defaultZone),loc:be.fromObject(e)});throw new Ct("fromSeconds requires a numerical input")}static fromObject(t,e={}){t=t||{};const r=ke(e.zone,Fe.defaultZone);if(!r.isValid)return Li.invalid(di(r));const n=be.fromObject(e),i=kr(t,Ai),{minDaysInFirstWeek:s,startOfWeek:a}=Ke(i,n),o=Fe.now(),l=tr(e.specificOffset)?r.offset(o):e.specificOffset,c=!tr(i.ordinal),u=!tr(i.year),d=!tr(i.month)||!tr(i.day),h=u||d,m=i.weekYear||i.weekNumber;if((h||c)&&m)throw new kt("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(d&&c)throw new kt("Can't mix ordinal dates with month/day");const f=m||i.weekday&&!h;let p,g,y=gi(o,l);f?(p=xi,g=ki,y=Ye(y,s,a)):c?(p=Oi,g=Di,y=Je(y)):(p=Ci,g=$i);let v=!1;for(const t of p){tr(i[t])?i[t]=v?g[t]:y[t]:v=!0}const w=f?function(t,e=4,r=1){const n=rr(t.weekYear),i=lr(t.weekNumber,1,wr(t.weekYear,e,r)),s=lr(t.weekday,1,7);return n?i?!s&&We("weekday",t.weekday):We("week",t.weekNumber):We("weekYear",t.weekYear)}(i,s,a):c?function(t){const e=rr(t.year),r=lr(t.ordinal,1,pr(t.year));return e?!r&&We("ordinal",t.ordinal):We("year",t.year)}(i):Qe(i),b=w||Xe(i);if(b)return Li.invalid(b);const _=f?Ge(i,s,a):c?Be(i):i,[S,$]=yi(_,l,r),k=new Li({ts:S,zone:r,o:$,loc:n});return i.weekday&&h&&t.weekday!==k.weekday?Li.invalid("mismatched weekday",`you can't specify both a weekday of ${i.weekday} and a date of ${k.toISO()}`):k.isValid?k:Li.invalid(k.invalid)}static fromISO(t,e={}){const[r,n]=function(t){return qr(t,[wn,$n],[bn,kn],[_n,Dn],[Sn,Cn])}(t);return wi(r,n,e,"ISO 8601",t)}static fromRFC2822(t,e={}){const[r,n]=function(t){return qr(function(t){return t.replace(/\([^()]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").trim()}(t),[hn,mn])}(t);return wi(r,n,e,"RFC 2822",t)}static fromHTTP(t,e={}){const[r,n]=function(t){return qr(t,[fn,yn],[pn,yn],[gn,vn])}(t);return wi(r,n,e,"HTTP",e)}static fromFormat(t,e,r={}){if(tr(t)||tr(e))throw new Ct("fromFormat requires an input string and a format");const{locale:n=null,numberingSystem:i=null}=r,s=be.fromOpts({locale:n,numberingSystem:i,defaultToEN:!0}),[a,o,l,c]=function(t,e,r){const{result:n,zone:i,specificOffset:s,invalidReason:a}=oi(t,e,r);return[n,i,s,a]}(s,t,e);return c?Li.invalid(c):wi(a,o,r,`format ${e}`,t,l)}static fromString(t,e,r={}){return Li.fromFormat(t,e,r)}static fromSQL(t,e={}){const[r,n]=function(t){return qr(t,[On,$n],[Tn,An])}(t);return wi(r,n,e,"SQL",t)}static invalid(t,e=null){if(!t)throw new Ct("need to specify a reason the DateTime is invalid");const r=t instanceof Ze?t:new Ze(t,e);if(Fe.throwOnInvalid)throw new _t(r);return new Li({invalid:r})}static isDateTime(t){return t&&t.isLuxonDateTime||!1}static parseFormatForOpts(t,e={}){const r=li(t,be.fromObject(e));return r?r.map(t=>t?t.val:null).join(""):null}static expandFormat(t,e={}){return si(Wr.parseFormat(t),be.fromObject(e)).map(t=>t.val).join("")}static resetCache(){Vi=void 0,Ii.clear()}get(t){return this[t]}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}get outputCalendar(){return this.isValid?this.loc.outputCalendar:null}get zone(){return this._zone}get zoneName(){return this.isValid?this.zone.name:null}get year(){return this.isValid?this.c.year:NaN}get quarter(){return this.isValid?Math.ceil(this.c.month/3):NaN}get month(){return this.isValid?this.c.month:NaN}get day(){return this.isValid?this.c.day:NaN}get hour(){return this.isValid?this.c.hour:NaN}get minute(){return this.isValid?this.c.minute:NaN}get second(){return this.isValid?this.c.second:NaN}get millisecond(){return this.isValid?this.c.millisecond:NaN}get weekYear(){return this.isValid?hi(this).weekYear:NaN}get weekNumber(){return this.isValid?hi(this).weekNumber:NaN}get weekday(){return this.isValid?hi(this).weekday:NaN}get isWeekend(){return this.isValid&&this.loc.getWeekendDays().includes(this.weekday)}get localWeekday(){return this.isValid?mi(this).weekday:NaN}get localWeekNumber(){return this.isValid?mi(this).weekNumber:NaN}get localWeekYear(){return this.isValid?mi(this).weekYear:NaN}get ordinal(){return this.isValid?Je(this.c).ordinal:NaN}get monthShort(){return this.isValid?qn.months("short",{locObj:this.loc})[this.month-1]:null}get monthLong(){return this.isValid?qn.months("long",{locObj:this.loc})[this.month-1]:null}get weekdayShort(){return this.isValid?qn.weekdays("short",{locObj:this.loc})[this.weekday-1]:null}get weekdayLong(){return this.isValid?qn.weekdays("long",{locObj:this.loc})[this.weekday-1]:null}get offset(){return this.isValid?+this.o:NaN}get offsetNameShort(){return this.isValid?this.zone.offsetName(this.ts,{format:"short",locale:this.locale}):null}get offsetNameLong(){return this.isValid?this.zone.offsetName(this.ts,{format:"long",locale:this.locale}):null}get isOffsetFixed(){return this.isValid?this.zone.isUniversal:null}get isInDST(){return!this.isOffsetFixed&&(this.offset>this.set({month:1,day:1}).offset||this.offset>this.set({month:5}).offset)}getPossibleOffsets(){if(!this.isValid||this.isOffsetFixed)return[this];const t=864e5,e=6e4,r=yr(this.c),n=this.zone.offset(r-t),i=this.zone.offset(r+t),s=this.zone.offset(r-n*e),a=this.zone.offset(r-i*e);if(s===a)return[this];const o=r-s*e,l=r-a*e,c=gi(o,s),u=gi(l,a);return c.hour===u.hour&&c.minute===u.minute&&c.second===u.second&&c.millisecond===u.millisecond?[fi(this,{ts:o}),fi(this,{ts:l})]:[this]}get isInLeapYear(){return fr(this.year)}get daysInMonth(){return gr(this.year,this.month)}get daysInYear(){return this.isValid?pr(this.year):NaN}get weeksInWeekYear(){return this.isValid?wr(this.weekYear):NaN}get weeksInLocalWeekYear(){return this.isValid?wr(this.localWeekYear,this.loc.getMinDaysInFirstWeek(),this.loc.getStartOfWeek()):NaN}resolvedLocaleOptions(t={}){const{locale:e,numberingSystem:r,calendar:n}=Wr.create(this.loc.clone(t),t).resolvedOptions(this);return{locale:e,numberingSystem:r,outputCalendar:n}}toUTC(t=0,e={}){return this.setZone(Se.instance(t),e)}toLocal(){return this.setZone(Fe.defaultZone)}setZone(t,{keepLocalTime:e=!1,keepCalendarTime:r=!1}={}){if((t=ke(t,Fe.defaultZone)).equals(this.zone))return this;if(t.isValid){let n=this.ts;if(e||r){const e=t.offset(this.ts),r=this.toObject();[n]=yi(r,e,t)}return fi(this,{ts:n,zone:t})}return Li.invalid(di(t))}reconfigure({locale:t,numberingSystem:e,outputCalendar:r}={}){return fi(this,{loc:this.loc.clone({locale:t,numberingSystem:e,outputCalendar:r})})}setLocale(t){return this.reconfigure({locale:t})}set(t){if(!this.isValid)return this;const e=kr(t,Ai),{minDaysInFirstWeek:r,startOfWeek:n}=Ke(e,this.loc),i=!tr(e.weekYear)||!tr(e.weekNumber)||!tr(e.weekday),s=!tr(e.ordinal),a=!tr(e.year),o=!tr(e.month)||!tr(e.day),l=a||o,c=e.weekYear||e.weekNumber;if((l||s)&&c)throw new kt("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(o&&s)throw new kt("Can't mix ordinal dates with month/day");let u;i?u=Ge({...Ye(this.c,r,n),...e},r,n):tr(e.ordinal)?(u={...this.toObject(),...e},tr(e.day)&&(u.day=Math.min(gr(u.year,u.month),u.day))):u=Be({...Je(this.c),...e});const[d,h]=yi(u,this.o,this.zone);return fi(this,{ts:d,o:h})}plus(t){if(!this.isValid)return this;return fi(this,vi(this,jn.fromDurationLike(t)))}minus(t){if(!this.isValid)return this;return fi(this,vi(this,jn.fromDurationLike(t).negate()))}startOf(t,{useLocaleWeeks:e=!1}={}){if(!this.isValid)return this;const r={},n=jn.normalizeUnit(t);switch(n){case"years":r.month=1;case"quarters":case"months":r.day=1;case"weeks":case"days":r.hour=0;case"hours":r.minute=0;case"minutes":r.second=0;case"seconds":r.millisecond=0}if("weeks"===n)if(e){const t=this.loc.getStartOfWeek(),{weekday:e}=this;e<t&&(r.weekNumber=this.weekNumber-1),r.weekday=t}else r.weekday=1;if("quarters"===n){const t=Math.ceil(this.month/3);r.month=3*(t-1)+1}return this.set(r)}endOf(t,e){return this.isValid?this.plus({[t]:1}).startOf(t,e).minus(1):this}toFormat(t,e={}){return this.isValid?Wr.create(this.loc.redefaultToEN(e)).formatDateTimeFromString(this,t):ci}toLocaleString(t=Mt,e={}){return this.isValid?Wr.create(this.loc.clone(e),t).formatDateTime(this):ci}toLocaleParts(t={}){return this.isValid?Wr.create(this.loc.clone(t),t).formatDateTimeParts(this):[]}toISO({format:t="extended",suppressSeconds:e=!1,suppressMilliseconds:r=!1,includeOffset:n=!0,extendedZone:i=!1,precision:s="milliseconds"}={}){if(!this.isValid)return null;const a="extended"===t;let o=_i(this,a,s=Ti(s));return Ci.indexOf(s)>=3&&(o+="T"),o+=Si(this,a,e,r,n,i,s),o}toISODate({format:t="extended",precision:e="day"}={}){return this.isValid?_i(this,"extended"===t,Ti(e)):null}toISOWeekDate(){return bi(this,"kkkk-'W'WW-c")}toISOTime({suppressMilliseconds:t=!1,suppressSeconds:e=!1,includeOffset:r=!0,includePrefix:n=!1,extendedZone:i=!1,format:s="extended",precision:a="milliseconds"}={}){if(!this.isValid)return null;return a=Ti(a),(n&&Ci.indexOf(a)>=3?"T":"")+Si(this,"extended"===s,e,t,r,i,a)}toRFC2822(){return bi(this,"EEE, dd LLL yyyy HH:mm:ss ZZZ",!1)}toHTTP(){return bi(this.toUTC(),"EEE, dd LLL yyyy HH:mm:ss 'GMT'")}toSQLDate(){return this.isValid?_i(this,!0):null}toSQLTime({includeOffset:t=!0,includeZone:e=!1,includeOffsetSpace:r=!0}={}){let n="HH:mm:ss.SSS";return(e||t)&&(r&&(n+=" "),e?n+="z":t&&(n+="ZZ")),bi(this,n,!0)}toSQL(t={}){return this.isValid?`${this.toSQLDate()} ${this.toSQLTime(t)}`:null}toString(){return this.isValid?this.toISO():ci}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`:`DateTime { Invalid, reason: ${this.invalidReason} }`}valueOf(){return this.toMillis()}toMillis(){return this.isValid?this.ts:NaN}toSeconds(){return this.isValid?this.ts/1e3:NaN}toUnixInteger(){return this.isValid?Math.floor(this.ts/1e3):NaN}toJSON(){return this.toISO()}toBSON(){return this.toJSDate()}toObject(t={}){if(!this.isValid)return{};const e={...this.c};return t.includeConfig&&(e.outputCalendar=this.outputCalendar,e.numberingSystem=this.loc.numberingSystem,e.locale=this.loc.locale),e}toJSDate(){return new Date(this.isValid?this.ts:NaN)}diff(t,e="milliseconds",r={}){if(!this.isValid||!t.isValid)return jn.invalid("created by diffing an invalid DateTime");const n={locale:this.locale,numberingSystem:this.numberingSystem,...r},i=(o=e,Array.isArray(o)?o:[o]).map(jn.normalizeUnit),s=t.valueOf()>this.valueOf(),a=Gn(s?this:t,s?t:this,i,n);var o;return s?a.negate():a}diffNow(t="milliseconds",e={}){return this.diff(Li.now(),t,e)}until(t){return this.isValid?Rn.fromDateTimes(this,t):this}hasSame(t,e,r){if(!this.isValid)return!1;const n=t.valueOf(),i=this.setZone(t.zone,{keepLocalTime:!0});return i.startOf(e,r)<=n&&n<=i.endOf(e,r)}equals(t){return this.isValid&&t.isValid&&this.valueOf()===t.valueOf()&&this.zone.equals(t.zone)&&this.loc.equals(t.loc)}toRelative(t={}){if(!this.isValid)return null;const e=t.base||Li.fromObject({},{zone:this.zone}),r=t.padding?this<e?-t.padding:t.padding:0;let n=["years","months","days","hours","minutes","seconds"],i=t.unit;return Array.isArray(t.unit)&&(n=t.unit,i=void 0),Ei(e,this.plus(r),{...t,numeric:"always",units:n,unit:i})}toRelativeCalendar(t={}){return this.isValid?Ei(t.base||Li.fromObject({},{zone:this.zone}),this,{...t,numeric:"auto",units:["years","months","days"],calendary:!0}):null}static min(...t){if(!t.every(Li.isDateTime))throw new Ct("min requires all arguments be DateTimes");return sr(t,t=>t.valueOf(),Math.min)}static max(...t){if(!t.every(Li.isDateTime))throw new Ct("max requires all arguments be DateTimes");return sr(t,t=>t.valueOf(),Math.max)}static fromFormatExplain(t,e,r={}){const{locale:n=null,numberingSystem:i=null}=r;return oi(be.fromOpts({locale:n,numberingSystem:i,defaultToEN:!0}),t,e)}static fromStringExplain(t,e,r={}){return Li.fromFormatExplain(t,e,r)}static buildFormatParser(t,e={}){const{locale:r=null,numberingSystem:n=null}=e,i=be.fromOpts({locale:r,numberingSystem:n,defaultToEN:!0});return new ai(i,t)}static fromFormatParser(t,e,r={}){if(tr(t)||tr(e))throw new Ct("fromFormatParser requires an input string and a format parser");const{locale:n=null,numberingSystem:i=null}=r,s=be.fromOpts({locale:n,numberingSystem:i,defaultToEN:!0});if(!s.equals(e.locale))throw new Ct(`fromFormatParser called with a locale of ${s}, but the format parser was created for ${e.locale}`);const{result:a,zone:o,specificOffset:l,invalidReason:c}=e.explainFromTokens(t);return c?Li.invalid(c):wi(a,o,r,`format ${e.format}`,t,l)}static get DATE_SHORT(){return Mt}static get DATE_MED(){return Et}static get DATE_MED_WITH_WEEKDAY(){return Nt}static get DATE_FULL(){return Vt}static get DATE_HUGE(){return It}static get TIME_SIMPLE(){return Lt}static get TIME_WITH_SECONDS(){return Pt}static get TIME_WITH_SHORT_OFFSET(){return Ft}static get TIME_WITH_LONG_OFFSET(){return Zt}static get TIME_24_SIMPLE(){return zt}static get TIME_24_WITH_SECONDS(){return Ht}static get TIME_24_WITH_SHORT_OFFSET(){return Wt}static get TIME_24_WITH_LONG_OFFSET(){return jt}static get DATETIME_SHORT(){return Ut}static get DATETIME_SHORT_WITH_SECONDS(){return Rt}static get DATETIME_MED(){return qt}static get DATETIME_MED_WITH_SECONDS(){return Yt}static get DATETIME_MED_WITH_WEEKDAY(){return Gt}static get DATETIME_FULL(){return Jt}static get DATETIME_FULL_WITH_SECONDS(){return Bt}static get DATETIME_HUGE(){return Kt}static get DATETIME_HUGE_WITH_SECONDS(){return Qt}}function Pi(t){if(Li.isDateTime(t))return t;if(t&&t.valueOf&&er(t.valueOf()))return Li.fromJSDate(t);if(t&&"object"==typeof t)return Li.fromObject(t);throw new Ct(`Unknown datetime argument: ${t}, of type ${typeof t}`)}class Fi{static getPlantStageColor(t){const e=t.toLowerCase();return this.stageColors[e]??"#757575"}static getPlantStageIcon(t){const e=t.toLowerCase();return this.stageIcons[e]??wt}static createGridLayout(t,e,r){const n=Array.from({length:e},()=>Array.from({length:r},()=>null));return t.forEach(t=>{const i=(t.attributes?.row??1)-1,s=(t.attributes?.col??1)-1;i>=0&&i<e&&s>=0&&s<r&&(n[i][s]=t)}),{rows:e,cols:r,grid:n}}static calculateEffectiveRows(t){const{name:e,plants:r,plants_per_row:n}=t;if("dry Overview"===e||"cure Overview"===e){if(0===r.length)return 1;const t=Math.max(...r.map(t=>t.attributes?.row||1)),e=r.filter(e=>(e.attributes?.row||1)===t).length;return e>=n?t+1:t}return n}static getCurrentDateTime(){return(new Date).toISOString().slice(0,16)}}Fi.stageColors={seedling:"#4CAF50",vegetative:"#8BC34A",flower:"#FF9800",dry:"#795548",cure:"#9C27B0"},Fi.stageIcons={seedling:wt,vegetative:wt,flower:gt,dry:yt,cure:ft};class Zi{constructor(t){this.hass=t}getGrowspaceDevices(){if(!this.hass)return[];const t=Object.values(this.hass.states),e=t.filter(t=>t.entity_id.endsWith("_overview")),r=new Map;return e.forEach(t=>{const e=t.attributes?.growspace_id??t.entity_id;r.set(e,[])}),t.forEach(t=>{if(void 0!==t.attributes?.row&&void 0!==t.attributes?.col){const n=this.getGrowspaceId(t,e);r.has(n)||r.set(n,[]),r.get(n).push(t)}}),Array.from(r.entries()).map(([t,r])=>{const n=e.find(e=>e.attributes?.growspace_id===t),i=n?.attributes?.friendly_name||`Growspace ${t}`,s=n?.attributes?.type??(i.toLowerCase().includes("dry")?"dry":i.toLowerCase().includes("cure")?"cure":"normal");return a={device_id:t,name:i,plants:r,rows:n?.attributes?.rows??3,plants_per_row:n?.attributes?.plants_per_row??3,type:s},{...a,type:a.type??"normal"};var a})}getGrowspaceId(t,e){return t.attributes?.growspace_id||e.find(e=>e.entity_id.startsWith(t.entity_id.split("_")[0]))?.attributes?.growspace_id||"unknown"}getStrainLibrary(){const t=Object.values(this.hass.states).find(t=>t.entity_id.endsWith("_strain_library"));return t?.attributes?.strains||[]}async addPlant(t){return this.hass.callService("growspace_manager","add_plant",t)}async updatePlant(t){return this.hass.callService("growspace_manager","update_plant",t)}async removePlant(t){return this.hass.callService("growspace_manager","remove_plant",{plant_id:t})}getPlantInternalId(t){return t.entity_id}async harvestPlant(t,e="dry"){return this.hass.callService("growspace_manager","harvest_plant",{plant_id:t,target_growspace_name:e})}async importStrainLibrary(t,e=!0){return this.hass.callService("growspace_manager","import_strain_library",{strains:t,replace:e})}async clearStrainLibrary(){return this.hass.callService("growspace_manager","clear_strain_library",{})}}class zi{static renderAddPlantDialog(t,e,r){return t?.open?j`
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
                <path d="${pt}"></path>
              </svg>
              Strain *
            </label>
            <select 
              class="form-input"
              .value=${t.strain||""} 
              @change=${t=>r.onStrainChange(t.target.value)}
            >
              <option value="">Select a strain...</option>
              ${e.map(e=>j`
                <option value="${e}" ?selected=${t.strain===e}>${e}</option>
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
            ${this.renderDateTimeInput("Vegetative Start","M15,13H16.5V15.82L18.94,17.23L18.19,18.53L15,16.69V13M19,8H5V19H9.67C9.24,18.09 9,17.07 9,16A7,7 0 0,1 16,9C17.07,9 18.09,9.24 19,9.67V8M5,21C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H6V1H8V3H16V1H18V3H19A2,2 0 0,1 21,5V11.1C22.24,12.36 23,14.09 23,16A7,7 0 0,1 16,23C14.09,23 12.36,22.24 11.1,21H5M16,11.15A4.85,4.85 0 0,0 11.15,16C11.15,18.68 13.32,20.85 16,20.85A4.85,4.85 0 0,0 20.85,16C20.85,13.32 18.68,11.15 16,11.15Z",t.veg_start||"",r.onVegStartChange)}
            ${this.renderDateTimeInput("Flower Start",gt,t.flower_start||"",r.onFlowerStartChange)}
            ${this.renderDateTimeInput("Dry Start",gt,t.dry_start||"",r.onDryStartChange)}
            ${this.renderDateTimeInput("Cure Start",gt,t.cure_start||"",r.onCureStartChange)}
          </div>

          <div style="background: rgba(var(--rgb-primary-color), 0.05); padding: var(--spacing-md); border-radius: var(--border-radius); border-left: 4px solid var(--primary-color);">
            <strong>Position:</strong> Row ${t.row+1}, Column ${t.col+1}
          </div>
        </div>

        <button class="action-button primary" slot="primaryAction" @click=${r.onConfirm}>
          <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${wt}"></path>
          </svg>
          Add Plant
        </button>
        <button class="action-button" slot="secondaryAction" @click=${r.onClose}>
          Cancel
        </button>
      </ha-dialog>
    `:j``}static renderPlantOverviewDialog(t,e){if(!t?.open)return j``;const{plant:r,editedAttributes:n}=t,i=r.attributes?.plant_id||r.entity_id.replace("sensor.",""),s=(t,r)=>{n[t]="number"==typeof r?r.toString():r,e.onAttributeChange(t,n[t])};return j`
      <ha-dialog
        open
        @closed=${e.onClose}
        heading="${n.strain||"Plant"} Details"
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="dialog-content">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${this.renderTextInput("Strain",n.strain||"",t=>e.onAttributeChange("strain",t))}
            ${this.renderTextInput("Phenotype",n.phenotype||"",t=>e.onAttributeChange("phenotype",t))}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${this.renderNumberInput("Row",n.row||1,t=>e.onAttributeChange("row",parseInt(t)))}
            ${this.renderNumberInput("Column",n.col||1,t=>e.onAttributeChange("col",parseInt(t)))}
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
            ${"veg"===n.stage||"flower"===n.stage?this.renderDateTimeInput("Vegetative Start",wt,n.veg_start??"",t=>s("veg_start",t)):R}

            ${this.renderDateTimeInput("Flower Start",gt,n.flower_start??"",t=>s("flower_start",t))}

            ${"dry"===n.stage||"cure"===n.stage?this.renderDateTimeInput("Dry Start",yt,n.dry_start??"",t=>s("dry_start",t)):R}

            ${"cure"===n.stage?this.renderDateTimeInput("Cure Start",ft,n.cure_start??"",t=>s("cure_start",t)):R}
          </div>


          ${this.renderPlantStats(r)}
        </div>

        <button class="action-button primary" slot="primaryAction" @click=${e.onUpdate}>
          <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"></path>
          </svg>
          Update Plant
        </button>
        
        <button class="action-button" slot="secondaryAction" @click=${()=>e.onDelete(i)}>
          Remove Plant
        </button>
        
        <button class="action-button" slot="secondaryAction" @click=${e.onClose}>
          Cancel
        </button>
        
        ${"flower"===r.state.toLowerCase()?j`            
          <button class="action-button primary" @click=${()=>e.onHarvest(r)}>
            Harvest
          </button>
        `:""}

        ${"dry"===r.state.toLowerCase()?j`
          <button class="action-button primary" @click=${e.onFinishDrying}>
            Finish Drying
          </button>
        `:""}
      </ha-dialog>
    `}static renderStrainLibraryDialog(t,e){return t?.open?j`
      <ha-dialog 
        open 
        heading="Strain Library Management" 
        @closed=${e.onClose}
        .scrimClickAction=${""}
        .escapeKeyAction=${"close"}
        .className=${"strain-dialog"}
      >
        <div class="dialog-content">
          <div class="strain-library-header">
            <div class="strain-input-group">
              <input 
                type="text" 
                class="form-input"
                placeholder="Enter new strain name..."
                .value=${t.newStrain}
                @input=${t=>e.onNewStrainChange(t.target.value)}
                @keydown=${e.onEnterKey}
              />
              <button class="action-button primary" @click=${e.onAddStrain}>
                <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                  <path d="${vt}"></path>
                </svg>
                Add
              </button>
            </div>
          </div>

          ${t.strains.length>0?j`
            <div class="strain-list">
              ${t.strains.map(t=>j`
                <div class="strain-item">
                  <span class="strain-name">${t}</span>
                  <button 
                    class="remove-button"
                    title="Remove ${t}"
                    @click=${()=>e.onRemoveStrain(t)}
                  >
                    <svg class="remove-icon" viewBox="0 0 24 24">
                      <path d="${"M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"}"></path>
                    </svg>
                  </button>
                </div>
              `)}
            </div>
          `:j`
            <div class="no-data">
              No strains in library. Add some strains to get started!
            </div>
          `}
        </div>

        <button class="action-button danger" slot="secondaryAction" @click=${e.onClearAll}>
          Clear All
        </button>
        <button class="action-button" slot="primaryAction" @click=${e.onClose}>
          Done
        </button>
      </ha-dialog>
    `:j``}static renderTextInput(t,e,r){return j`
      <div class="form-group">
        <label>${t}</label>
        <input 
          type="text" 
          class="form-input"
          .value=${e} 
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderNumberInput(t,e,r){return j`
      <div class="form-group">
        <label>${t}</label>
        <input 
          type="number" 
          class="form-input"
          min="1"
          value=${e} 
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderDateTimeInput(t,e,r,n){return j`
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
    `}static renderPlantStats(t){return t.attributes?.veg_days||t.attributes?.flower_days||t.attributes?.dry_days||t.attributes?.cure_days?j`
      <div style="background: rgba(var(--rgb-info-color, 33, 150, 243), 0.05); padding: var(--spacing-md); border-radius: var(--border-radius); border-left: 4px solid var(--info-color, #2196F3);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span><strong>Current Stage:</strong> ${t.state}</span>
          <div style="display: flex; gap: var(--spacing-md);">
            ${t.attributes?.veg_days?j`<span>${t.attributes.veg_days} days veg</span>`:""}
            ${t.attributes?.flower_days?j`<span>${t.attributes.flower_days} days flower</span>`:""}
            ${t.attributes?.dry_days?j`<span>${t.attributes.dry_days} days drying</span>`:""}
            ${t.attributes?.cure_days?j`<span>${t.attributes.cure_days} days curing</span>`:""}
          </div>
        </div>
      </div>
    `:j``}}let Hi=class extends ot{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._strainLibraryDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1}firstUpdated(){this.dataService=new Zi(this.hass),this.initializeSelectedDevice()}initializeSelectedDevice(){const t=this.dataService.getGrowspaceDevices();if(t.length&&!this.selectedDevice){if(this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);if(e)return void(this.selectedDevice=e.device_id)}this.selectedDevice=t[0].device_id}}static getConfigElement(){return document.createElement("growspace-manager-card-editor")}static getStubConfig(){return{type:"custom:growspace-manager-card",title:"Growspace Manager",compact:!1}}setConfig(t){if(!t)throw new Error("Invalid configuration");this._config=t}getCardSize(){return 4}_handleDeviceChange(t){const e=t.target;this.selectedDevice=e.value}_handlePlantClick(t){this._plantOverviewDialog={open:!0,plant:t,editedAttributes:{...t.attributes}}}getHaDateTimeString(){const t=this.hass.config.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone;return Li.now().setZone(t).toFormat("yyyy-LL-dd'T'HH:mm")}_openAddPlantDialog(t,e){const r=this.getHaDateTimeString(),n=this.dataService.getStrainLibrary();this._addPlantDialog={open:!0,row:t,col:e,strain:n[0]||"",phenotype:"",veg_start:r,flower_start:r,dry_start:r,cure_start:r}}async _confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const{row:t,col:e,strain:r,phenotype:n,veg_start:i,flower_start:s,dry_start:a,cure_start:o}=this._addPlantDialog;try{await this.dataService.addPlant({growspace_id:this.selectedDevice,row:t+1,col:e+1,strain:r,phenotype:n,veg_start:i||Fi.getCurrentDateTime(),flower_start:s||Fi.getCurrentDateTime(),dry_start:a||Fi.getCurrentDateTime(),cure_start:o||Fi.getCurrentDateTime()}),this._addPlantDialog=null}catch(t){console.error("Error adding plant:",t)}}async _updatePlant(){if(!this._plantOverviewDialog)return;const{plant:t,editedAttributes:e}=this._plantOverviewDialog,r={plant_id:t.attributes?.plant_id||t.entity_id.replace("sensor.","")};["strain","phenotype","row","col","veg_start","flower_start","dry_start","cure_start"].forEach(t=>{void 0!==e[t]&&null!==e[t]&&(r[t]=e[t])});try{await this.dataService.updatePlant(r),this._plantOverviewDialog=null}catch(t){console.error("Error updating plant:",t)}}async _handleDeletePlant(t){if(confirm("Are you sure you want to delete this plant?"))try{await this.dataService.removePlant(t),this._plantOverviewDialog=null}catch(t){console.error("Error deleting plant:",t)}}async _harvestPlant(t){const e=t.attributes?.plant_id;if(!e)return void console.error("Plant UUID not found:",t);const r=t.state;if(!r||"flower"!==r&&"dry"!==r)alert("Plant must be in flower or dry stage to harvest.");else try{await this.hass.callService("growspace_manager","harvest_plant",{plant_id:e,target_growspace_name:"dry"}),this._plantOverviewDialog=null}catch(t){console.error("Error harvesting plant:",t)}}async _finishDryingPlant(t){if(!this._plantOverviewDialog)return;const e=t,r=e.state;if(!r||"dry"!==r&&"cure"!==r)alert("Plant must be in dry or cure stage to finish drying.");else try{await this.dataService.harvestPlant(e.entity_id,"cure"),this._plantOverviewDialog=null}catch(t){console.error("Error harvesting plant:",t)}}_openStrainLibraryDialog(){const t=this.dataService.getStrainLibrary();this._strainLibraryDialog={open:!0,newStrain:"",strains:t}}async _addStrain(){this._strainLibraryDialog?.newStrain&&(this._strainLibraryDialog.strains.push(this._strainLibraryDialog.newStrain),await this.dataService.importStrainLibrary(this._strainLibraryDialog.strains,!0),this._strainLibraryDialog.newStrain="")}async _removeStrain(t){this._strainLibraryDialog&&(this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e!==t),await this.dataService.importStrainLibrary(this._strainLibraryDialog.strains,!0))}async _clearStrains(){await this.dataService.clearStrainLibrary()}_handleDragStart(t,e){this._draggedPlant=e,t.dataTransfer?.setData("text/plain",JSON.stringify({id:e.entity_id}));t.target.classList.add("dragging")}_handleDragEnd(t){t.target.classList.remove("dragging")}_handleDragOver(t){t.preventDefault()}_handleDrop(t,e,r,n){if(t.preventDefault(),!this._draggedPlant)return;const i=this._draggedPlant;this._draggedPlant=null,n?(this._movePlant(i,e,r),this._movePlant(n,i.attributes.row,i.attributes.col)):this._movePlant(i,e,r)}async _movePlant(t,e,r){try{const n=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.dataService.updatePlant({plant_id:n,row:e,col:r})}catch(t){console.error("Error moving plant:",t)}}render(){if(!this.hass)return j`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;this.dataService=new Zi(this.hass);const t=this.dataService.getGrowspaceDevices();if(!t.length)return j`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;if(!this._defaultApplied&&this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);e&&(this.selectedDevice=e.device_id),this._defaultApplied=!0}this.selectedDevice&&t.find(t=>t.device_id===this.selectedDevice)||(this.selectedDevice=t[0].device_id);const e=t.find(t=>t.device_id===this.selectedDevice);if(!e)return j`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;if(0===e.plants.length)return j`
        <ha-card>
          <div class="no-data" style="text-align:center; padding: 1.5rem;">
            Growspace <strong>${e.name}</strong> is currently empty.
          </div>
        </ha-card>
      `;const r=Fi.calculateEffectiveRows(e),{grid:n}=Fi.createGridLayout(e.plants,r,e.plants_per_row),i=e.plants_per_row>6;return j`
      <ha-card class=${i?"wide-growspace":""}>
        ${this.renderHeader(t)}
        ${this.renderGrid(n,r,e.plants_per_row)}
      </ha-card>
      
      ${this.renderDialogs()}
    `}renderHeader(t){const e=t.find(t=>t.device_id===this.selectedDevice);return j`
      <div class="header">
        ${this._config?.title?j`<h2 class="header-title">${this._config.title}</h2>`:""}
        
        <div class="selector-container">
          ${this._config?.default_growspace?j`<span class="selected-growspace">${e?.name}</span>`:j`
            <label for="device-select">Growspace:</label>
            <select 
              id="device-select" 
              class="growspace-select"
              .value=${this.selectedDevice||""} 
              @change=${this._handleDeviceChange}
            >
              ${t.map(t=>j`<option value="${t.device_id}">${t.name}</option>`)}
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
              <path d="${pt}"></path>
            </svg>
            Strains
          </button>
        </div>
      </div>
    `}renderGrid(t,e,r){return j`
      <div class="grid ${this._isCompactView?"compact":""}" 
           style="grid-template-columns: repeat(${r}, 1fr); grid-template-rows: repeat(${e}, 1fr);">
        ${t.flat().map((t,e)=>{const n=Math.floor(e/r)+1,i=e%r+1;return t?this.renderPlantSlot(t,n,i):this.renderEmptySlot(n,i)})}
      </div>
    `}renderEmptySlot(t,e){return j`
      <div 
        class="plant empty" 
        style="grid-row: ${t}; grid-column: ${e}" 
        @click=${()=>this._openAddPlantDialog(t-1,e-1)}
        @dragover=${this._handleDragOver}
        @drop=${r=>this._handleDrop(r,t,e,null)}
      >
        <div class="plant-header">
          <svg class="plant-icon" viewBox="0 0 24 24">
            <path d="${vt}"></path>
          </svg>
        </div>
        <div class="plant-name">Add Plant</div>
        <div class="plant-stage">Empty Slot</div>
      </div>
    `}renderPlantSlot(t,e,r){const n=Fi.getPlantStageColor(t.state),i=Fi.getPlantStageIcon(t.state);return j`
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
            <path d="${i}"></path>
          </svg>
        </div>
        <div class="plant-name">${t.attributes?.strain||"Unknown"}</div>
        ${t.attributes?.phenotype?j`<div class="plant-phenotype">${t.attributes.phenotype}</div>`:""}
        <div class="plant-stage">${t.state}</div>
        
        ${this._isCompactView?"":this.renderPlantDays(t)}
      </div>
    `}renderPlantDays(t){const e=[{days:t.attributes?.veg_days,icon:wt,title:"Days in Vegetative"},{days:t.attributes?.flower_days,icon:gt,title:"Days in Flower"},{days:t.attributes?.dry_days,icon:yt,title:"Days in Dry"},{days:t.attributes?.cure_days,icon:ft,title:"Days in Cure"}].filter(t=>t.days);return e.length?j`
      <div class="plant-days">
        ${e.map(({days:t,icon:e,title:r})=>j`
          <span title="${r}">
            <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${e}"></path>
            </svg>
            ${t}d
          </span>
        `)}
      </div>
    `:j``}renderDialogs(){const t=this.dataService?.getStrainLibrary()||[];return j`
      ${zi.renderAddPlantDialog(this._addPlantDialog,t,{onClose:()=>this._addPlantDialog=null,onConfirm:()=>this._confirmAddPlant(),onStrainChange:t=>{this._addPlantDialog&&(this._addPlantDialog.strain=t)},onPhenotypeChange:t=>{this._addPlantDialog&&(this._addPlantDialog.phenotype=t)},onVegStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.veg_start=t)},onFlowerStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.flower_start=t)},onDryStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.dry_start=t)},onCureStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.cure_start=t)}})}

      ${zi.renderPlantOverviewDialog(this._plantOverviewDialog,{onClose:()=>this._plantOverviewDialog=null,onUpdate:()=>this._updatePlant(),onDelete:t=>this._handleDeletePlant(t),onHarvest:t=>this._harvestPlant(t),onFinishDrying:t=>this._finishDryingPlant(t),onAttributeChange:(t,e)=>{this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes[t]=e)}})}

      ${zi.renderStrainLibraryDialog(this._strainLibraryDialog,{onClose:()=>this._strainLibraryDialog=null,onAddStrain:()=>this._addStrain(),onRemoveStrain:t=>this._removeStrain(t),onClearAll:()=>this._clearStrains(),onNewStrainChange:t=>{this._strainLibraryDialog&&(this._strainLibraryDialog.newStrain=t)},onEnterKey:t=>{"Enter"===t.key&&this._addStrain()}})}
    `}static get styles(){return o`
      :host { 
        display: block;
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
      }

      ha-card { 
        padding: var(--spacing-lg); 
        border-radius: var(--border-radius);
        backdrop-filter: blur(10px);
        box-shadow: var(--surface-elevation);
        transition: var(--transition);
      }

      ha-card:hover {
        box-shadow: var(--surface-elevation-hover);
      }

      ha-card.wide-growspace .plant-name,
      ha-card.wide-growspace .plant-stage,
      ha-card.wide-growspace .plant-phenotype {
        font-size: 0.9rem; 
      }

      /* Header Styles */
      .header { 
        display: flex; 
        align-items: center; 
        justify-content: space-between; 
        margin-bottom: var(--spacing-lg);
        flex-wrap: wrap; 
        gap: var(--spacing-md);
        padding: var(--spacing-sm) 0;
        border-bottom: 2px solid var(--divider-color);
      }

      .header-title {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--primary-text-color);
        margin: 0;
      }

      .selector-container { 
        display: flex; 
        align-items: center; 
        gap: var(--spacing-sm);
        flex: 1;
      }
      
      div.no-data strong,
      .selected-growspace {
        text-transform: capitalize;
      }
      
      .growspace-select {
        padding: var(--spacing-sm) var(--spacing-md);
        border: 2px solid var(--divider-color);
        border-radius: var(--border-radius);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        font-family: inherit;
        font-size: 0.9rem;
        cursor: pointer;
        min-width: 180px;
        transition: var(--transition);
      }

      .growspace-select:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color), 0.1);
      }

      /* Button Styles */
      .action-button {
        padding: var(--spacing-sm) var(--spacing-md);
        border: none;
        border-radius: var(--border-radius);
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: var(--transition);
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs);
        text-decoration: none;
        background: var(--secondary-gradient);
        color: white;
        box-shadow: var(--surface-elevation);
      }

      .action-button:hover {
        transform: translateY(-2px);
        box-shadow: var(--surface-elevation-hover);
      }

      .action-button.primary {
        background: var(--primary-gradient);
      }

      .action-button.danger {
        background: var(--danger-gradient);
      }

      .view-toggle {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-size: 0.85rem;
        color: var(--secondary-text-color);
      }

      /* Grid Styles */
      .grid { 
        display: grid; 
        gap: var(--spacing-md); 
        margin-top: var(--spacing-lg);
        padding: var(--spacing-sm);
      }

      .grid.compact {
        gap: var(--spacing-sm);
      }

      /* Plant Card Styles */
      .plant { 
        border: 2px solid transparent;
        border-radius: var(--border-radius);
        text-align: center;
        padding: var(--spacing-md);
        background: var(--card-background-color);
        box-shadow: var(--surface-elevation);
        transition: var(--transition);
        min-height: 100px;
        display: flex;
        flex-direction: column;
        justify-content: center;
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
        background: var(--secondary-gradient);
        transition: var(--transition);
      }

      .plant:hover { 
        transform: translateY(-4px);
        box-shadow: var(--surface-elevation-hover);
        border-color: var(--secondary-gradient);
      }

      .plant.empty { 
        background: linear-gradient(135deg, rgba(var(--rgb-disabled-text-color, 158, 158, 158), 0.1), rgba(var(--rgb-disabled-text-color, 158, 158, 158), 0.05));
        border: 2px dashed var(--divider-color);
        opacity: 0.7;
      }

      .plant.empty:hover {
        opacity: 1;
        background: linear-gradient(135deg, rgba(var(--rgb-primary-color), 0.1), rgba(var(--rgb-primary-color), 0.05));
        border-color: var(--primary-color);
      }

      .plant.dragging {
        opacity: 0.5;
        transform: rotate(5deg);
      }
      
      .grid.compact .plant-header {
        margin-top: inherit;
      }
      
      .plant-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-xs);
        margin-bottom: var(--spacing-xs);
        margin-top: auto;
      }
      
      .plant.empty .plant-header {
        margin-top: inherit;
      }

      .plant-icon {
        width: 2rem;
        height: 2rem;
        fill: var(--stage-color, #757575);
      }

      .plant-name { 
        font-weight: 600;
        color: var(--primary-text-color);
        font-size: 2rem;
        margin-bottom: var(--spacing-xs);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .plant-stage { 
        color: var(--stage-color, #757575);
        font-size: 2rem;
        font-weight: 500;
        margin-bottom: var(--spacing-xs);
        text-transform: capitalize;
      }

      .plant-phenotype {
        color: var(--secondary-text-color);
        font-size: 1.2rem;
        margin-bottom: var(--spacing-xs);
        font-style: italic;
      }

      .plant-days {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 1.2rem;
        color: var(--secondary-text-color);
        margin-top: auto;
      }
      
      .plant.empty .plant-days {
        margin: auto;
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
        font-size: 0.85rem;
      }

      .compact .plant-days {
        font-size: 0.65rem;
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

      /* Strain Library Styles */
      .strain-library-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-md);
      }

      .strain-input-group {
        display: flex;
        gap: var(--spacing-sm);
        align-items: center;
      }

      .strain-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        max-height: 500px;
        overflow-y: auto;
        margin-top: var(--spacing-md);
        padding-right: var(--spacing-md)
      }

      .strain-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-sm) var(--spacing-md);
        background: rgba(var(--rgb-primary-color), 0.05);
        border: 1px solid rgba(var(--rgb-primary-color), 0.1);
        border-radius: var(--border-radius);
        transition: var(--transition);
      }

      .strain-item:hover {
        background: rgba(var(--rgb-primary-color), 0.1);
      }

      .strain-name {
        font-weight: 500;
        flex: 1;
      }

      .remove-button {
        background: none;
        border: none;
        padding: var(--spacing-xs);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--error-color);
        border-radius: 50%;
        transition: var(--transition);
      }

      .remove-button:hover {
        background: rgba(var(--rgb-error-color), 0.1);
        transform: scale(1.1);
      }

      .remove-icon {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }

      /* Utility Classes */
      .no-data { 
        text-align: center;
        color: var(--secondary-text-color);
        padding: var(--spacing-lg);
        font-style: italic;
        background: rgba(var(--rgb-secondary-text-color), 0.05);
        border-radius: var(--border-radius);
        margin: var(--spacing-md) 0;
      }

      .error { 
        color: var(--error-color);
        padding: var(--spacing-md);
        background: rgba(var(--rgb-error-color), 0.1);
        border: 1px solid rgba(var(--rgb-error-color), 0.2);
        border-radius: var(--border-radius);
        margin: var(--spacing-md) 0;
      }

      /* Responsive Design */
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
      }

      /* Animation keyframes */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .plant {
        animation: fadeIn 0.3s ease-out;
      }
    `}};t([mt(),e("design:type",Object)],Hi.prototype,"_addPlantDialog",void 0),t([mt(),e("design:type",Object)],Hi.prototype,"_defaultApplied",void 0),t([mt(),e("design:type",Object)],Hi.prototype,"_plantOverviewDialog",void 0),t([mt(),e("design:type",Object)],Hi.prototype,"_strainLibraryDialog",void 0),t([mt(),e("design:type",Object)],Hi.prototype,"selectedDevice",void 0),t([mt(),e("design:type",Object)],Hi.prototype,"_draggedPlant",void 0),t([mt(),e("design:type",Boolean)],Hi.prototype,"_isCompactView",void 0),t([ht({attribute:!1}),e("design:type",Object)],Hi.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],Hi.prototype,"_config",void 0),Hi=t([ct("growspace-manager-card")],Hi);let Wi=class extends ot{setConfig(t){this._config={...t}}_valueChanged(t){const e=t.target;if(!this._config||!e)return;const r="checkbox"===e.type?e.checked:e.value;this._config[e.name]!==r&&(this._config={...this._config,[e.name]:r},this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config}})))}render(){return this._config?j`
      <ha-formfield label="Compact mode">
        <ha-switch
          .checked=${this._config.compact??!1}
          .name=${"compact"}
          @change=${this._valueChanged}
        ></ha-switch>
      </ha-formfield>
    `:j``}};Wi.styles=o`
    ha-formfield {
      display: block;
      margin: 8px 0;
    }
  `,t([ht({attribute:!1}),e("design:type",Object)],Wi.prototype,"hass",void 0),t([mt(),e("design:type",Object)],Wi.prototype,"_config",void 0),Wi=t([ct("growspace-manager-card-editor")],Wi);export{Hi as GrowspaceManagerCard,Wi as GrowspaceManagerCardEditor};
//# sourceMappingURL=growspace-manager-card.js.map
