function t(t,e,r,i){var s,n=arguments.length,a=n<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(t,e,r,i);else for(var o=t.length-1;o>=0;o--)(s=t[o])&&(a=(n<3?s(a):n>3?s(e,r,a):s(e,r))||a);return n>3&&a&&Object.defineProperty(e,r,a),a}function e(t,e){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(t,e)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const r=globalThis,i=r.ShadowRoot&&(void 0===r.ShadyCSS||r.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),n=new WeakMap;class a{constructor(t,e,r){if(this._$cssResult$=!0,r!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const r=void 0!==e&&1===e.length;r&&(t=n.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),r&&n.set(e,t))}return t}toString(){return this.cssText}}const o=(t,...e)=>{const r=1===t.length?t[0]:e.reduce((e,r,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+t[i+1],t[0]);return new a(r,t,s)},l=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const r of t.cssRules)e+=r.cssText;return(t=>new a("string"==typeof t?t:t+"",void 0,s))(e)})(t):t,{is:c,defineProperty:u,getOwnPropertyDescriptor:d,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:m}=Object,g=globalThis,f=g.trustedTypes,y=f?f.emptyScript:"",v=g.reactiveElementPolyfillSupport,w=(t,e)=>t,b={toAttribute(t,e){switch(e){case Boolean:t=t?y:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let r=t;switch(e){case Boolean:r=null!==t;break;case Number:r=null===t?null:Number(t);break;case Object:case Array:try{r=JSON.parse(t)}catch(t){r=null}}return r}},_=(t,e)=>!c(t,e),S={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:_};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;class $ extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=S){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const r=Symbol(),i=this.getPropertyDescriptor(t,r,e);void 0!==i&&u(this.prototype,t,i)}}static getPropertyDescriptor(t,e,r){const{get:i,set:s}=d(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const n=i?.call(this);s?.call(this,e),this.requestUpdate(t,n,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??S}static _$Ei(){if(this.hasOwnProperty(w("elementProperties")))return;const t=m(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(w("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(w("properties"))){const t=this.properties,e=[...h(t),...p(t)];for(const r of e)this.createProperty(r,t[r])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,r]of e)this.elementProperties.set(t,r)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const r=this._$Eu(t,e);void 0!==r&&this._$Eh.set(r,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const r=new Set(t.flat(1/0).reverse());for(const t of r)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const r=e.attribute;return!1===r?void 0:"string"==typeof r?r:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const r of e.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(i)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of e){const e=document.createElement("style"),s=r.litNonce;void 0!==s&&e.setAttribute("nonce",s),e.textContent=i.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,r){this._$AK(t,r)}_$ET(t,e){const r=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,r);if(void 0!==i&&!0===r.reflect){const s=(void 0!==r.converter?.toAttribute?r.converter:b).toAttribute(e,r.type);this._$Em=t,null==s?this.removeAttribute(i):this.setAttribute(i,s),this._$Em=null}}_$AK(t,e){const r=this.constructor,i=r._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=r.getPropertyOptions(i),s="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:b;this._$Em=i;const n=s.fromAttribute(e,t.type);this[i]=n??this._$Ej?.get(i)??n,this._$Em=null}}requestUpdate(t,e,r){if(void 0!==t){const i=this.constructor,s=this[t];if(r??=i.getPropertyOptions(t),!((r.hasChanged??_)(s,e)||r.useDefault&&r.reflect&&s===this._$Ej?.get(t)&&!this.hasAttribute(i._$Eu(t,r))))return;this.C(t,e,r)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:r,reflect:i,wrapped:s},n){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==s||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||r||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,r]of t){const{wrapped:t}=r,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,r,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[w("elementProperties")]=new Map,$[w("finalized")]=new Map,v?.({ReactiveElement:$}),(g.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const x=globalThis,D=x.trustedTypes,C=D?D.createPolicy("lit-html",{createHTML:t=>t}):void 0,k="$lit$",T=`lit$${Math.random().toFixed(9).slice(2)}$`,O="?"+T,E=`<${O}>`,M=document,A=()=>M.createComment(""),N=t=>null===t||"object"!=typeof t&&"function"!=typeof t,L=Array.isArray,I="[ \t\n\f\r]",V=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,P=/-->/g,F=/>/g,H=RegExp(`>|${I}(?:([^\\s"'>=/]+)(${I}*=${I}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),z=/'/g,U=/"/g,Z=/^(?:script|style|textarea|title)$/i,j=(t=>(e,...r)=>({_$litType$:t,strings:e,values:r}))(1),R=Symbol.for("lit-noChange"),W=Symbol.for("lit-nothing"),q=new WeakMap,B=M.createTreeWalker(M,129);function Y(t,e){if(!L(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(e):e}const G=(t,e)=>{const r=t.length-1,i=[];let s,n=2===e?"<svg>":3===e?"<math>":"",a=V;for(let e=0;e<r;e++){const r=t[e];let o,l,c=-1,u=0;for(;u<r.length&&(a.lastIndex=u,l=a.exec(r),null!==l);)u=a.lastIndex,a===V?"!--"===l[1]?a=P:void 0!==l[1]?a=F:void 0!==l[2]?(Z.test(l[2])&&(s=RegExp("</"+l[2],"g")),a=H):void 0!==l[3]&&(a=H):a===H?">"===l[0]?(a=s??V,c=-1):void 0===l[1]?c=-2:(c=a.lastIndex-l[2].length,o=l[1],a=void 0===l[3]?H:'"'===l[3]?U:z):a===U||a===z?a=H:a===P||a===F?a=V:(a=H,s=void 0);const d=a===H&&t[e+1].startsWith("/>")?" ":"";n+=a===V?r+E:c>=0?(i.push(o),r.slice(0,c)+k+r.slice(c)+T+d):r+T+(-2===c?e:d)}return[Y(t,n+(t[r]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class J{constructor({strings:t,_$litType$:e},r){let i;this.parts=[];let s=0,n=0;const a=t.length-1,o=this.parts,[l,c]=G(t,e);if(this.el=J.createElement(l,r),B.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=B.nextNode())&&o.length<a;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(k)){const e=c[n++],r=i.getAttribute(t).split(T),a=/([.?@])?(.*)/.exec(e);o.push({type:1,index:s,name:a[2],strings:r,ctor:"."===a[1]?et:"?"===a[1]?rt:"@"===a[1]?it:tt}),i.removeAttribute(t)}else t.startsWith(T)&&(o.push({type:6,index:s}),i.removeAttribute(t));if(Z.test(i.tagName)){const t=i.textContent.split(T),e=t.length-1;if(e>0){i.textContent=D?D.emptyScript:"";for(let r=0;r<e;r++)i.append(t[r],A()),B.nextNode(),o.push({type:2,index:++s});i.append(t[e],A())}}}else if(8===i.nodeType)if(i.data===O)o.push({type:2,index:s});else{let t=-1;for(;-1!==(t=i.data.indexOf(T,t+1));)o.push({type:7,index:s}),t+=T.length-1}s++}}static createElement(t,e){const r=M.createElement("template");return r.innerHTML=t,r}}function Q(t,e,r=t,i){if(e===R)return e;let s=void 0!==i?r._$Co?.[i]:r._$Cl;const n=N(e)?void 0:e._$litDirective$;return s?.constructor!==n&&(s?._$AO?.(!1),void 0===n?s=void 0:(s=new n(t),s._$AT(t,r,i)),void 0!==i?(r._$Co??=[])[i]=s:r._$Cl=s),void 0!==s&&(e=Q(t,s._$AS(t,e.values),s,i)),e}class K{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:r}=this._$AD,i=(t?.creationScope??M).importNode(e,!0);B.currentNode=i;let s=B.nextNode(),n=0,a=0,o=r[0];for(;void 0!==o;){if(n===o.index){let e;2===o.type?e=new X(s,s.nextSibling,this,t):1===o.type?e=new o.ctor(s,o.name,o.strings,this,t):6===o.type&&(e=new st(s,this,t)),this._$AV.push(e),o=r[++a]}n!==o?.index&&(s=B.nextNode(),n++)}return B.currentNode=M,i}p(t){let e=0;for(const r of this._$AV)void 0!==r&&(void 0!==r.strings?(r._$AI(t,r,e),e+=r.strings.length-2):r._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,r,i){this.type=2,this._$AH=W,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=r,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),N(t)?t===W||null==t||""===t?(this._$AH!==W&&this._$AR(),this._$AH=W):t!==this._$AH&&t!==R&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>L(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==W&&N(this._$AH)?this._$AA.nextSibling.data=t:this.T(M.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:r}=t,i="number"==typeof r?this._$AC(t):(void 0===r.el&&(r.el=J.createElement(Y(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new K(i,this),r=t.u(this.options);t.p(e),this.T(r),this._$AH=t}}_$AC(t){let e=q.get(t.strings);return void 0===e&&q.set(t.strings,e=new J(t)),e}k(t){L(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let r,i=0;for(const s of t)i===e.length?e.push(r=new X(this.O(A()),this.O(A()),this,this.options)):r=e[i],r._$AI(s),i++;i<e.length&&(this._$AR(r&&r._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,r,i,s){this.type=1,this._$AH=W,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=s,r.length>2||""!==r[0]||""!==r[1]?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=W}_$AI(t,e=this,r,i){const s=this.strings;let n=!1;if(void 0===s)t=Q(this,t,e,0),n=!N(t)||t!==this._$AH&&t!==R,n&&(this._$AH=t);else{const i=t;let a,o;for(t=s[0],a=0;a<s.length-1;a++)o=Q(this,i[r+a],e,a),o===R&&(o=this._$AH[a]),n||=!N(o)||o!==this._$AH[a],o===W?t=W:t!==W&&(t+=(o??"")+s[a+1]),this._$AH[a]=o}n&&!i&&this.j(t)}j(t){t===W?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===W?void 0:t}}class rt extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==W)}}class it extends tt{constructor(t,e,r,i,s){super(t,e,r,i,s),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??W)===R)return;const r=this._$AH,i=t===W&&r!==W||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,s=t!==W&&(r===W||i);i&&this.element.removeEventListener(this.name,this,r),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class st{constructor(t,e,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const nt=x.litHtmlPolyfillSupport;nt?.(J,X),(x.litHtmlVersions??=[]).push("3.3.1");const at=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,r)=>{const i=r?.renderBefore??e;let s=i._$litPart$;if(void 0===s){const t=r?.renderBefore??null;i._$litPart$=s=new X(e.insertBefore(A(),t),t,void 0,r??{})}return s._$AI(t),s})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return R}}ot._$litElement$=!0,ot.finalized=!0,at.litElementHydrateSupport?.({LitElement:ot});const lt=at.litElementPolyfillSupport;lt?.({LitElement:ot}),(at.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ct=t=>(e,r)=>{void 0!==r?r.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},ut={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:_},dt=(t=ut,e,r)=>{const{kind:i,metadata:s}=r;let n=globalThis.litPropertyMetadata.get(s);if(void 0===n&&globalThis.litPropertyMetadata.set(s,n=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),n.set(r.name,t),"accessor"===i){const{name:i}=r;return{set(r){const s=e.get.call(this);e.set.call(this,r),this.requestUpdate(i,s,t)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=r;return function(r){const s=this[i];e.call(this,r),this.requestUpdate(i,s,t)}}throw Error("Unsupported decorator location: "+i)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ht(t){return(e,r)=>"object"==typeof r?dt(t,e,r):((t,e,r)=>{const i=e.hasOwnProperty(r);return e.constructor.createProperty(r,t),i?Object.getOwnPropertyDescriptor(e,r):void 0})(t,e,r)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pt(t){return ht({...t,state:!0,attribute:!1})}var mt="M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z",gt="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",ft="M11 20H6.5Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20H13V12.85L14.6 14.4L16 13L12 9L8 13L9.4 14.4L11 12.85Z",yt="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",vt="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z",wt="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",bt="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z",_t="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z";class St extends Error{}class $t extends St{constructor(t){super(`Invalid DateTime: ${t.toMessage()}`)}}class xt extends St{constructor(t){super(`Invalid Interval: ${t.toMessage()}`)}}class Dt extends St{constructor(t){super(`Invalid Duration: ${t.toMessage()}`)}}class Ct extends St{}class kt extends St{constructor(t){super(`Invalid unit ${t}`)}}class Tt extends St{}class Ot extends St{constructor(){super("Zone is an abstract class")}}const Et="numeric",Mt="short",At="long",Nt={year:Et,month:Et,day:Et},Lt={year:Et,month:Mt,day:Et},It={year:Et,month:Mt,day:Et,weekday:Mt},Vt={year:Et,month:At,day:Et},Pt={year:Et,month:At,day:Et,weekday:At},Ft={hour:Et,minute:Et},Ht={hour:Et,minute:Et,second:Et},zt={hour:Et,minute:Et,second:Et,timeZoneName:Mt},Ut={hour:Et,minute:Et,second:Et,timeZoneName:At},Zt={hour:Et,minute:Et,hourCycle:"h23"},jt={hour:Et,minute:Et,second:Et,hourCycle:"h23"},Rt={hour:Et,minute:Et,second:Et,hourCycle:"h23",timeZoneName:Mt},Wt={hour:Et,minute:Et,second:Et,hourCycle:"h23",timeZoneName:At},qt={year:Et,month:Et,day:Et,hour:Et,minute:Et},Bt={year:Et,month:Et,day:Et,hour:Et,minute:Et,second:Et},Yt={year:Et,month:Mt,day:Et,hour:Et,minute:Et},Gt={year:Et,month:Mt,day:Et,hour:Et,minute:Et,second:Et},Jt={year:Et,month:Mt,day:Et,weekday:Mt,hour:Et,minute:Et},Qt={year:Et,month:At,day:Et,hour:Et,minute:Et,timeZoneName:Mt},Kt={year:Et,month:At,day:Et,hour:Et,minute:Et,second:Et,timeZoneName:Mt},Xt={year:Et,month:At,day:Et,weekday:At,hour:Et,minute:Et,timeZoneName:At},te={year:Et,month:At,day:Et,weekday:At,hour:Et,minute:Et,second:Et,timeZoneName:At};class ee{get type(){throw new Ot}get name(){throw new Ot}get ianaName(){return this.name}get isUniversal(){throw new Ot}offsetName(t,e){throw new Ot}formatOffset(t,e){throw new Ot}offset(t){throw new Ot}equals(t){throw new Ot}get isValid(){throw new Ot}}let re=null;class ie extends ee{static get instance(){return null===re&&(re=new ie),re}get type(){return"system"}get name(){return(new Intl.DateTimeFormat).resolvedOptions().timeZone}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return $r(t,e,r)}formatOffset(t,e){return kr(this.offset(t),e)}offset(t){return-new Date(t).getTimezoneOffset()}equals(t){return"system"===t.type}get isValid(){return!0}}const se=new Map;const ne={year:0,month:1,day:2,era:3,hour:4,minute:5,second:6};const ae=new Map;class oe extends ee{static create(t){let e=ae.get(t);return void 0===e&&ae.set(t,e=new oe(t)),e}static resetCache(){ae.clear(),se.clear()}static isValidSpecifier(t){return this.isValidZone(t)}static isValidZone(t){if(!t)return!1;try{return new Intl.DateTimeFormat("en-US",{timeZone:t}).format(),!0}catch(t){return!1}}constructor(t){super(),this.zoneName=t,this.valid=oe.isValidZone(t)}get type(){return"iana"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return $r(t,e,r,this.name)}formatOffset(t,e){return kr(this.offset(t),e)}offset(t){if(!this.valid)return NaN;const e=new Date(t);if(isNaN(e))return NaN;const r=function(t){let e=se.get(t);return void 0===e&&(e=new Intl.DateTimeFormat("en-US",{hour12:!1,timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",era:"short"}),se.set(t,e)),e}(this.name);let[i,s,n,a,o,l,c]=r.formatToParts?function(t,e){const r=t.formatToParts(e),i=[];for(let t=0;t<r.length;t++){const{type:e,value:s}=r[t],n=ne[e];"era"===e?i[n]=s:rr(n)||(i[n]=parseInt(s,10))}return i}(r,e):function(t,e){const r=t.format(e).replace(/\u200E/g,""),i=/(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(r),[,s,n,a,o,l,c,u]=i;return[a,s,n,o,l,c,u]}(r,e);"BC"===a&&(i=1-Math.abs(i));let u=+e;const d=u%1e3;return u-=d>=0?d:1e3+d,(wr({year:i,month:s,day:n,hour:24===o?0:o,minute:l,second:c,millisecond:0})-u)/6e4}equals(t){return"iana"===t.type&&t.name===this.name}get isValid(){return this.valid}}let le={};const ce=new Map;function ue(t,e={}){const r=JSON.stringify([t,e]);let i=ce.get(r);return void 0===i&&(i=new Intl.DateTimeFormat(t,e),ce.set(r,i)),i}const de=new Map;const he=new Map;let pe=null;const me=new Map;function ge(t){let e=me.get(t);return void 0===e&&(e=new Intl.DateTimeFormat(t).resolvedOptions(),me.set(t,e)),e}const fe=new Map;function ye(t,e,r,i){const s=t.listingMode();return"error"===s?null:"en"===s?r(e):i(e)}class ve{constructor(t,e,r){this.padTo=r.padTo||0,this.floor=r.floor||!1;const{padTo:i,floor:s,...n}=r;if(!e||Object.keys(n).length>0){const e={useGrouping:!1,...r};r.padTo>0&&(e.minimumIntegerDigits=r.padTo),this.inf=function(t,e={}){const r=JSON.stringify([t,e]);let i=de.get(r);return void 0===i&&(i=new Intl.NumberFormat(t,e),de.set(r,i)),i}(t,e)}}format(t){if(this.inf){const e=this.floor?Math.floor(t):t;return this.inf.format(e)}return dr(this.floor?Math.floor(t):gr(t,3),this.padTo)}}class we{constructor(t,e,r){let i;if(this.opts=r,this.originalZone=void 0,this.opts.timeZone)this.dt=t;else if("fixed"===t.zone.type){const e=t.offset/60*-1,r=e>=0?`Etc/GMT+${e}`:`Etc/GMT${e}`;0!==t.offset&&oe.create(r).valid?(i=r,this.dt=t):(i="UTC",this.dt=0===t.offset?t:t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone)}else"system"===t.zone.type?this.dt=t:"iana"===t.zone.type?(this.dt=t,i=t.zone.name):(i="UTC",this.dt=t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone);const s={...this.opts};s.timeZone=s.timeZone||i,this.dtf=ue(e,s)}format(){return this.originalZone?this.formatToParts().map(({value:t})=>t).join(""):this.dtf.format(this.dt.toJSDate())}formatToParts(){const t=this.dtf.formatToParts(this.dt.toJSDate());return this.originalZone?t.map(t=>{if("timeZoneName"===t.type){const e=this.originalZone.offsetName(this.dt.ts,{locale:this.dt.locale,format:this.opts.timeZoneName});return{...t,value:e}}return t}):t}resolvedOptions(){return this.dtf.resolvedOptions()}}class be{constructor(t,e,r){this.opts={style:"long",...r},!e&&nr()&&(this.rtf=function(t,e={}){const{base:r,...i}=e,s=JSON.stringify([t,i]);let n=he.get(s);return void 0===n&&(n=new Intl.RelativeTimeFormat(t,e),he.set(s,n)),n}(t,r))}format(t,e){return this.rtf?this.rtf.format(t,e):function(t,e,r="always",i=!1){const s={years:["year","yr."],quarters:["quarter","qtr."],months:["month","mo."],weeks:["week","wk."],days:["day","day","days"],hours:["hour","hr."],minutes:["minute","min."],seconds:["second","sec."]},n=-1===["hours","minutes","seconds"].indexOf(t);if("auto"===r&&n){const r="days"===t;switch(e){case 1:return r?"tomorrow":`next ${s[t][0]}`;case-1:return r?"yesterday":`last ${s[t][0]}`;case 0:return r?"today":`this ${s[t][0]}`}}const a=Object.is(e,-0)||e<0,o=Math.abs(e),l=1===o,c=s[t],u=i?l?c[1]:c[2]||c[1]:l?s[t][0]:t;return a?`${o} ${u} ago`:`in ${o} ${u}`}(e,t,this.opts.numeric,"long"!==this.opts.style)}formatToParts(t,e){return this.rtf?this.rtf.formatToParts(t,e):[]}}const _e={firstDay:1,minimalDays:4,weekend:[6,7]};class Se{static fromOpts(t){return Se.create(t.locale,t.numberingSystem,t.outputCalendar,t.weekSettings,t.defaultToEN)}static create(t,e,r,i,s=!1){const n=t||ze.defaultLocale,a=n||(s?"en-US":pe||(pe=(new Intl.DateTimeFormat).resolvedOptions().locale,pe)),o=e||ze.defaultNumberingSystem,l=r||ze.defaultOutputCalendar,c=cr(i)||ze.defaultWeekSettings;return new Se(a,o,l,c,n)}static resetCache(){pe=null,ce.clear(),de.clear(),he.clear(),me.clear(),fe.clear()}static fromObject({locale:t,numberingSystem:e,outputCalendar:r,weekSettings:i}={}){return Se.create(t,e,r,i)}constructor(t,e,r,i,s){const[n,a,o]=function(t){const e=t.indexOf("-x-");-1!==e&&(t=t.substring(0,e));const r=t.indexOf("-u-");if(-1===r)return[t];{let e,i;try{e=ue(t).resolvedOptions(),i=t}catch(s){const n=t.substring(0,r);e=ue(n).resolvedOptions(),i=n}const{numberingSystem:s,calendar:n}=e;return[i,s,n]}}(t);this.locale=n,this.numberingSystem=e||a||null,this.outputCalendar=r||o||null,this.weekSettings=i,this.intl=function(t,e,r){return r||e?(t.includes("-u-")||(t+="-u"),r&&(t+=`-ca-${r}`),e&&(t+=`-nu-${e}`),t):t}(this.locale,this.numberingSystem,this.outputCalendar),this.weekdaysCache={format:{},standalone:{}},this.monthsCache={format:{},standalone:{}},this.meridiemCache=null,this.eraCache={},this.specifiedLocale=s,this.fastNumbersCached=null}get fastNumbers(){var t;return null==this.fastNumbersCached&&(this.fastNumbersCached=(!(t=this).numberingSystem||"latn"===t.numberingSystem)&&("latn"===t.numberingSystem||!t.locale||t.locale.startsWith("en")||"latn"===ge(t.locale).numberingSystem)),this.fastNumbersCached}listingMode(){const t=this.isEnglish(),e=!(null!==this.numberingSystem&&"latn"!==this.numberingSystem||null!==this.outputCalendar&&"gregory"!==this.outputCalendar);return t&&e?"en":"intl"}clone(t){return t&&0!==Object.getOwnPropertyNames(t).length?Se.create(t.locale||this.specifiedLocale,t.numberingSystem||this.numberingSystem,t.outputCalendar||this.outputCalendar,cr(t.weekSettings)||this.weekSettings,t.defaultToEN||!1):this}redefaultToEN(t={}){return this.clone({...t,defaultToEN:!0})}redefaultToSystem(t={}){return this.clone({...t,defaultToEN:!1})}months(t,e=!1){return ye(this,t,Ar,()=>{const r="ja"===this.intl||this.intl.startsWith("ja-"),i=(e&=!r)?{month:t,day:"numeric"}:{month:t},s=e?"format":"standalone";if(!this.monthsCache[s][t]){const e=r?t=>this.dtFormatter(t,i).format():t=>this.extract(t,i,"month");this.monthsCache[s][t]=function(t){const e=[];for(let r=1;r<=12;r++){const i=Ps.utc(2009,r,1);e.push(t(i))}return e}(e)}return this.monthsCache[s][t]})}weekdays(t,e=!1){return ye(this,t,Vr,()=>{const r=e?{weekday:t,year:"numeric",month:"long",day:"numeric"}:{weekday:t},i=e?"format":"standalone";return this.weekdaysCache[i][t]||(this.weekdaysCache[i][t]=function(t){const e=[];for(let r=1;r<=7;r++){const i=Ps.utc(2016,11,13+r);e.push(t(i))}return e}(t=>this.extract(t,r,"weekday"))),this.weekdaysCache[i][t]})}meridiems(){return ye(this,void 0,()=>Pr,()=>{if(!this.meridiemCache){const t={hour:"numeric",hourCycle:"h12"};this.meridiemCache=[Ps.utc(2016,11,13,9),Ps.utc(2016,11,13,19)].map(e=>this.extract(e,t,"dayperiod"))}return this.meridiemCache})}eras(t){return ye(this,t,Ur,()=>{const e={era:t};return this.eraCache[t]||(this.eraCache[t]=[Ps.utc(-40,1,1),Ps.utc(2017,1,1)].map(t=>this.extract(t,e,"era"))),this.eraCache[t]})}extract(t,e,r){const i=this.dtFormatter(t,e).formatToParts().find(t=>t.type.toLowerCase()===r);return i?i.value:null}numberFormatter(t={}){return new ve(this.intl,t.forceSimple||this.fastNumbers,t)}dtFormatter(t,e={}){return new we(t,this.intl,e)}relFormatter(t={}){return new be(this.intl,this.isEnglish(),t)}listFormatter(t={}){return function(t,e={}){const r=JSON.stringify([t,e]);let i=le[r];return i||(i=new Intl.ListFormat(t,e),le[r]=i),i}(this.intl,t)}isEnglish(){return"en"===this.locale||"en-us"===this.locale.toLowerCase()||ge(this.intl).locale.startsWith("en-us")}getWeekSettings(){return this.weekSettings?this.weekSettings:ar()?function(t){let e=fe.get(t);if(!e){const r=new Intl.Locale(t);e="getWeekInfo"in r?r.getWeekInfo():r.weekInfo,"minimalDays"in e||(e={..._e,...e}),fe.set(t,e)}return e}(this.locale):_e}getStartOfWeek(){return this.getWeekSettings().firstDay}getMinDaysInFirstWeek(){return this.getWeekSettings().minimalDays}getWeekendDays(){return this.getWeekSettings().weekend}equals(t){return this.locale===t.locale&&this.numberingSystem===t.numberingSystem&&this.outputCalendar===t.outputCalendar}toString(){return`Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`}}let $e=null;class xe extends ee{static get utcInstance(){return null===$e&&($e=new xe(0)),$e}static instance(t){return 0===t?xe.utcInstance:new xe(t)}static parseSpecifier(t){if(t){const e=t.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);if(e)return new xe(xr(e[1],e[2]))}return null}constructor(t){super(),this.fixed=t}get type(){return"fixed"}get name(){return 0===this.fixed?"UTC":`UTC${kr(this.fixed,"narrow")}`}get ianaName(){return 0===this.fixed?"Etc/UTC":`Etc/GMT${kr(-this.fixed,"narrow")}`}offsetName(){return this.name}formatOffset(t,e){return kr(this.fixed,e)}get isUniversal(){return!0}offset(){return this.fixed}equals(t){return"fixed"===t.type&&t.fixed===this.fixed}get isValid(){return!0}}class De extends ee{constructor(t){super(),this.zoneName=t}get type(){return"invalid"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(){return null}formatOffset(){return""}offset(){return NaN}equals(){return!1}get isValid(){return!1}}function Ce(t,e){if(rr(t)||null===t)return e;if(t instanceof ee)return t;if(function(t){return"string"==typeof t}(t)){const r=t.toLowerCase();return"default"===r?e:"local"===r||"system"===r?ie.instance:"utc"===r||"gmt"===r?xe.utcInstance:xe.parseSpecifier(r)||oe.create(t)}return ir(t)?xe.instance(t):"object"==typeof t&&"offset"in t&&"function"==typeof t.offset?t:new De(t)}const ke={arab:"[٠-٩]",arabext:"[۰-۹]",bali:"[᭐-᭙]",beng:"[০-৯]",deva:"[०-९]",fullwide:"[０-９]",gujr:"[૦-૯]",hanidec:"[〇|一|二|三|四|五|六|七|八|九]",khmr:"[០-៩]",knda:"[೦-೯]",laoo:"[໐-໙]",limb:"[᥆-᥏]",mlym:"[൦-൯]",mong:"[᠐-᠙]",mymr:"[၀-၉]",orya:"[୦-୯]",tamldec:"[௦-௯]",telu:"[౦-౯]",thai:"[๐-๙]",tibt:"[༠-༩]",latn:"\\d"},Te={arab:[1632,1641],arabext:[1776,1785],bali:[6992,7001],beng:[2534,2543],deva:[2406,2415],fullwide:[65296,65303],gujr:[2790,2799],khmr:[6112,6121],knda:[3302,3311],laoo:[3792,3801],limb:[6470,6479],mlym:[3430,3439],mong:[6160,6169],mymr:[4160,4169],orya:[2918,2927],tamldec:[3046,3055],telu:[3174,3183],thai:[3664,3673],tibt:[3872,3881]},Oe=ke.hanidec.replace(/[\[|\]]/g,"").split("");const Ee=new Map;function Me({numberingSystem:t},e=""){const r=t||"latn";let i=Ee.get(r);void 0===i&&(i=new Map,Ee.set(r,i));let s=i.get(e);return void 0===s&&(s=new RegExp(`${ke[r]}${e}`),i.set(e,s)),s}let Ae,Ne=()=>Date.now(),Le="system",Ie=null,Ve=null,Pe=null,Fe=60,He=null;class ze{static get now(){return Ne}static set now(t){Ne=t}static set defaultZone(t){Le=t}static get defaultZone(){return Ce(Le,ie.instance)}static get defaultLocale(){return Ie}static set defaultLocale(t){Ie=t}static get defaultNumberingSystem(){return Ve}static set defaultNumberingSystem(t){Ve=t}static get defaultOutputCalendar(){return Pe}static set defaultOutputCalendar(t){Pe=t}static get defaultWeekSettings(){return He}static set defaultWeekSettings(t){He=cr(t)}static get twoDigitCutoffYear(){return Fe}static set twoDigitCutoffYear(t){Fe=t%100}static get throwOnInvalid(){return Ae}static set throwOnInvalid(t){Ae=t}static resetCaches(){Se.resetCache(),oe.resetCache(),Ps.resetCache(),Ee.clear()}}class Ue{constructor(t,e){this.reason=t,this.explanation=e}toMessage(){return this.explanation?`${this.reason}: ${this.explanation}`:this.reason}}const Ze=[0,31,59,90,120,151,181,212,243,273,304,334],je=[0,31,60,91,121,152,182,213,244,274,305,335];function Re(t,e){return new Ue("unit out of range",`you specified ${e} (of type ${typeof e}) as a ${t}, which is invalid`)}function We(t,e,r){const i=new Date(Date.UTC(t,e-1,r));t<100&&t>=0&&i.setUTCFullYear(i.getUTCFullYear()-1900);const s=i.getUTCDay();return 0===s?7:s}function qe(t,e,r){return r+(fr(t)?je:Ze)[e-1]}function Be(t,e){const r=fr(t)?je:Ze,i=r.findIndex(t=>t<e);return{month:i+1,day:e-r[i]}}function Ye(t,e){return(t-e+7)%7+1}function Ge(t,e=4,r=1){const{year:i,month:s,day:n}=t,a=qe(i,s,n),o=Ye(We(i,s,n),r);let l,c=Math.floor((a-o+14-e)/7);return c<1?(l=i-1,c=_r(l,e,r)):c>_r(i,e,r)?(l=i+1,c=1):l=i,{weekYear:l,weekNumber:c,weekday:o,...Tr(t)}}function Je(t,e=4,r=1){const{weekYear:i,weekNumber:s,weekday:n}=t,a=Ye(We(i,1,e),r),o=yr(i);let l,c=7*s+n-a-7+e;c<1?(l=i-1,c+=yr(l)):c>o?(l=i+1,c-=yr(i)):l=i;const{month:u,day:d}=Be(l,c);return{year:l,month:u,day:d,...Tr(t)}}function Qe(t){const{year:e,month:r,day:i}=t;return{year:e,ordinal:qe(e,r,i),...Tr(t)}}function Ke(t){const{year:e,ordinal:r}=t,{month:i,day:s}=Be(e,r);return{year:e,month:i,day:s,...Tr(t)}}function Xe(t,e){if(!rr(t.localWeekday)||!rr(t.localWeekNumber)||!rr(t.localWeekYear)){if(!rr(t.weekday)||!rr(t.weekNumber)||!rr(t.weekYear))throw new Ct("Cannot mix locale-based week fields with ISO-based week fields");return rr(t.localWeekday)||(t.weekday=t.localWeekday),rr(t.localWeekNumber)||(t.weekNumber=t.localWeekNumber),rr(t.localWeekYear)||(t.weekYear=t.localWeekYear),delete t.localWeekday,delete t.localWeekNumber,delete t.localWeekYear,{minDaysInFirstWeek:e.getMinDaysInFirstWeek(),startOfWeek:e.getStartOfWeek()}}return{minDaysInFirstWeek:4,startOfWeek:1}}function tr(t){const e=sr(t.year),r=ur(t.month,1,12),i=ur(t.day,1,vr(t.year,t.month));return e?r?!i&&Re("day",t.day):Re("month",t.month):Re("year",t.year)}function er(t){const{hour:e,minute:r,second:i,millisecond:s}=t,n=ur(e,0,23)||24===e&&0===r&&0===i&&0===s,a=ur(r,0,59),o=ur(i,0,59),l=ur(s,0,999);return n?a?o?!l&&Re("millisecond",s):Re("second",i):Re("minute",r):Re("hour",e)}function rr(t){return void 0===t}function ir(t){return"number"==typeof t}function sr(t){return"number"==typeof t&&t%1==0}function nr(){try{return"undefined"!=typeof Intl&&!!Intl.RelativeTimeFormat}catch(t){return!1}}function ar(){try{return"undefined"!=typeof Intl&&!!Intl.Locale&&("weekInfo"in Intl.Locale.prototype||"getWeekInfo"in Intl.Locale.prototype)}catch(t){return!1}}function or(t,e,r){if(0!==t.length)return t.reduce((t,i)=>{const s=[e(i),i];return t&&r(t[0],s[0])===t[0]?t:s},null)[1]}function lr(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function cr(t){if(null==t)return null;if("object"!=typeof t)throw new Tt("Week settings must be an object");if(!ur(t.firstDay,1,7)||!ur(t.minimalDays,1,7)||!Array.isArray(t.weekend)||t.weekend.some(t=>!ur(t,1,7)))throw new Tt("Invalid week settings");return{firstDay:t.firstDay,minimalDays:t.minimalDays,weekend:Array.from(t.weekend)}}function ur(t,e,r){return sr(t)&&t>=e&&t<=r}function dr(t,e=2){let r;return r=t<0?"-"+(""+-t).padStart(e,"0"):(""+t).padStart(e,"0"),r}function hr(t){return rr(t)||null===t||""===t?void 0:parseInt(t,10)}function pr(t){return rr(t)||null===t||""===t?void 0:parseFloat(t)}function mr(t){if(!rr(t)&&null!==t&&""!==t){const e=1e3*parseFloat("0."+t);return Math.floor(e)}}function gr(t,e,r="round"){const i=10**e;switch(r){case"expand":return t>0?Math.ceil(t*i)/i:Math.floor(t*i)/i;case"trunc":return Math.trunc(t*i)/i;case"round":return Math.round(t*i)/i;case"floor":return Math.floor(t*i)/i;case"ceil":return Math.ceil(t*i)/i;default:throw new RangeError(`Value rounding ${r} is out of range`)}}function fr(t){return t%4==0&&(t%100!=0||t%400==0)}function yr(t){return fr(t)?366:365}function vr(t,e){const r=function(t,e){return t-e*Math.floor(t/e)}(e-1,12)+1;return 2===r?fr(t+(e-r)/12)?29:28:[31,null,31,30,31,30,31,31,30,31,30,31][r-1]}function wr(t){let e=Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second,t.millisecond);return t.year<100&&t.year>=0&&(e=new Date(e),e.setUTCFullYear(t.year,t.month-1,t.day)),+e}function br(t,e,r){return-Ye(We(t,1,e),r)+e-1}function _r(t,e=4,r=1){const i=br(t,e,r),s=br(t+1,e,r);return(yr(t)-i+s)/7}function Sr(t){return t>99?t:t>ze.twoDigitCutoffYear?1900+t:2e3+t}function $r(t,e,r,i=null){const s=new Date(t),n={hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"};i&&(n.timeZone=i);const a={timeZoneName:e,...n},o=new Intl.DateTimeFormat(r,a).formatToParts(s).find(t=>"timezonename"===t.type.toLowerCase());return o?o.value:null}function xr(t,e){let r=parseInt(t,10);Number.isNaN(r)&&(r=0);const i=parseInt(e,10)||0;return 60*r+(r<0||Object.is(r,-0)?-i:i)}function Dr(t){const e=Number(t);if("boolean"==typeof t||""===t||!Number.isFinite(e))throw new Tt(`Invalid unit value ${t}`);return e}function Cr(t,e){const r={};for(const i in t)if(lr(t,i)){const s=t[i];if(null==s)continue;r[e(i)]=Dr(s)}return r}function kr(t,e){const r=Math.trunc(Math.abs(t/60)),i=Math.trunc(Math.abs(t%60)),s=t>=0?"+":"-";switch(e){case"short":return`${s}${dr(r,2)}:${dr(i,2)}`;case"narrow":return`${s}${r}${i>0?`:${i}`:""}`;case"techie":return`${s}${dr(r,2)}${dr(i,2)}`;default:throw new RangeError(`Value format ${e} is out of range for property format`)}}function Tr(t){return function(t,e){return e.reduce((e,r)=>(e[r]=t[r],e),{})}(t,["hour","minute","second","millisecond"])}const Or=["January","February","March","April","May","June","July","August","September","October","November","December"],Er=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],Mr=["J","F","M","A","M","J","J","A","S","O","N","D"];function Ar(t){switch(t){case"narrow":return[...Mr];case"short":return[...Er];case"long":return[...Or];case"numeric":return["1","2","3","4","5","6","7","8","9","10","11","12"];case"2-digit":return["01","02","03","04","05","06","07","08","09","10","11","12"];default:return null}}const Nr=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],Lr=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],Ir=["M","T","W","T","F","S","S"];function Vr(t){switch(t){case"narrow":return[...Ir];case"short":return[...Lr];case"long":return[...Nr];case"numeric":return["1","2","3","4","5","6","7"];default:return null}}const Pr=["AM","PM"],Fr=["Before Christ","Anno Domini"],Hr=["BC","AD"],zr=["B","A"];function Ur(t){switch(t){case"narrow":return[...zr];case"short":return[...Hr];case"long":return[...Fr];default:return null}}function Zr(t,e){let r="";for(const i of t)i.literal?r+=i.val:r+=e(i.val);return r}const jr={D:Nt,DD:Lt,DDD:Vt,DDDD:Pt,t:Ft,tt:Ht,ttt:zt,tttt:Ut,T:Zt,TT:jt,TTT:Rt,TTTT:Wt,f:qt,ff:Yt,fff:Qt,ffff:Xt,F:Bt,FF:Gt,FFF:Kt,FFFF:te};class Rr{static create(t,e={}){return new Rr(t,e)}static parseFormat(t){let e=null,r="",i=!1;const s=[];for(let n=0;n<t.length;n++){const a=t.charAt(n);"'"===a?((r.length>0||i)&&s.push({literal:i||/^\s+$/.test(r),val:""===r?"'":r}),e=null,r="",i=!i):i||a===e?r+=a:(r.length>0&&s.push({literal:/^\s+$/.test(r),val:r}),r=a,e=a)}return r.length>0&&s.push({literal:i||/^\s+$/.test(r),val:r}),s}static macroTokenToFormatOpts(t){return jr[t]}constructor(t,e){this.opts=e,this.loc=t,this.systemLoc=null}formatWithSystemDefault(t,e){null===this.systemLoc&&(this.systemLoc=this.loc.redefaultToSystem());return this.systemLoc.dtFormatter(t,{...this.opts,...e}).format()}dtFormatter(t,e={}){return this.loc.dtFormatter(t,{...this.opts,...e})}formatDateTime(t,e){return this.dtFormatter(t,e).format()}formatDateTimeParts(t,e){return this.dtFormatter(t,e).formatToParts()}formatInterval(t,e){return this.dtFormatter(t.start,e).dtf.formatRange(t.start.toJSDate(),t.end.toJSDate())}resolvedOptions(t,e){return this.dtFormatter(t,e).resolvedOptions()}num(t,e=0,r=void 0){if(this.opts.forceSimple)return dr(t,e);const i={...this.opts};return e>0&&(i.padTo=e),r&&(i.signDisplay=r),this.loc.numberFormatter(i).format(t)}formatDateTimeFromString(t,e){const r="en"===this.loc.listingMode(),i=this.loc.outputCalendar&&"gregory"!==this.loc.outputCalendar,s=(e,r)=>this.loc.extract(t,e,r),n=e=>t.isOffsetFixed&&0===t.offset&&e.allowZ?"Z":t.isValid?t.zone.formatOffset(t.ts,e.format):"",a=()=>r?function(t){return Pr[t.hour<12?0:1]}(t):s({hour:"numeric",hourCycle:"h12"},"dayperiod"),o=(e,i)=>r?function(t,e){return Ar(e)[t.month-1]}(t,e):s(i?{month:e}:{month:e,day:"numeric"},"month"),l=(e,i)=>r?function(t,e){return Vr(e)[t.weekday-1]}(t,e):s(i?{weekday:e}:{weekday:e,month:"long",day:"numeric"},"weekday"),c=e=>{const r=Rr.macroTokenToFormatOpts(e);return r?this.formatWithSystemDefault(t,r):e},u=e=>r?function(t,e){return Ur(e)[t.year<0?0:1]}(t,e):s({era:e},"era");return Zr(Rr.parseFormat(e),e=>{switch(e){case"S":return this.num(t.millisecond);case"u":case"SSS":return this.num(t.millisecond,3);case"s":return this.num(t.second);case"ss":return this.num(t.second,2);case"uu":return this.num(Math.floor(t.millisecond/10),2);case"uuu":return this.num(Math.floor(t.millisecond/100));case"m":return this.num(t.minute);case"mm":return this.num(t.minute,2);case"h":return this.num(t.hour%12==0?12:t.hour%12);case"hh":return this.num(t.hour%12==0?12:t.hour%12,2);case"H":return this.num(t.hour);case"HH":return this.num(t.hour,2);case"Z":return n({format:"narrow",allowZ:this.opts.allowZ});case"ZZ":return n({format:"short",allowZ:this.opts.allowZ});case"ZZZ":return n({format:"techie",allowZ:this.opts.allowZ});case"ZZZZ":return t.zone.offsetName(t.ts,{format:"short",locale:this.loc.locale});case"ZZZZZ":return t.zone.offsetName(t.ts,{format:"long",locale:this.loc.locale});case"z":return t.zoneName;case"a":return a();case"d":return i?s({day:"numeric"},"day"):this.num(t.day);case"dd":return i?s({day:"2-digit"},"day"):this.num(t.day,2);case"c":case"E":return this.num(t.weekday);case"ccc":return l("short",!0);case"cccc":return l("long",!0);case"ccccc":return l("narrow",!0);case"EEE":return l("short",!1);case"EEEE":return l("long",!1);case"EEEEE":return l("narrow",!1);case"L":return i?s({month:"numeric",day:"numeric"},"month"):this.num(t.month);case"LL":return i?s({month:"2-digit",day:"numeric"},"month"):this.num(t.month,2);case"LLL":return o("short",!0);case"LLLL":return o("long",!0);case"LLLLL":return o("narrow",!0);case"M":return i?s({month:"numeric"},"month"):this.num(t.month);case"MM":return i?s({month:"2-digit"},"month"):this.num(t.month,2);case"MMM":return o("short",!1);case"MMMM":return o("long",!1);case"MMMMM":return o("narrow",!1);case"y":return i?s({year:"numeric"},"year"):this.num(t.year);case"yy":return i?s({year:"2-digit"},"year"):this.num(t.year.toString().slice(-2),2);case"yyyy":return i?s({year:"numeric"},"year"):this.num(t.year,4);case"yyyyyy":return i?s({year:"numeric"},"year"):this.num(t.year,6);case"G":return u("short");case"GG":return u("long");case"GGGGG":return u("narrow");case"kk":return this.num(t.weekYear.toString().slice(-2),2);case"kkkk":return this.num(t.weekYear,4);case"W":return this.num(t.weekNumber);case"WW":return this.num(t.weekNumber,2);case"n":return this.num(t.localWeekNumber);case"nn":return this.num(t.localWeekNumber,2);case"ii":return this.num(t.localWeekYear.toString().slice(-2),2);case"iiii":return this.num(t.localWeekYear,4);case"o":return this.num(t.ordinal);case"ooo":return this.num(t.ordinal,3);case"q":return this.num(t.quarter);case"qq":return this.num(t.quarter,2);case"X":return this.num(Math.floor(t.ts/1e3));case"x":return this.num(t.ts);default:return c(e)}})}formatDurationFromString(t,e){const r="negativeLargestOnly"===this.opts.signMode?-1:1,i=t=>{switch(t[0]){case"S":return"milliseconds";case"s":return"seconds";case"m":return"minutes";case"h":return"hours";case"d":return"days";case"w":return"weeks";case"M":return"months";case"y":return"years";default:return null}},s=Rr.parseFormat(e),n=s.reduce((t,{literal:e,val:r})=>e?t:t.concat(r),[]),a=t.shiftTo(...n.map(i).filter(t=>t));return Zr(s,((t,e)=>s=>{const n=i(s);if(n){const i=e.isNegativeDuration&&n!==e.largestUnit?r:1;let a;return a="negativeLargestOnly"===this.opts.signMode&&n!==e.largestUnit?"never":"all"===this.opts.signMode?"always":"auto",this.num(t.get(n)*i,s.length,a)}return s})(a,{isNegativeDuration:a<0,largestUnit:Object.keys(a.values)[0]}))}}const Wr=/[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;function qr(...t){const e=t.reduce((t,e)=>t+e.source,"");return RegExp(`^${e}$`)}function Br(...t){return e=>t.reduce(([t,r,i],s)=>{const[n,a,o]=s(e,i);return[{...t,...n},a||r,o]},[{},null,1]).slice(0,2)}function Yr(t,...e){if(null==t)return[null,null];for(const[r,i]of e){const e=r.exec(t);if(e)return i(e)}return[null,null]}function Gr(...t){return(e,r)=>{const i={};let s;for(s=0;s<t.length;s++)i[t[s]]=hr(e[r+s]);return[i,null,r+s]}}const Jr=/(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/,Qr=/(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/,Kr=RegExp(`${Qr.source}${`(?:${Jr.source}?(?:\\[(${Wr.source})\\])?)?`}`),Xr=RegExp(`(?:[Tt]${Kr.source})?`),ti=Gr("weekYear","weekNumber","weekDay"),ei=Gr("year","ordinal"),ri=RegExp(`${Qr.source} ?(?:${Jr.source}|(${Wr.source}))?`),ii=RegExp(`(?: ${ri.source})?`);function si(t,e,r){const i=t[e];return rr(i)?r:hr(i)}function ni(t,e){return[{hours:si(t,e,0),minutes:si(t,e+1,0),seconds:si(t,e+2,0),milliseconds:mr(t[e+3])},null,e+4]}function ai(t,e){const r=!t[e]&&!t[e+1],i=xr(t[e+1],t[e+2]);return[{},r?null:xe.instance(i),e+3]}function oi(t,e){return[{},t[e]?oe.create(t[e]):null,e+1]}const li=RegExp(`^T?${Qr.source}$`),ci=/^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;function ui(t){const[e,r,i,s,n,a,o,l,c]=t,u="-"===e[0],d=l&&"-"===l[0],h=(t,e=!1)=>void 0!==t&&(e||t&&u)?-t:t;return[{years:h(pr(r)),months:h(pr(i)),weeks:h(pr(s)),days:h(pr(n)),hours:h(pr(a)),minutes:h(pr(o)),seconds:h(pr(l),"-0"===l),milliseconds:h(mr(c),d)}]}const di={GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function hi(t,e,r,i,s,n,a){const o={year:2===e.length?Sr(hr(e)):hr(e),month:Er.indexOf(r)+1,day:hr(i),hour:hr(s),minute:hr(n)};return a&&(o.second=hr(a)),t&&(o.weekday=t.length>3?Nr.indexOf(t)+1:Lr.indexOf(t)+1),o}const pi=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;function mi(t){const[,e,r,i,s,n,a,o,l,c,u,d]=t,h=hi(e,s,i,r,n,a,o);let p;return p=l?di[l]:c?0:xr(u,d),[h,new xe(p)]}const gi=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,fi=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,yi=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;function vi(t){const[,e,r,i,s,n,a,o]=t;return[hi(e,s,i,r,n,a,o),xe.utcInstance]}function wi(t){const[,e,r,i,s,n,a,o]=t;return[hi(e,o,r,i,s,n,a),xe.utcInstance]}const bi=qr(/([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,Xr),_i=qr(/(\d{4})-?W(\d\d)(?:-?(\d))?/,Xr),Si=qr(/(\d{4})-?(\d{3})/,Xr),$i=qr(Kr),xi=Br(function(t,e){return[{year:si(t,e),month:si(t,e+1,1),day:si(t,e+2,1)},null,e+3]},ni,ai,oi),Di=Br(ti,ni,ai,oi),Ci=Br(ei,ni,ai,oi),ki=Br(ni,ai,oi);const Ti=Br(ni);const Oi=qr(/(\d{4})-(\d\d)-(\d\d)/,ii),Ei=qr(ri),Mi=Br(ni,ai,oi);const Ai="Invalid Duration",Ni={weeks:{days:7,hours:168,minutes:10080,seconds:604800,milliseconds:6048e5},days:{hours:24,minutes:1440,seconds:86400,milliseconds:864e5},hours:{minutes:60,seconds:3600,milliseconds:36e5},minutes:{seconds:60,milliseconds:6e4},seconds:{milliseconds:1e3}},Li={years:{quarters:4,months:12,weeks:52,days:365,hours:8760,minutes:525600,seconds:31536e3,milliseconds:31536e6},quarters:{months:3,weeks:13,days:91,hours:2184,minutes:131040,seconds:7862400,milliseconds:78624e5},months:{weeks:4,days:30,hours:720,minutes:43200,seconds:2592e3,milliseconds:2592e6},...Ni},Ii=365.2425,Vi=30.436875,Pi={years:{quarters:4,months:12,weeks:52.1775,days:Ii,hours:8765.82,minutes:525949.2,seconds:525949.2*60,milliseconds:525949.2*60*1e3},quarters:{months:3,weeks:13.044375,days:91.310625,hours:2191.455,minutes:131487.3,seconds:525949.2*60/4,milliseconds:7889237999.999999},months:{weeks:4.3481250000000005,days:Vi,hours:730.485,minutes:43829.1,seconds:2629746,milliseconds:2629746e3},...Ni},Fi=["years","quarters","months","weeks","days","hours","minutes","seconds","milliseconds"],Hi=Fi.slice(0).reverse();function zi(t,e,r=!1){const i={values:r?e.values:{...t.values,...e.values||{}},loc:t.loc.clone(e.loc),conversionAccuracy:e.conversionAccuracy||t.conversionAccuracy,matrix:e.matrix||t.matrix};return new Ri(i)}function Ui(t,e){let r=e.milliseconds??0;for(const i of Hi.slice(1))e[i]&&(r+=e[i]*t[i].milliseconds);return r}function Zi(t,e){const r=Ui(t,e)<0?-1:1;Fi.reduceRight((i,s)=>{if(rr(e[s]))return i;if(i){const n=e[i]*r,a=t[s][i],o=Math.floor(n/a);e[s]+=o*r,e[i]-=o*a*r}return s},null),Fi.reduce((r,i)=>{if(rr(e[i]))return r;if(r){const s=e[r]%1;e[r]-=s,e[i]+=s*t[r][i]}return i},null)}function ji(t){const e={};for(const[r,i]of Object.entries(t))0!==i&&(e[r]=i);return e}class Ri{constructor(t){const e="longterm"===t.conversionAccuracy||!1;let r=e?Pi:Li;t.matrix&&(r=t.matrix),this.values=t.values,this.loc=t.loc||Se.create(),this.conversionAccuracy=e?"longterm":"casual",this.invalid=t.invalid||null,this.matrix=r,this.isLuxonDuration=!0}static fromMillis(t,e){return Ri.fromObject({milliseconds:t},e)}static fromObject(t,e={}){if(null==t||"object"!=typeof t)throw new Tt("Duration.fromObject: argument expected to be an object, got "+(null===t?"null":typeof t));return new Ri({values:Cr(t,Ri.normalizeUnit),loc:Se.fromObject(e),conversionAccuracy:e.conversionAccuracy,matrix:e.matrix})}static fromDurationLike(t){if(ir(t))return Ri.fromMillis(t);if(Ri.isDuration(t))return t;if("object"==typeof t)return Ri.fromObject(t);throw new Tt(`Unknown duration argument ${t} of type ${typeof t}`)}static fromISO(t,e){const[r]=function(t){return Yr(t,[ci,ui])}(t);return r?Ri.fromObject(r,e):Ri.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static fromISOTime(t,e){const[r]=function(t){return Yr(t,[li,Ti])}(t);return r?Ri.fromObject(r,e):Ri.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static invalid(t,e=null){if(!t)throw new Tt("need to specify a reason the Duration is invalid");const r=t instanceof Ue?t:new Ue(t,e);if(ze.throwOnInvalid)throw new Dt(r);return new Ri({invalid:r})}static normalizeUnit(t){const e={year:"years",years:"years",quarter:"quarters",quarters:"quarters",month:"months",months:"months",week:"weeks",weeks:"weeks",day:"days",days:"days",hour:"hours",hours:"hours",minute:"minutes",minutes:"minutes",second:"seconds",seconds:"seconds",millisecond:"milliseconds",milliseconds:"milliseconds"}[t?t.toLowerCase():t];if(!e)throw new kt(t);return e}static isDuration(t){return t&&t.isLuxonDuration||!1}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}toFormat(t,e={}){const r={...e,floor:!1!==e.round&&!1!==e.floor};return this.isValid?Rr.create(this.loc,r).formatDurationFromString(this,t):Ai}toHuman(t={}){if(!this.isValid)return Ai;const e=!1!==t.showZeros,r=Fi.map(r=>{const i=this.values[r];return rr(i)||0===i&&!e?null:this.loc.numberFormatter({style:"unit",unitDisplay:"long",...t,unit:r.slice(0,-1)}).format(i)}).filter(t=>t);return this.loc.listFormatter({type:"conjunction",style:t.listStyle||"narrow",...t}).format(r)}toObject(){return this.isValid?{...this.values}:{}}toISO(){if(!this.isValid)return null;let t="P";return 0!==this.years&&(t+=this.years+"Y"),0===this.months&&0===this.quarters||(t+=this.months+3*this.quarters+"M"),0!==this.weeks&&(t+=this.weeks+"W"),0!==this.days&&(t+=this.days+"D"),0===this.hours&&0===this.minutes&&0===this.seconds&&0===this.milliseconds||(t+="T"),0!==this.hours&&(t+=this.hours+"H"),0!==this.minutes&&(t+=this.minutes+"M"),0===this.seconds&&0===this.milliseconds||(t+=gr(this.seconds+this.milliseconds/1e3,3)+"S"),"P"===t&&(t+="T0S"),t}toISOTime(t={}){if(!this.isValid)return null;const e=this.toMillis();if(e<0||e>=864e5)return null;t={suppressMilliseconds:!1,suppressSeconds:!1,includePrefix:!1,format:"extended",...t,includeOffset:!1};return Ps.fromMillis(e,{zone:"UTC"}).toISOTime(t)}toJSON(){return this.toISO()}toString(){return this.toISO()}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Duration { values: ${JSON.stringify(this.values)} }`:`Duration { Invalid, reason: ${this.invalidReason} }`}toMillis(){return this.isValid?Ui(this.matrix,this.values):NaN}valueOf(){return this.toMillis()}plus(t){if(!this.isValid)return this;const e=Ri.fromDurationLike(t),r={};for(const t of Fi)(lr(e.values,t)||lr(this.values,t))&&(r[t]=e.get(t)+this.get(t));return zi(this,{values:r},!0)}minus(t){if(!this.isValid)return this;const e=Ri.fromDurationLike(t);return this.plus(e.negate())}mapUnits(t){if(!this.isValid)return this;const e={};for(const r of Object.keys(this.values))e[r]=Dr(t(this.values[r],r));return zi(this,{values:e},!0)}get(t){return this[Ri.normalizeUnit(t)]}set(t){if(!this.isValid)return this;return zi(this,{values:{...this.values,...Cr(t,Ri.normalizeUnit)}})}reconfigure({locale:t,numberingSystem:e,conversionAccuracy:r,matrix:i}={}){return zi(this,{loc:this.loc.clone({locale:t,numberingSystem:e}),matrix:i,conversionAccuracy:r})}as(t){return this.isValid?this.shiftTo(t).get(t):NaN}normalize(){if(!this.isValid)return this;const t=this.toObject();return Zi(this.matrix,t),zi(this,{values:t},!0)}rescale(){if(!this.isValid)return this;return zi(this,{values:ji(this.normalize().shiftToAll().toObject())},!0)}shiftTo(...t){if(!this.isValid)return this;if(0===t.length)return this;t=t.map(t=>Ri.normalizeUnit(t));const e={},r={},i=this.toObject();let s;for(const n of Fi)if(t.indexOf(n)>=0){s=n;let t=0;for(const e in r)t+=this.matrix[e][n]*r[e],r[e]=0;ir(i[n])&&(t+=i[n]);const a=Math.trunc(t);e[n]=a,r[n]=(1e3*t-1e3*a)/1e3}else ir(i[n])&&(r[n]=i[n]);for(const t in r)0!==r[t]&&(e[s]+=t===s?r[t]:r[t]/this.matrix[s][t]);return Zi(this.matrix,e),zi(this,{values:e},!0)}shiftToAll(){return this.isValid?this.shiftTo("years","months","weeks","days","hours","minutes","seconds","milliseconds"):this}negate(){if(!this.isValid)return this;const t={};for(const e of Object.keys(this.values))t[e]=0===this.values[e]?0:-this.values[e];return zi(this,{values:t},!0)}removeZeros(){if(!this.isValid)return this;return zi(this,{values:ji(this.values)},!0)}get years(){return this.isValid?this.values.years||0:NaN}get quarters(){return this.isValid?this.values.quarters||0:NaN}get months(){return this.isValid?this.values.months||0:NaN}get weeks(){return this.isValid?this.values.weeks||0:NaN}get days(){return this.isValid?this.values.days||0:NaN}get hours(){return this.isValid?this.values.hours||0:NaN}get minutes(){return this.isValid?this.values.minutes||0:NaN}get seconds(){return this.isValid?this.values.seconds||0:NaN}get milliseconds(){return this.isValid?this.values.milliseconds||0:NaN}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}equals(t){if(!this.isValid||!t.isValid)return!1;if(!this.loc.equals(t.loc))return!1;function e(t,e){return void 0===t||0===t?void 0===e||0===e:t===e}for(const r of Fi)if(!e(this.values[r],t.values[r]))return!1;return!0}}const Wi="Invalid Interval";class qi{constructor(t){this.s=t.start,this.e=t.end,this.invalid=t.invalid||null,this.isLuxonInterval=!0}static invalid(t,e=null){if(!t)throw new Tt("need to specify a reason the Interval is invalid");const r=t instanceof Ue?t:new Ue(t,e);if(ze.throwOnInvalid)throw new xt(r);return new qi({invalid:r})}static fromDateTimes(t,e){const r=Fs(t),i=Fs(e),s=function(t,e){return t&&t.isValid?e&&e.isValid?e<t?qi.invalid("end before start",`The end of an interval must be after its start, but you had start=${t.toISO()} and end=${e.toISO()}`):null:qi.invalid("missing or invalid end"):qi.invalid("missing or invalid start")}(r,i);return null==s?new qi({start:r,end:i}):s}static after(t,e){const r=Ri.fromDurationLike(e),i=Fs(t);return qi.fromDateTimes(i,i.plus(r))}static before(t,e){const r=Ri.fromDurationLike(e),i=Fs(t);return qi.fromDateTimes(i.minus(r),i)}static fromISO(t,e){const[r,i]=(t||"").split("/",2);if(r&&i){let t,s,n,a;try{t=Ps.fromISO(r,e),s=t.isValid}catch(i){s=!1}try{n=Ps.fromISO(i,e),a=n.isValid}catch(i){a=!1}if(s&&a)return qi.fromDateTimes(t,n);if(s){const r=Ri.fromISO(i,e);if(r.isValid)return qi.after(t,r)}else if(a){const t=Ri.fromISO(r,e);if(t.isValid)return qi.before(n,t)}}return qi.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static isInterval(t){return t&&t.isLuxonInterval||!1}get start(){return this.isValid?this.s:null}get end(){return this.isValid?this.e:null}get lastDateTime(){return this.isValid&&this.e?this.e.minus(1):null}get isValid(){return null===this.invalidReason}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}length(t="milliseconds"){return this.isValid?this.toDuration(t).get(t):NaN}count(t="milliseconds",e){if(!this.isValid)return NaN;const r=this.start.startOf(t,e);let i;return i=e?.useLocaleWeeks?this.end.reconfigure({locale:r.locale}):this.end,i=i.startOf(t,e),Math.floor(i.diff(r,t).get(t))+(i.valueOf()!==this.end.valueOf())}hasSame(t){return!!this.isValid&&(this.isEmpty()||this.e.minus(1).hasSame(this.s,t))}isEmpty(){return this.s.valueOf()===this.e.valueOf()}isAfter(t){return!!this.isValid&&this.s>t}isBefore(t){return!!this.isValid&&this.e<=t}contains(t){return!!this.isValid&&(this.s<=t&&this.e>t)}set({start:t,end:e}={}){return this.isValid?qi.fromDateTimes(t||this.s,e||this.e):this}splitAt(...t){if(!this.isValid)return[];const e=t.map(Fs).filter(t=>this.contains(t)).sort((t,e)=>t.toMillis()-e.toMillis()),r=[];let{s:i}=this,s=0;for(;i<this.e;){const t=e[s]||this.e,n=+t>+this.e?this.e:t;r.push(qi.fromDateTimes(i,n)),i=n,s+=1}return r}splitBy(t){const e=Ri.fromDurationLike(t);if(!this.isValid||!e.isValid||0===e.as("milliseconds"))return[];let r,{s:i}=this,s=1;const n=[];for(;i<this.e;){const t=this.start.plus(e.mapUnits(t=>t*s));r=+t>+this.e?this.e:t,n.push(qi.fromDateTimes(i,r)),i=r,s+=1}return n}divideEqually(t){return this.isValid?this.splitBy(this.length()/t).slice(0,t):[]}overlaps(t){return this.e>t.s&&this.s<t.e}abutsStart(t){return!!this.isValid&&+this.e===+t.s}abutsEnd(t){return!!this.isValid&&+t.e===+this.s}engulfs(t){return!!this.isValid&&(this.s<=t.s&&this.e>=t.e)}equals(t){return!(!this.isValid||!t.isValid)&&(this.s.equals(t.s)&&this.e.equals(t.e))}intersection(t){if(!this.isValid)return this;const e=this.s>t.s?this.s:t.s,r=this.e<t.e?this.e:t.e;return e>=r?null:qi.fromDateTimes(e,r)}union(t){if(!this.isValid)return this;const e=this.s<t.s?this.s:t.s,r=this.e>t.e?this.e:t.e;return qi.fromDateTimes(e,r)}static merge(t){const[e,r]=t.sort((t,e)=>t.s-e.s).reduce(([t,e],r)=>e?e.overlaps(r)||e.abutsStart(r)?[t,e.union(r)]:[t.concat([e]),r]:[t,r],[[],null]);return r&&e.push(r),e}static xor(t){let e=null,r=0;const i=[],s=t.map(t=>[{time:t.s,type:"s"},{time:t.e,type:"e"}]),n=Array.prototype.concat(...s).sort((t,e)=>t.time-e.time);for(const t of n)r+="s"===t.type?1:-1,1===r?e=t.time:(e&&+e!==+t.time&&i.push(qi.fromDateTimes(e,t.time)),e=null);return qi.merge(i)}difference(...t){return qi.xor([this].concat(t)).map(t=>this.intersection(t)).filter(t=>t&&!t.isEmpty())}toString(){return this.isValid?`[${this.s.toISO()} – ${this.e.toISO()})`:Wi}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`:`Interval { Invalid, reason: ${this.invalidReason} }`}toLocaleString(t=Nt,e={}){return this.isValid?Rr.create(this.s.loc.clone(e),t).formatInterval(this):Wi}toISO(t){return this.isValid?`${this.s.toISO(t)}/${this.e.toISO(t)}`:Wi}toISODate(){return this.isValid?`${this.s.toISODate()}/${this.e.toISODate()}`:Wi}toISOTime(t){return this.isValid?`${this.s.toISOTime(t)}/${this.e.toISOTime(t)}`:Wi}toFormat(t,{separator:e=" – "}={}){return this.isValid?`${this.s.toFormat(t)}${e}${this.e.toFormat(t)}`:Wi}toDuration(t,e){return this.isValid?this.e.diff(this.s,t,e):Ri.invalid(this.invalidReason)}mapEndpoints(t){return qi.fromDateTimes(t(this.s),t(this.e))}}class Bi{static hasDST(t=ze.defaultZone){const e=Ps.now().setZone(t).set({month:12});return!t.isUniversal&&e.offset!==e.set({month:6}).offset}static isValidIANAZone(t){return oe.isValidZone(t)}static normalizeZone(t){return Ce(t,ze.defaultZone)}static getStartOfWeek({locale:t=null,locObj:e=null}={}){return(e||Se.create(t)).getStartOfWeek()}static getMinimumDaysInFirstWeek({locale:t=null,locObj:e=null}={}){return(e||Se.create(t)).getMinDaysInFirstWeek()}static getWeekendWeekdays({locale:t=null,locObj:e=null}={}){return(e||Se.create(t)).getWeekendDays().slice()}static months(t="long",{locale:e=null,numberingSystem:r=null,locObj:i=null,outputCalendar:s="gregory"}={}){return(i||Se.create(e,r,s)).months(t)}static monthsFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:i=null,outputCalendar:s="gregory"}={}){return(i||Se.create(e,r,s)).months(t,!0)}static weekdays(t="long",{locale:e=null,numberingSystem:r=null,locObj:i=null}={}){return(i||Se.create(e,r,null)).weekdays(t)}static weekdaysFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:i=null}={}){return(i||Se.create(e,r,null)).weekdays(t,!0)}static meridiems({locale:t=null}={}){return Se.create(t).meridiems()}static eras(t="short",{locale:e=null}={}){return Se.create(e,null,"gregory").eras(t)}static features(){return{relative:nr(),localeWeek:ar()}}}function Yi(t,e){const r=t=>t.toUTC(0,{keepLocalTime:!0}).startOf("day").valueOf(),i=r(e)-r(t);return Math.floor(Ri.fromMillis(i).as("days"))}function Gi(t,e,r,i){let[s,n,a,o]=function(t,e,r){const i=[["years",(t,e)=>e.year-t.year],["quarters",(t,e)=>e.quarter-t.quarter+4*(e.year-t.year)],["months",(t,e)=>e.month-t.month+12*(e.year-t.year)],["weeks",(t,e)=>{const r=Yi(t,e);return(r-r%7)/7}],["days",Yi]],s={},n=t;let a,o;for(const[l,c]of i)r.indexOf(l)>=0&&(a=l,s[l]=c(t,e),o=n.plus(s),o>e?(s[l]--,(t=n.plus(s))>e&&(o=t,s[l]--,t=n.plus(s))):t=o);return[t,s,o,a]}(t,e,r);const l=e-s,c=r.filter(t=>["hours","minutes","seconds","milliseconds"].indexOf(t)>=0);0===c.length&&(a<e&&(a=s.plus({[o]:1})),a!==s&&(n[o]=(n[o]||0)+l/(a-s)));const u=Ri.fromObject(n,i);return c.length>0?Ri.fromMillis(l,i).shiftTo(...c).plus(u):u}function Ji(t,e=t=>t){return{regex:t,deser:([t])=>e(function(t){let e=parseInt(t,10);if(isNaN(e)){e="";for(let r=0;r<t.length;r++){const i=t.charCodeAt(r);if(-1!==t[r].search(ke.hanidec))e+=Oe.indexOf(t[r]);else for(const t in Te){const[r,s]=Te[t];i>=r&&i<=s&&(e+=i-r)}}return parseInt(e,10)}return e}(t))}}const Qi=`[ ${String.fromCharCode(160)}]`,Ki=new RegExp(Qi,"g");function Xi(t){return t.replace(/\./g,"\\.?").replace(Ki,Qi)}function ts(t){return t.replace(/\./g,"").replace(Ki," ").toLowerCase()}function es(t,e){return null===t?null:{regex:RegExp(t.map(Xi).join("|")),deser:([r])=>t.findIndex(t=>ts(r)===ts(t))+e}}function rs(t,e){return{regex:t,deser:([,t,e])=>xr(t,e),groups:e}}function is(t){return{regex:t,deser:([t])=>t}}const ss={year:{"2-digit":"yy",numeric:"yyyyy"},month:{numeric:"M","2-digit":"MM",short:"MMM",long:"MMMM"},day:{numeric:"d","2-digit":"dd"},weekday:{short:"EEE",long:"EEEE"},dayperiod:"a",dayPeriod:"a",hour12:{numeric:"h","2-digit":"hh"},hour24:{numeric:"H","2-digit":"HH"},minute:{numeric:"m","2-digit":"mm"},second:{numeric:"s","2-digit":"ss"},timeZoneName:{long:"ZZZZZ",short:"ZZZ"}};let ns=null;function as(t,e){return Array.prototype.concat(...t.map(t=>function(t,e){if(t.literal)return t;const r=cs(Rr.macroTokenToFormatOpts(t.val),e);return null==r||r.includes(void 0)?t:r}(t,e)))}class os{constructor(t,e){if(this.locale=t,this.format=e,this.tokens=as(Rr.parseFormat(e),t),this.units=this.tokens.map(e=>function(t,e){const r=Me(e),i=Me(e,"{2}"),s=Me(e,"{3}"),n=Me(e,"{4}"),a=Me(e,"{6}"),o=Me(e,"{1,2}"),l=Me(e,"{1,3}"),c=Me(e,"{1,6}"),u=Me(e,"{1,9}"),d=Me(e,"{2,4}"),h=Me(e,"{4,6}"),p=t=>{return{regex:RegExp((e=t.val,e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"))),deser:([t])=>t,literal:!0};var e},m=(m=>{if(t.literal)return p(m);switch(m.val){case"G":return es(e.eras("short"),0);case"GG":return es(e.eras("long"),0);case"y":return Ji(c);case"yy":case"kk":return Ji(d,Sr);case"yyyy":case"kkkk":return Ji(n);case"yyyyy":return Ji(h);case"yyyyyy":return Ji(a);case"M":case"L":case"d":case"H":case"h":case"m":case"q":case"s":case"W":return Ji(o);case"MM":case"LL":case"dd":case"HH":case"hh":case"mm":case"qq":case"ss":case"WW":return Ji(i);case"MMM":return es(e.months("short",!0),1);case"MMMM":return es(e.months("long",!0),1);case"LLL":return es(e.months("short",!1),1);case"LLLL":return es(e.months("long",!1),1);case"o":case"S":return Ji(l);case"ooo":case"SSS":return Ji(s);case"u":return is(u);case"uu":return is(o);case"uuu":case"E":case"c":return Ji(r);case"a":return es(e.meridiems(),0);case"EEE":return es(e.weekdays("short",!1),1);case"EEEE":return es(e.weekdays("long",!1),1);case"ccc":return es(e.weekdays("short",!0),1);case"cccc":return es(e.weekdays("long",!0),1);case"Z":case"ZZ":return rs(new RegExp(`([+-]${o.source})(?::(${i.source}))?`),2);case"ZZZ":return rs(new RegExp(`([+-]${o.source})(${i.source})?`),2);case"z":return is(/[a-z_+-/]{1,256}?/i);case" ":return is(/[^\S\n\r]/);default:return p(m)}})(t)||{invalidReason:"missing Intl.DateTimeFormat.formatToParts support"};return m.token=t,m}(e,t)),this.disqualifyingUnit=this.units.find(t=>t.invalidReason),!this.disqualifyingUnit){const[t,e]=function(t){const e=t.map(t=>t.regex).reduce((t,e)=>`${t}(${e.source})`,"");return[`^${e}$`,t]}(this.units);this.regex=RegExp(t,"i"),this.handlers=e}}explainFromTokens(t){if(this.isValid){const[e,r]=function(t,e,r){const i=t.match(e);if(i){const t={};let e=1;for(const s in r)if(lr(r,s)){const n=r[s],a=n.groups?n.groups+1:1;!n.literal&&n.token&&(t[n.token.val[0]]=n.deser(i.slice(e,e+a))),e+=a}return[i,t]}return[i,{}]}(t,this.regex,this.handlers),[i,s,n]=r?function(t){let e,r=null;rr(t.z)||(r=oe.create(t.z)),rr(t.Z)||(r||(r=new xe(t.Z)),e=t.Z),rr(t.q)||(t.M=3*(t.q-1)+1),rr(t.h)||(t.h<12&&1===t.a?t.h+=12:12===t.h&&0===t.a&&(t.h=0)),0===t.G&&t.y&&(t.y=-t.y),rr(t.u)||(t.S=mr(t.u));const i=Object.keys(t).reduce((e,r)=>{const i=(t=>{switch(t){case"S":return"millisecond";case"s":return"second";case"m":return"minute";case"h":case"H":return"hour";case"d":return"day";case"o":return"ordinal";case"L":case"M":return"month";case"y":return"year";case"E":case"c":return"weekday";case"W":return"weekNumber";case"k":return"weekYear";case"q":return"quarter";default:return null}})(r);return i&&(e[i]=t[r]),e},{});return[i,r,e]}(r):[null,null,void 0];if(lr(r,"a")&&lr(r,"H"))throw new Ct("Can't include meridiem when specifying 24-hour format");return{input:t,tokens:this.tokens,regex:this.regex,rawMatches:e,matches:r,result:i,zone:s,specificOffset:n}}return{input:t,tokens:this.tokens,invalidReason:this.invalidReason}}get isValid(){return!this.disqualifyingUnit}get invalidReason(){return this.disqualifyingUnit?this.disqualifyingUnit.invalidReason:null}}function ls(t,e,r){return new os(t,r).explainFromTokens(e)}function cs(t,e){if(!t)return null;const r=Rr.create(e,t).dtFormatter((ns||(ns=Ps.fromMillis(1555555555555)),ns)),i=r.formatToParts(),s=r.resolvedOptions();return i.map(e=>function(t,e,r){const{type:i,value:s}=t;if("literal"===i){const t=/^\s+$/.test(s);return{literal:!t,val:t?" ":s}}const n=e[i];let a=i;"hour"===i&&(a=null!=e.hour12?e.hour12?"hour12":"hour24":null!=e.hourCycle?"h11"===e.hourCycle||"h12"===e.hourCycle?"hour12":"hour24":r.hour12?"hour12":"hour24");let o=ss[a];if("object"==typeof o&&(o=o[n]),o)return{literal:!1,val:o}}(e,t,s))}const us="Invalid DateTime",ds=864e13;function hs(t){return new Ue("unsupported zone",`the zone "${t.name}" is not supported`)}function ps(t){return null===t.weekData&&(t.weekData=Ge(t.c)),t.weekData}function ms(t){return null===t.localWeekData&&(t.localWeekData=Ge(t.c,t.loc.getMinDaysInFirstWeek(),t.loc.getStartOfWeek())),t.localWeekData}function gs(t,e){const r={ts:t.ts,zone:t.zone,c:t.c,o:t.o,loc:t.loc,invalid:t.invalid};return new Ps({...r,...e,old:r})}function fs(t,e,r){let i=t-60*e*1e3;const s=r.offset(i);if(e===s)return[i,e];i-=60*(s-e)*1e3;const n=r.offset(i);return s===n?[i,s]:[t-60*Math.min(s,n)*1e3,Math.max(s,n)]}function ys(t,e){const r=new Date(t+=60*e*1e3);return{year:r.getUTCFullYear(),month:r.getUTCMonth()+1,day:r.getUTCDate(),hour:r.getUTCHours(),minute:r.getUTCMinutes(),second:r.getUTCSeconds(),millisecond:r.getUTCMilliseconds()}}function vs(t,e,r){return fs(wr(t),e,r)}function ws(t,e){const r=t.o,i=t.c.year+Math.trunc(e.years),s=t.c.month+Math.trunc(e.months)+3*Math.trunc(e.quarters),n={...t.c,year:i,month:s,day:Math.min(t.c.day,vr(i,s))+Math.trunc(e.days)+7*Math.trunc(e.weeks)},a=Ri.fromObject({years:e.years-Math.trunc(e.years),quarters:e.quarters-Math.trunc(e.quarters),months:e.months-Math.trunc(e.months),weeks:e.weeks-Math.trunc(e.weeks),days:e.days-Math.trunc(e.days),hours:e.hours,minutes:e.minutes,seconds:e.seconds,milliseconds:e.milliseconds}).as("milliseconds"),o=wr(n);let[l,c]=fs(o,r,t.zone);return 0!==a&&(l+=a,c=t.zone.offset(l)),{ts:l,o:c}}function bs(t,e,r,i,s,n){const{setZone:a,zone:o}=r;if(t&&0!==Object.keys(t).length||e){const i=e||o,s=Ps.fromObject(t,{...r,zone:i,specificOffset:n});return a?s:s.setZone(o)}return Ps.invalid(new Ue("unparsable",`the input "${s}" can't be parsed as ${i}`))}function _s(t,e,r=!0){return t.isValid?Rr.create(Se.create("en-US"),{allowZ:r,forceSimple:!0}).formatDateTimeFromString(t,e):null}function Ss(t,e,r){const i=t.c.year>9999||t.c.year<0;let s="";if(i&&t.c.year>=0&&(s+="+"),s+=dr(t.c.year,i?6:4),"year"===r)return s;if(e){if(s+="-",s+=dr(t.c.month),"month"===r)return s;s+="-"}else if(s+=dr(t.c.month),"month"===r)return s;return s+=dr(t.c.day),s}function $s(t,e,r,i,s,n,a){let o=!r||0!==t.c.millisecond||0!==t.c.second,l="";switch(a){case"day":case"month":case"year":break;default:if(l+=dr(t.c.hour),"hour"===a)break;if(e){if(l+=":",l+=dr(t.c.minute),"minute"===a)break;o&&(l+=":",l+=dr(t.c.second))}else{if(l+=dr(t.c.minute),"minute"===a)break;o&&(l+=dr(t.c.second))}if("second"===a)break;!o||i&&0===t.c.millisecond||(l+=".",l+=dr(t.c.millisecond,3))}return s&&(t.isOffsetFixed&&0===t.offset&&!n?l+="Z":t.o<0?(l+="-",l+=dr(Math.trunc(-t.o/60)),l+=":",l+=dr(Math.trunc(-t.o%60))):(l+="+",l+=dr(Math.trunc(t.o/60)),l+=":",l+=dr(Math.trunc(t.o%60)))),n&&(l+="["+t.zone.ianaName+"]"),l}const xs={month:1,day:1,hour:0,minute:0,second:0,millisecond:0},Ds={weekNumber:1,weekday:1,hour:0,minute:0,second:0,millisecond:0},Cs={ordinal:1,hour:0,minute:0,second:0,millisecond:0},ks=["year","month","day","hour","minute","second","millisecond"],Ts=["weekYear","weekNumber","weekday","hour","minute","second","millisecond"],Os=["year","ordinal","hour","minute","second","millisecond"];function Es(t){const e={year:"year",years:"year",month:"month",months:"month",day:"day",days:"day",hour:"hour",hours:"hour",minute:"minute",minutes:"minute",quarter:"quarter",quarters:"quarter",second:"second",seconds:"second",millisecond:"millisecond",milliseconds:"millisecond",weekday:"weekday",weekdays:"weekday",weeknumber:"weekNumber",weeksnumber:"weekNumber",weeknumbers:"weekNumber",weekyear:"weekYear",weekyears:"weekYear",ordinal:"ordinal"}[t.toLowerCase()];if(!e)throw new kt(t);return e}function Ms(t){switch(t.toLowerCase()){case"localweekday":case"localweekdays":return"localWeekday";case"localweeknumber":case"localweeknumbers":return"localWeekNumber";case"localweekyear":case"localweekyears":return"localWeekYear";default:return Es(t)}}function As(t,e){const r=Ce(e.zone,ze.defaultZone);if(!r.isValid)return Ps.invalid(hs(r));const i=Se.fromObject(e);let s,n;if(rr(t.year))s=ze.now();else{for(const e of ks)rr(t[e])&&(t[e]=xs[e]);const e=tr(t)||er(t);if(e)return Ps.invalid(e);const i=function(t){if(void 0===Is&&(Is=ze.now()),"iana"!==t.type)return t.offset(Is);const e=t.name;let r=Vs.get(e);return void 0===r&&(r=t.offset(Is),Vs.set(e,r)),r}(r);[s,n]=vs(t,i,r)}return new Ps({ts:s,zone:r,loc:i,o:n})}function Ns(t,e,r){const i=!!rr(r.round)||r.round,s=rr(r.rounding)?"trunc":r.rounding,n=(t,n)=>{t=gr(t,i||r.calendary?0:2,r.calendary?"round":s);return e.loc.clone(r).relFormatter(r).format(t,n)},a=i=>r.calendary?e.hasSame(t,i)?0:e.startOf(i).diff(t.startOf(i),i).get(i):e.diff(t,i).get(i);if(r.unit)return n(a(r.unit),r.unit);for(const t of r.units){const e=a(t);if(Math.abs(e)>=1)return n(e,t)}return n(t>e?-0:0,r.units[r.units.length-1])}function Ls(t){let e,r={};return t.length>0&&"object"==typeof t[t.length-1]?(r=t[t.length-1],e=Array.from(t).slice(0,t.length-1)):e=Array.from(t),[r,e]}let Is;const Vs=new Map;class Ps{constructor(t){const e=t.zone||ze.defaultZone;let r=t.invalid||(Number.isNaN(t.ts)?new Ue("invalid input"):null)||(e.isValid?null:hs(e));this.ts=rr(t.ts)?ze.now():t.ts;let i=null,s=null;if(!r){if(t.old&&t.old.ts===this.ts&&t.old.zone.equals(e))[i,s]=[t.old.c,t.old.o];else{const n=ir(t.o)&&!t.old?t.o:e.offset(this.ts);i=ys(this.ts,n),r=Number.isNaN(i.year)?new Ue("invalid input"):null,i=r?null:i,s=r?null:n}}this._zone=e,this.loc=t.loc||Se.create(),this.invalid=r,this.weekData=null,this.localWeekData=null,this.c=i,this.o=s,this.isLuxonDateTime=!0}static now(){return new Ps({})}static local(){const[t,e]=Ls(arguments),[r,i,s,n,a,o,l]=e;return As({year:r,month:i,day:s,hour:n,minute:a,second:o,millisecond:l},t)}static utc(){const[t,e]=Ls(arguments),[r,i,s,n,a,o,l]=e;return t.zone=xe.utcInstance,As({year:r,month:i,day:s,hour:n,minute:a,second:o,millisecond:l},t)}static fromJSDate(t,e={}){const r=function(t){return"[object Date]"===Object.prototype.toString.call(t)}(t)?t.valueOf():NaN;if(Number.isNaN(r))return Ps.invalid("invalid input");const i=Ce(e.zone,ze.defaultZone);return i.isValid?new Ps({ts:r,zone:i,loc:Se.fromObject(e)}):Ps.invalid(hs(i))}static fromMillis(t,e={}){if(ir(t))return t<-ds||t>ds?Ps.invalid("Timestamp out of range"):new Ps({ts:t,zone:Ce(e.zone,ze.defaultZone),loc:Se.fromObject(e)});throw new Tt(`fromMillis requires a numerical input, but received a ${typeof t} with value ${t}`)}static fromSeconds(t,e={}){if(ir(t))return new Ps({ts:1e3*t,zone:Ce(e.zone,ze.defaultZone),loc:Se.fromObject(e)});throw new Tt("fromSeconds requires a numerical input")}static fromObject(t,e={}){t=t||{};const r=Ce(e.zone,ze.defaultZone);if(!r.isValid)return Ps.invalid(hs(r));const i=Se.fromObject(e),s=Cr(t,Ms),{minDaysInFirstWeek:n,startOfWeek:a}=Xe(s,i),o=ze.now(),l=rr(e.specificOffset)?r.offset(o):e.specificOffset,c=!rr(s.ordinal),u=!rr(s.year),d=!rr(s.month)||!rr(s.day),h=u||d,p=s.weekYear||s.weekNumber;if((h||c)&&p)throw new Ct("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(d&&c)throw new Ct("Can't mix ordinal dates with month/day");const m=p||s.weekday&&!h;let g,f,y=ys(o,l);m?(g=Ts,f=Ds,y=Ge(y,n,a)):c?(g=Os,f=Cs,y=Qe(y)):(g=ks,f=xs);let v=!1;for(const t of g){rr(s[t])?s[t]=v?f[t]:y[t]:v=!0}const w=m?function(t,e=4,r=1){const i=sr(t.weekYear),s=ur(t.weekNumber,1,_r(t.weekYear,e,r)),n=ur(t.weekday,1,7);return i?s?!n&&Re("weekday",t.weekday):Re("week",t.weekNumber):Re("weekYear",t.weekYear)}(s,n,a):c?function(t){const e=sr(t.year),r=ur(t.ordinal,1,yr(t.year));return e?!r&&Re("ordinal",t.ordinal):Re("year",t.year)}(s):tr(s),b=w||er(s);if(b)return Ps.invalid(b);const _=m?Je(s,n,a):c?Ke(s):s,[S,$]=vs(_,l,r),x=new Ps({ts:S,zone:r,o:$,loc:i});return s.weekday&&h&&t.weekday!==x.weekday?Ps.invalid("mismatched weekday",`you can't specify both a weekday of ${s.weekday} and a date of ${x.toISO()}`):x.isValid?x:Ps.invalid(x.invalid)}static fromISO(t,e={}){const[r,i]=function(t){return Yr(t,[bi,xi],[_i,Di],[Si,Ci],[$i,ki])}(t);return bs(r,i,e,"ISO 8601",t)}static fromRFC2822(t,e={}){const[r,i]=function(t){return Yr(function(t){return t.replace(/\([^()]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").trim()}(t),[pi,mi])}(t);return bs(r,i,e,"RFC 2822",t)}static fromHTTP(t,e={}){const[r,i]=function(t){return Yr(t,[gi,vi],[fi,vi],[yi,wi])}(t);return bs(r,i,e,"HTTP",e)}static fromFormat(t,e,r={}){if(rr(t)||rr(e))throw new Tt("fromFormat requires an input string and a format");const{locale:i=null,numberingSystem:s=null}=r,n=Se.fromOpts({locale:i,numberingSystem:s,defaultToEN:!0}),[a,o,l,c]=function(t,e,r){const{result:i,zone:s,specificOffset:n,invalidReason:a}=ls(t,e,r);return[i,s,n,a]}(n,t,e);return c?Ps.invalid(c):bs(a,o,r,`format ${e}`,t,l)}static fromString(t,e,r={}){return Ps.fromFormat(t,e,r)}static fromSQL(t,e={}){const[r,i]=function(t){return Yr(t,[Oi,xi],[Ei,Mi])}(t);return bs(r,i,e,"SQL",t)}static invalid(t,e=null){if(!t)throw new Tt("need to specify a reason the DateTime is invalid");const r=t instanceof Ue?t:new Ue(t,e);if(ze.throwOnInvalid)throw new $t(r);return new Ps({invalid:r})}static isDateTime(t){return t&&t.isLuxonDateTime||!1}static parseFormatForOpts(t,e={}){const r=cs(t,Se.fromObject(e));return r?r.map(t=>t?t.val:null).join(""):null}static expandFormat(t,e={}){return as(Rr.parseFormat(t),Se.fromObject(e)).map(t=>t.val).join("")}static resetCache(){Is=void 0,Vs.clear()}get(t){return this[t]}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}get outputCalendar(){return this.isValid?this.loc.outputCalendar:null}get zone(){return this._zone}get zoneName(){return this.isValid?this.zone.name:null}get year(){return this.isValid?this.c.year:NaN}get quarter(){return this.isValid?Math.ceil(this.c.month/3):NaN}get month(){return this.isValid?this.c.month:NaN}get day(){return this.isValid?this.c.day:NaN}get hour(){return this.isValid?this.c.hour:NaN}get minute(){return this.isValid?this.c.minute:NaN}get second(){return this.isValid?this.c.second:NaN}get millisecond(){return this.isValid?this.c.millisecond:NaN}get weekYear(){return this.isValid?ps(this).weekYear:NaN}get weekNumber(){return this.isValid?ps(this).weekNumber:NaN}get weekday(){return this.isValid?ps(this).weekday:NaN}get isWeekend(){return this.isValid&&this.loc.getWeekendDays().includes(this.weekday)}get localWeekday(){return this.isValid?ms(this).weekday:NaN}get localWeekNumber(){return this.isValid?ms(this).weekNumber:NaN}get localWeekYear(){return this.isValid?ms(this).weekYear:NaN}get ordinal(){return this.isValid?Qe(this.c).ordinal:NaN}get monthShort(){return this.isValid?Bi.months("short",{locObj:this.loc})[this.month-1]:null}get monthLong(){return this.isValid?Bi.months("long",{locObj:this.loc})[this.month-1]:null}get weekdayShort(){return this.isValid?Bi.weekdays("short",{locObj:this.loc})[this.weekday-1]:null}get weekdayLong(){return this.isValid?Bi.weekdays("long",{locObj:this.loc})[this.weekday-1]:null}get offset(){return this.isValid?+this.o:NaN}get offsetNameShort(){return this.isValid?this.zone.offsetName(this.ts,{format:"short",locale:this.locale}):null}get offsetNameLong(){return this.isValid?this.zone.offsetName(this.ts,{format:"long",locale:this.locale}):null}get isOffsetFixed(){return this.isValid?this.zone.isUniversal:null}get isInDST(){return!this.isOffsetFixed&&(this.offset>this.set({month:1,day:1}).offset||this.offset>this.set({month:5}).offset)}getPossibleOffsets(){if(!this.isValid||this.isOffsetFixed)return[this];const t=864e5,e=6e4,r=wr(this.c),i=this.zone.offset(r-t),s=this.zone.offset(r+t),n=this.zone.offset(r-i*e),a=this.zone.offset(r-s*e);if(n===a)return[this];const o=r-n*e,l=r-a*e,c=ys(o,n),u=ys(l,a);return c.hour===u.hour&&c.minute===u.minute&&c.second===u.second&&c.millisecond===u.millisecond?[gs(this,{ts:o}),gs(this,{ts:l})]:[this]}get isInLeapYear(){return fr(this.year)}get daysInMonth(){return vr(this.year,this.month)}get daysInYear(){return this.isValid?yr(this.year):NaN}get weeksInWeekYear(){return this.isValid?_r(this.weekYear):NaN}get weeksInLocalWeekYear(){return this.isValid?_r(this.localWeekYear,this.loc.getMinDaysInFirstWeek(),this.loc.getStartOfWeek()):NaN}resolvedLocaleOptions(t={}){const{locale:e,numberingSystem:r,calendar:i}=Rr.create(this.loc.clone(t),t).resolvedOptions(this);return{locale:e,numberingSystem:r,outputCalendar:i}}toUTC(t=0,e={}){return this.setZone(xe.instance(t),e)}toLocal(){return this.setZone(ze.defaultZone)}setZone(t,{keepLocalTime:e=!1,keepCalendarTime:r=!1}={}){if((t=Ce(t,ze.defaultZone)).equals(this.zone))return this;if(t.isValid){let i=this.ts;if(e||r){const e=t.offset(this.ts),r=this.toObject();[i]=vs(r,e,t)}return gs(this,{ts:i,zone:t})}return Ps.invalid(hs(t))}reconfigure({locale:t,numberingSystem:e,outputCalendar:r}={}){return gs(this,{loc:this.loc.clone({locale:t,numberingSystem:e,outputCalendar:r})})}setLocale(t){return this.reconfigure({locale:t})}set(t){if(!this.isValid)return this;const e=Cr(t,Ms),{minDaysInFirstWeek:r,startOfWeek:i}=Xe(e,this.loc),s=!rr(e.weekYear)||!rr(e.weekNumber)||!rr(e.weekday),n=!rr(e.ordinal),a=!rr(e.year),o=!rr(e.month)||!rr(e.day),l=a||o,c=e.weekYear||e.weekNumber;if((l||n)&&c)throw new Ct("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(o&&n)throw new Ct("Can't mix ordinal dates with month/day");let u;s?u=Je({...Ge(this.c,r,i),...e},r,i):rr(e.ordinal)?(u={...this.toObject(),...e},rr(e.day)&&(u.day=Math.min(vr(u.year,u.month),u.day))):u=Ke({...Qe(this.c),...e});const[d,h]=vs(u,this.o,this.zone);return gs(this,{ts:d,o:h})}plus(t){if(!this.isValid)return this;return gs(this,ws(this,Ri.fromDurationLike(t)))}minus(t){if(!this.isValid)return this;return gs(this,ws(this,Ri.fromDurationLike(t).negate()))}startOf(t,{useLocaleWeeks:e=!1}={}){if(!this.isValid)return this;const r={},i=Ri.normalizeUnit(t);switch(i){case"years":r.month=1;case"quarters":case"months":r.day=1;case"weeks":case"days":r.hour=0;case"hours":r.minute=0;case"minutes":r.second=0;case"seconds":r.millisecond=0}if("weeks"===i)if(e){const t=this.loc.getStartOfWeek(),{weekday:e}=this;e<t&&(r.weekNumber=this.weekNumber-1),r.weekday=t}else r.weekday=1;if("quarters"===i){const t=Math.ceil(this.month/3);r.month=3*(t-1)+1}return this.set(r)}endOf(t,e){return this.isValid?this.plus({[t]:1}).startOf(t,e).minus(1):this}toFormat(t,e={}){return this.isValid?Rr.create(this.loc.redefaultToEN(e)).formatDateTimeFromString(this,t):us}toLocaleString(t=Nt,e={}){return this.isValid?Rr.create(this.loc.clone(e),t).formatDateTime(this):us}toLocaleParts(t={}){return this.isValid?Rr.create(this.loc.clone(t),t).formatDateTimeParts(this):[]}toISO({format:t="extended",suppressSeconds:e=!1,suppressMilliseconds:r=!1,includeOffset:i=!0,extendedZone:s=!1,precision:n="milliseconds"}={}){if(!this.isValid)return null;const a="extended"===t;let o=Ss(this,a,n=Es(n));return ks.indexOf(n)>=3&&(o+="T"),o+=$s(this,a,e,r,i,s,n),o}toISODate({format:t="extended",precision:e="day"}={}){return this.isValid?Ss(this,"extended"===t,Es(e)):null}toISOWeekDate(){return _s(this,"kkkk-'W'WW-c")}toISOTime({suppressMilliseconds:t=!1,suppressSeconds:e=!1,includeOffset:r=!0,includePrefix:i=!1,extendedZone:s=!1,format:n="extended",precision:a="milliseconds"}={}){if(!this.isValid)return null;return a=Es(a),(i&&ks.indexOf(a)>=3?"T":"")+$s(this,"extended"===n,e,t,r,s,a)}toRFC2822(){return _s(this,"EEE, dd LLL yyyy HH:mm:ss ZZZ",!1)}toHTTP(){return _s(this.toUTC(),"EEE, dd LLL yyyy HH:mm:ss 'GMT'")}toSQLDate(){return this.isValid?Ss(this,!0):null}toSQLTime({includeOffset:t=!0,includeZone:e=!1,includeOffsetSpace:r=!0}={}){let i="HH:mm:ss.SSS";return(e||t)&&(r&&(i+=" "),e?i+="z":t&&(i+="ZZ")),_s(this,i,!0)}toSQL(t={}){return this.isValid?`${this.toSQLDate()} ${this.toSQLTime(t)}`:null}toString(){return this.isValid?this.toISO():us}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`:`DateTime { Invalid, reason: ${this.invalidReason} }`}valueOf(){return this.toMillis()}toMillis(){return this.isValid?this.ts:NaN}toSeconds(){return this.isValid?this.ts/1e3:NaN}toUnixInteger(){return this.isValid?Math.floor(this.ts/1e3):NaN}toJSON(){return this.toISO()}toBSON(){return this.toJSDate()}toObject(t={}){if(!this.isValid)return{};const e={...this.c};return t.includeConfig&&(e.outputCalendar=this.outputCalendar,e.numberingSystem=this.loc.numberingSystem,e.locale=this.loc.locale),e}toJSDate(){return new Date(this.isValid?this.ts:NaN)}diff(t,e="milliseconds",r={}){if(!this.isValid||!t.isValid)return Ri.invalid("created by diffing an invalid DateTime");const i={locale:this.locale,numberingSystem:this.numberingSystem,...r},s=(o=e,Array.isArray(o)?o:[o]).map(Ri.normalizeUnit),n=t.valueOf()>this.valueOf(),a=Gi(n?this:t,n?t:this,s,i);var o;return n?a.negate():a}diffNow(t="milliseconds",e={}){return this.diff(Ps.now(),t,e)}until(t){return this.isValid?qi.fromDateTimes(this,t):this}hasSame(t,e,r){if(!this.isValid)return!1;const i=t.valueOf(),s=this.setZone(t.zone,{keepLocalTime:!0});return s.startOf(e,r)<=i&&i<=s.endOf(e,r)}equals(t){return this.isValid&&t.isValid&&this.valueOf()===t.valueOf()&&this.zone.equals(t.zone)&&this.loc.equals(t.loc)}toRelative(t={}){if(!this.isValid)return null;const e=t.base||Ps.fromObject({},{zone:this.zone}),r=t.padding?this<e?-t.padding:t.padding:0;let i=["years","months","days","hours","minutes","seconds"],s=t.unit;return Array.isArray(t.unit)&&(i=t.unit,s=void 0),Ns(e,this.plus(r),{...t,numeric:"always",units:i,unit:s})}toRelativeCalendar(t={}){return this.isValid?Ns(t.base||Ps.fromObject({},{zone:this.zone}),this,{...t,numeric:"auto",units:["years","months","days"],calendary:!0}):null}static min(...t){if(!t.every(Ps.isDateTime))throw new Tt("min requires all arguments be DateTimes");return or(t,t=>t.valueOf(),Math.min)}static max(...t){if(!t.every(Ps.isDateTime))throw new Tt("max requires all arguments be DateTimes");return or(t,t=>t.valueOf(),Math.max)}static fromFormatExplain(t,e,r={}){const{locale:i=null,numberingSystem:s=null}=r;return ls(Se.fromOpts({locale:i,numberingSystem:s,defaultToEN:!0}),t,e)}static fromStringExplain(t,e,r={}){return Ps.fromFormatExplain(t,e,r)}static buildFormatParser(t,e={}){const{locale:r=null,numberingSystem:i=null}=e,s=Se.fromOpts({locale:r,numberingSystem:i,defaultToEN:!0});return new os(s,t)}static fromFormatParser(t,e,r={}){if(rr(t)||rr(e))throw new Tt("fromFormatParser requires an input string and a format parser");const{locale:i=null,numberingSystem:s=null}=r,n=Se.fromOpts({locale:i,numberingSystem:s,defaultToEN:!0});if(!n.equals(e.locale))throw new Tt(`fromFormatParser called with a locale of ${n}, but the format parser was created for ${e.locale}`);const{result:a,zone:o,specificOffset:l,invalidReason:c}=e.explainFromTokens(t);return c?Ps.invalid(c):bs(a,o,r,`format ${e.format}`,t,l)}static get DATE_SHORT(){return Nt}static get DATE_MED(){return Lt}static get DATE_MED_WITH_WEEKDAY(){return It}static get DATE_FULL(){return Vt}static get DATE_HUGE(){return Pt}static get TIME_SIMPLE(){return Ft}static get TIME_WITH_SECONDS(){return Ht}static get TIME_WITH_SHORT_OFFSET(){return zt}static get TIME_WITH_LONG_OFFSET(){return Ut}static get TIME_24_SIMPLE(){return Zt}static get TIME_24_WITH_SECONDS(){return jt}static get TIME_24_WITH_SHORT_OFFSET(){return Rt}static get TIME_24_WITH_LONG_OFFSET(){return Wt}static get DATETIME_SHORT(){return qt}static get DATETIME_SHORT_WITH_SECONDS(){return Bt}static get DATETIME_MED(){return Yt}static get DATETIME_MED_WITH_SECONDS(){return Gt}static get DATETIME_MED_WITH_WEEKDAY(){return Jt}static get DATETIME_FULL(){return Qt}static get DATETIME_FULL_WITH_SECONDS(){return Kt}static get DATETIME_HUGE(){return Xt}static get DATETIME_HUGE_WITH_SECONDS(){return te}}function Fs(t){if(Ps.isDateTime(t))return t;if(t&&t.valueOf&&ir(t.valueOf()))return Ps.fromJSDate(t);if(t&&"object"==typeof t)return Ps.fromObject(t);throw new Tt(`Unknown datetime argument: ${t}, of type ${typeof t}`)}const Hs=o`
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
    --primary-light-color: #FFEB3B;
  }
`;class zs{static normalizeStage(t){const e=t.toLowerCase();return"veg"===e?"vegetative":"mom"===e?"mother":e}static getPlantStageColor(t){const e=this.normalizeStage(t);return this.stageColors[e]??"#757575"}static getPlantStageIcon(t){const e=this.normalizeStage(t);return this.stageIcons[e]??bt}static getPlantStage(t){const e=t?.attributes??{},r=new Date;return e.cure_start?"cure":e.dry_start?"dry":e.mom_start?"mother":e.clone_start?"clone":e.flower_start&&new Date(e.flower_start)<=r?"flower":e.veg_start&&new Date(e.veg_start)<=r?"vegetative":"seedling"}static createGridLayout(t,e,r){const i=Array.from({length:e},()=>Array.from({length:r},()=>null));return t.forEach(t=>{const s=(t.attributes?.row??1)-1,n=(t.attributes?.col??1)-1;s>=0&&s<e&&n>=0&&n<r&&(i[s][n]=t)}),{rows:e,cols:r,grid:i}}static calculateEffectiveRows(t){const{name:e,plants:r,plants_per_row:i}=t;if("dry"===e||"cure"===e||"mother"===e||"clone"===e){if(0===r.length)return 1;const t=Math.max(...r.map(t=>t.attributes?.row||1)),e=r.filter(e=>(e.attributes?.row||1)===t).length;return e>=i?t+1:t}return i}static parseDateTimeLocal(t){if(t)try{const e=16===t.length?t+":00":t,r=new Date(e);if(isNaN(r.getTime()))return;const i=r.getFullYear(),s=String(r.getMonth()+1).padStart(2,"0"),n=String(r.getDate()).padStart(2,"0"),a=String(r.getHours()).padStart(2,"0"),o=String(r.getMinutes()).padStart(2,"0");return`${i}-${s}-${n}T${a}:${o}:${String(r.getSeconds()).padStart(2,"0")}`}catch{return}}static formatDateForBackend(t){if(t)try{const e=t.split("T");if(e.length>0&&e[0].match(/^\d{4}-\d{2}-\d{2}$/))return e[0];const r=new Date(t);if(isNaN(r.getTime()))return;const i=r.getFullYear(),s=String(r.getMonth()+1).padStart(2,"0");return`${i}-${s}-${String(r.getDate()).padStart(2,"0")}`}catch{return}}static getCurrentDateTime(){const t=new Date,e=t=>t.toString().padStart(2,"0");return`${t.getFullYear()}-${e(t.getMonth()+1)}-${e(t.getDate())}T${e(t.getHours())}:${e(t.getMinutes())}:00`}static toDateTimeLocal(t){if(!t)return"";try{const e=new Date(t);if(isNaN(e.getTime()))return"";const r=t=>t.toString().padStart(2,"0"),i=e.getFullYear(),s=r(e.getMonth()+1),n=r(e.getDate()),a=r(e.getHours());return`${i}-${s}-${n}T${a}:${r(e.getMinutes())}`}catch{return""}}static getDominantStage(t){if(!t||0===t.length)return null;const e=["cure","dry","flower","vegetative","clone","mother","seedling"];let r=null,i=0;const s={};for(const e of t){const t=this.normalizeStage(e.state||this.getPlantStage(e));s[t]||(s[t]=[]),s[t].push(e)}for(const t of e)if(s[t]&&s[t].length>0){r=t;const e=`${"vegetative"===t?"veg":t}_days`,n=s[t].map(t=>{const r=t.attributes[e];return"number"==typeof r?r:0});i=Math.max(...n);break}return r?{stage:r,days:i}:null}}zs.stageColors={mother:"#E91E63",clone:"#FF5722",seedling:"#4CAF50",vegetative:"#8BC34A",flower:"#FF9800",dry:"#795548",cure:"#9C27B0"},zs.stageIcons={mother:bt,clone:bt,seedling:bt,vegetative:bt,flower:yt,dry:"M22 9A4.32 4.32 0 0 1 19.78 8.45A3.4 3.4 0 0 0 18 8V7A4.32 4.32 0 0 1 20.22 7.55A3.4 3.4 0 0 0 22 8M22 6A3.4 3.4 0 0 1 20.22 5.55A4.32 4.32 0 0 0 18 5V6A3.4 3.4 0 0 1 19.78 6.45A4.32 4.32 0 0 0 22 7M22 10A3.4 3.4 0 0 1 20.22 9.55A4.32 4.32 0 0 0 18 9V10A3.4 3.4 0 0 1 19.78 10.45A4.32 4.32 0 0 0 22 11M10 12.73A70.39 70.39 0 0 0 17 11V4S10.5 2 7.5 2A5.5 5.5 0 0 0 6.12 12.82L7 19H8A3 3 0 0 0 9.46 21.33A3.15 3.15 0 0 1 11 24H12A4.12 4.12 0 0 0 10.09 20.55C9.39 20 9 19.63 9 19H10M7.5 10A2.5 2.5 0 1 1 10 7.5A2.5 2.5 0 0 1 7.5 10Z",cure:mt};class Us{constructor(t){this.hass=t}getGrowspaceDevices(){if(!this.hass)return[];const t=Object.values(this.hass.states),e=t.filter(t=>t.entity_id.startsWith("sensor.")&&void 0!==t.attributes?.growspace_id&&void 0!==t.attributes?.rows&&void 0!==t.attributes?.plants_per_row&&void 0===t.attributes?.row&&void 0===t.attributes?.col),r=new Map;return e.forEach(t=>{const e=t.attributes.growspace_id;r.set(e,[])}),t.forEach(t=>{if(void 0!==t.attributes?.row&&void 0!==t.attributes?.col){const e=this.getGrowspaceId(t);r.has(e)||r.set(e,[]),r.get(e).push(t)}}),Array.from(r.entries()).map(([t,r])=>{const i=e.find(e=>e.attributes?.growspace_id===t),s=i?.attributes?.friendly_name||`Growspace ${t}`,n=i?.attributes?.type??(s.toLowerCase().includes("dry")?"dry":s.toLowerCase().includes("cure")?"cure":"normal");return a={device_id:t,overview_entity_id:i?.entity_id,name:s,plants:r,rows:i?.attributes?.rows??3,plants_per_row:i?.attributes?.plants_per_row??3,type:n},{...a,type:a.type??"normal"};var a})}getGrowspaceId(t){return t.attributes?.growspace_id||"unknown"}getStrainLibrary(){const t=Object.values(this.hass.states).find(t=>void 0!==t.attributes?.strains&&null!==t.attributes?.strains),e=t?.attributes?.strains;if(!e)return[];if(Array.isArray(e))return e.map(t=>({strain:t,phenotype:"",key:`${t}|default`,meta:{}}));if("object"==typeof e){const t=[];for(const[r,i]of Object.entries(e)){const e=i,s=e.analytics,n=e.meta||{};if(e.phenotypes&&"object"==typeof e.phenotypes){const i=Object.entries(e.phenotypes);if(i.length>0)for(const[e,a]of i){const i=a;let o;i.analytics?o=i.analytics:"number"==typeof i.avg_veg_days&&(o={avg_veg_days:i.avg_veg_days,avg_flower_days:i.avg_flower_days,total_harvests:i.total_harvests}),t.push({strain:r,phenotype:e,key:`${r}|${e}`,analytics:o,strain_analytics:s,meta:n})}else t.push({strain:r,phenotype:"",key:`${r}|default`,strain_analytics:s,meta:n})}else t.push({strain:r,phenotype:"",key:`${r}|default`,strain_analytics:s,meta:n})}return t.sort((t,e)=>{const r=t.strain.localeCompare(e.strain);return 0!==r?r:(t.phenotype||"").localeCompare(e.phenotype||"")})}return[]}async getHistory(t,e,r){if(!this.hass)return[];let i=`history/period/${e.toISOString()}?filter_entity_id=${t}`;r&&(i+=`&end_time=${r.toISOString()}`);try{const t=await this.hass.callApi("GET",i);return t&&t.length>0?t[0]:[]}catch(t){return console.error("Error fetching history:",t),[]}}async addPlant(t){console.log("[DataService:addPlant] Sending payload:",t);try{"mother"!==t.growspace_id&&"mother_overview"!==t.growspace_id||(t.mother_start=(new Date).toISOString().split("T")[0]),"clone"!==t.growspace_id&&"clone_overview"!==t.growspace_id||(t.clone_start=(new Date).toISOString().split("T")[0]);const e=await this.hass.callService("growspace_manager","add_plant",t);return console.log("[DataService:addPlant] Response:",e),e}catch(t){throw console.error("[DataService:addPlant] Error:",t),t}}async updatePlant(t){console.log("[DataService:updatePlant] Sending payload:",t);try{const e=await this.hass.callService("growspace_manager","update_plant",t);return console.log("[DataService:updatePlant] Response:",e),e}catch(t){throw console.error("[DataService:updatePlant] Error:",t),t}}async removePlant(t){console.log("[DataService:removePlant] Removing plant_id:",t);try{const e=await this.hass.callService("growspace_manager","remove_plant",{plant_id:t});return console.log("[DataService:removePlant] Response:",e),e}catch(t){throw console.error("[DataService:removePlant] Error:",t),t}}async harvestPlant(t,e="dry"){console.log("[DataService:harvestPlant] Harvesting plant:",t,"→ target:",e);try{const r=(e||"").toLowerCase(),i={plant_id:t};r.includes("dry")?i.target_growspace_id="dry_overview":r.includes("cure")?i.target_growspace_id="cure_overview":r.includes("mother")?i.target_growspace_id="mother_overview":r.includes("clone")?i.target_growspace_id="clone_overview":r&&(i.target_growspace_name=e);const s=await this.hass.callService("growspace_manager","harvest_plant",i);return console.log("[DataService:harvestPlant] Response:",s),s}catch(t){throw console.error("[DataService:harvestPlant] Error:",t),t}}async takeClone(t,e="clone"){console.log("[DataService:takeClone] Cloning plant:",t,"→ target:",e);try{const r=(e||"").toLowerCase(),i={plant_id:t};r.includes("dry")?i.target_growspace_id="dry_overview":r.includes("cure")?i.target_growspace_id="cure_overview":r.includes("mother")?i.target_growspace_id="mother_overview":r.includes("clone")?i.target_growspace_id="clone_overview":r&&(i.target_growspace_name=e);const s=await this.hass.callService("growspace_manager","takeClone",i);return console.log("[DataService:takeClone] Response:",s),s}catch(t){throw console.error("[DataService:takeClone] Error:",t),t}}async swapPlants(t,e){console.log(`[DataService:swapPlants] Swapping plants: ${t} and ${e}`);try{const r=await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e});return console.log("[DataService:swapPlants] Response:",r),r}catch(t){throw console.error("[DataService:swapPlants] Error:",t),t}}async addStrain(t,e){console.log("[DataService:addStrain] Adding strain:",t,e);try{const r=await this.hass.callService("growspace_manager","add_strain",{strain:t,phenotype:e});return console.log("[DataService:addStrain] Response:",r),r}catch(t){throw console.error("[DataService:addStrain] Error:",t),t}}async saveStrain(t,e){console.log("[DataService:saveStrain] Saving strain:",t,e);try{const r=await this.hass.callService("growspace_manager","add_strain",{strain:t,meta:e});return console.log("[DataService:saveStrain] Response:",r),r}catch(t){throw console.error("[DataService:saveStrain] Error:",t),t}}async removeStrain(t,e){console.log("[DataService:removeStrain] Removing strain:",t,e);try{const r=await this.hass.callService("growspace_manager","remove_strain",{strain:t,phenotype:e});return console.log("[DataService:removeStrain] Response:",r),r}catch(t){throw console.error("[DataService:removeStrain] Error:",t),t}}async importStrainLibrary(t){console.log("[DataService:importStrainLibrary] Importing strains:",t);try{const e=await this.hass.callService("growspace_manager","import_strain_library",{strains:t});return console.log("[DataService:importStrainLibrary] Response:",e),e}catch(t){throw console.error("[DataService:importStrainLibrary] Error:",t),t}}async clearStrainLibrary(){console.log("[DataService:clearStrainLibrary] Clearing library");try{const t=await this.hass.callService("growspace_manager","clear_strain_library");return console.log("[DataService:clearStrainLibrary] Response:",t),t}catch(t){throw console.error("[DataService:clearStrainLibrary] Error:",t),t}}}class Zs{static renderAddPlantDialog(t,e,r){if(!t?.open)return j``;const i=[...new Set(e.map(t=>t.strain))].sort();return j`
      <ha-dialog
        open
        @closed=${r.onClose}
        hideActions
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="glass-dialog-container" style="--stage-color: var(--plant-border-color-default)">

          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-title-group">
               <h2 class="dialog-title">Add New Plant</h2>
               <div class="dialog-subtitle">Enter plant details below</div>
            </div>
            <button class="md3-button text" @click=${r.onClose} style="min-width: auto; padding: 8px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                 <path d="${gt}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${Zs.renderMD3SelectInput("Strain *",t.strain||"",i,r.onStrainChange)}
               ${Zs.renderMD3TextInput("Phenotype",t.phenotype||"",r.onPhenotypeChange)}
               <div style="display:flex; gap:16px;">
                 ${Zs.renderMD3NumberInput("Row",t.row+1,t=>r.onRowChange(t))}
                 ${Zs.renderMD3NumberInput("Col",t.col+1,t=>r.onColChange(t))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${Zs.renderMD3DateInput("Vegetative Start",t.veg_start||"",r.onVegStartChange)}
               ${Zs.renderMD3DateInput("Flower Start",t.flower_start||"",r.onFlowerStartChange)}
             </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${r.onClose}>
              Cancel
            </button>
            <button class="md3-button primary" @click=${r.onConfirm}>
              <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${bt}"></path></svg>
              Add Plant
            </button>
          </div>

        </div>
      </ha-dialog>
    `}static renderPlantOverviewDialog(t,e,r){if(!t?.open)return j``;const{plant:i,editedAttributes:s}=t,n=i.attributes?.plant_id||i.entity_id.replace("sensor.",""),a=zs.getPlantStageColor(i.state),o=zs.getPlantStageIcon(i.state),l=(t,e)=>{s[t]="number"==typeof e?e.toString():e,r.onAttributeChange(t,s[t])};return j`
      <ha-dialog
        open
        @closed=${r.onClose}
        hideActions
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="glass-dialog-container" style="--stage-color: ${a}">

          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${o}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
               <h2 class="dialog-title">${s.strain||"Unknown Strain"}</h2>
               <div class="dialog-subtitle">${i.state} Stage • ${s.phenotype||"No Phenotype"}</div>
            </div>
            <button class="md3-button text" @click=${r.onClose} style="min-width: auto; padding: 8px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                 <path d="${gt}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY & LOCATION CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${Zs.renderMD3TextInput("Strain Name",s.strain||"",t=>r.onAttributeChange("strain",t))}
               ${Zs.renderMD3TextInput("Phenotype",s.phenotype||"",t=>r.onAttributeChange("phenotype",t))}
               <div style="display:flex; gap:16px;">
                 ${Zs.renderMD3NumberInput("Row",s.row||1,t=>r.onAttributeChange("row",parseInt(t)))}
                 ${Zs.renderMD3NumberInput("Col",s.col||1,t=>r.onAttributeChange("col",parseInt(t)))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${"mother"===s.stage?Zs.renderMD3DateInput("Mother Start",s.mother_start??"",t=>l("mother_start",t)):W}
               ${"clone"===s.stage?Zs.renderMD3DateInput("Clone Start",s.clone_start??"",t=>l("clone_start",t)):W}
               ${"veg"===s.stage||"flower"===s.stage?Zs.renderMD3DateInput("Vegetative Start",s.veg_start??"",t=>l("veg_start",t)):W}
               ${"flower"===s.stage?Zs.renderMD3DateInput("Flower Start",s.flower_start??"",t=>l("flower_start",t)):W}
               ${"dry"===s.stage||"cure"===s.stage?Zs.renderMD3DateInput("Dry Start",s.dry_start??"",t=>l("dry_start",t)):W}
               ${"cure"===s.stage?Zs.renderMD3DateInput("Cure Start",s.cure_start??"",t=>l("cure_start",t)):W}
             </div>

             <!-- STATS CARD -->
             ${Zs.renderPlantStatsMD3(i)}

          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
             <button class="md3-button danger" @click=${()=>r.onDelete(n)}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"}"></path></svg>
               Delete
             </button>

             <button class="md3-button tonal" @click=${r.onUpdate}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"}"></path></svg>
               Save Changes
             </button>

             <!-- DYNAMIC ACTIONS BASED ON STAGE -->
             ${"mother"===i.state.toLowerCase()?j`
                <div class="take-clone-container" style="display:contents;" data-plant-id="${i.entity_id}">
                  <!-- Ideally this input should be styled nicely too, but for now inline -->
                   <input
                    type="number"
                    min="1"
                    max="10"
                    value="1"
                    class="num-clones-input md3-input"
                    style="width: 60px; height: 40px; background: rgba(255,255,255,0.05); border-radius: 8px; text-align:center; padding:0;"
                  >
                  <button class="md3-button primary"
                    @click=${t=>{const e=t.currentTarget.previousElementSibling,s=e?parseInt(e.value,10):1;r.onTakeClone(i,s)}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"}"></path></svg>
                    Take Clone
                  </button>
                </div>
             `:W}

             ${"flower"===i.state.toLowerCase()?j`
               <button class="md3-button primary" @click=${()=>r.onHarvest(i)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${yt}"></path></svg>
                 Harvest
               </button>
             `:W}

             ${"dry"===i.state.toLowerCase()?j`
               <button class="md3-button primary" @click=${()=>r.onFinishDrying(i)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mt}"></path></svg>
                 Finish Drying
               </button>
             `:W}

             ${"clone"===i.state.toLowerCase()?j`
               <div style="display:contents;">
                  <select class="md3-input" style="width: auto; height: 40px; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 0 16px;" id="clone-target-select">
                    <option value="">Move to...</option>
                    ${Object.entries(e).map(([t,e])=>j`<option value="${t}">${e}</option>`)}
                  </select>
                  <button class="md3-button primary"
                    @click=${t=>{const e=t.currentTarget.previousElementSibling;e.value?r.onMoveClone(i,e.value):alert("Select a growspace")}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"}"></path></svg>
                    Move
                  </button>
               </div>
             `:W}
          </div>

        </div>
      </ha-dialog>
    `}static renderStrainLibraryDialog(t,e){return t?.open?j`
      <ha-dialog
        open
        @closed=${e.onClose}
        hideActions
        class="strain-dialog"
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="glass-dialog-container strain-library-container">
           ${"editor"===t.view?Zs.renderStrainEditor(t,e):Zs.renderLibraryView(t,e)}
        </div>
      </ha-dialog>
    `:j``}static renderLibraryView(t,e){const r=new Map,i=new Map,s=(t.searchQuery||"").toLowerCase();t.strains.forEach(t=>{const e=i.get(t.strain)||0;i.set(t.strain,e+1),r.has(t.strain)||r.set(t.strain,t)});const n=Array.from(r.values()).filter(t=>{const e=t.strain.toLowerCase().includes(s),r=t.meta?.breeder?.toLowerCase().includes(s);return e||r}).sort((t,e)=>t.strain.localeCompare(e.strain));return j`
        <!-- Header -->
        <div class="dialog-header">
           <div class="dialog-title-group">
               <h2 class="dialog-title">STRAIN LIBRARY</h2>
           </div>
           <button class="md3-button text" @click=${e.onClose}>
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${gt}"></path></svg>
           </button>
        </div>

        <!-- Search & Filter Bar -->
        <div class="library-toolbar">
            <div class="search-box">
                <svg class="search-icon" viewBox="0 0 24 24"><path d="${wt}"></path></svg>
                <input
                    type="text"
                    placeholder="Search Strains by Name, Breeder..."
                    .value=${t.searchQuery||""}
                    @input=${t=>e.onSearch(t.target.value)}
                />
                <button class="filter-btn">
                    <svg viewBox="0 0 24 24"><path d="${"M8 13C6.14 13 4.59 14.28 4.14 16H2V18H4.14C4.59 19.72 6.14 21 8 21S11.41 19.72 11.86 18H22V16H11.86C11.41 14.28 9.86 13 8 13M8 19C6.9 19 6 18.1 6 17C6 15.9 6.9 15 8 15S10 15.9 10 17C10 18.1 9.1 19 8 19M19.86 6C19.41 4.28 17.86 3 16 3S12.59 4.28 12.14 6H2V8H12.14C12.59 9.72 14.14 11 16 11S19.41 9.72 19.86 8H22V6H19.86M16 9C14.9 9 14 8.1 14 7C14 5.9 14.9 5 16 5S18 5.9 18 7C18 8.1 17.1 9 16 9Z"}"></path></svg>
                </button>
            </div>

            <!-- Active Filters (Mockup) -->
            <div class="filter-tags">
               <span class="filter-tag">Sativa Dom <span class="close">×</span></span>
               <span class="filter-tag">Under 60 Days <span class="close">×</span></span>
               <span class="clear-all">[Clear All]</span>
            </div>
        </div>

        <!-- Grid of Cards -->
        <div class="strain-grid">
           ${n.map(t=>{const r=i.get(t.strain)||0;return this.renderStrainCard(t,r,e)})}
        </div>

        <!-- Footer Actions -->
        <div class="library-footer">
            <button class="md3-button tonal" @click=${e.onImportCSV}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ft}"></path></svg>
                Import CSV
            </button>
            <button class="md3-button primary" @click=${()=>e.onOpenEditor()}>
                <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"}"></path></svg>
                New Strain
            </button>
        </div>
      `}static renderStrainCard(t,e,r){const i="Indica"===t.meta?.type,s="Sativa"===t.meta?.type;let n=vt;return i&&(n=_t),s&&(n=mt),j`
          <div class="strain-card" @click=${()=>r.onOpenEditor(t)}>
              <div class="card-image-area">
                  ${t.meta?.image?j`<img src="${t.meta.image}" alt="${t.strain}" />`:j`
                        <div class="placeholder-image">
                           <svg viewBox="0 0 24 24"><path d="${mt}"></path></svg>
                        </div>
                     `}

                  ${t.meta?.type?j`
                    <div class="type-badge">
                        <svg viewBox="0 0 24 24"><path d="${n}"></path></svg>
                    </div>
                  `:W}
              </div>
              <div class="card-content">
                  <div class="strain-name">${t.strain}</div>
                  <div class="strain-sub">
                     ${t.meta?.hybrid_ratio||t.meta?.type||"Unknown Type"}
                  </div>

                  <div class="strain-stats">
                     ${t.meta?.flowering_days_min&&t.meta?.flowering_days_max?j`<span>${t.meta.flowering_days_min}-${t.meta.flowering_days_max} Days</span>`:W}
                  </div>

                  <div class="strain-breeder">
                      Breeder: ${t.meta?.breeder||"Unknown"}
                  </div>

                  <div class="pheno-count-badge">
                     ${e>0?`${e} Phenotype${e>1?"s":""}`:"No Phenotypes"}
                  </div>
              </div>
          </div>
      `}static renderStrainEditor(t,e){const r=t.editorState||{};return j`
        <!-- Header -->
        <div class="dialog-header">
           <button class="md3-button text" @click=${e.onCancelEditor} style="padding: 0; min-width: 40px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"}" style="transform: rotate(180deg);"></path></svg>
           </button>
           <div class="dialog-title-group">
               <h2 class="dialog-title">${t.editingStrain?"EDIT STRAIN":"ADD NEW STRAIN"}</h2>
           </div>
           <button class="md3-button text" @click=${e.onClose}>
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${gt}"></path></svg>
           </button>
        </div>

        <div class="editor-content">
            <!-- Left Column -->
            <div class="editor-col left">
                <!-- Photo Upload Area -->
                <div class="photo-upload-area">
                    <div class="upload-placeholder">
                        <svg style="width:48px;height:48px;opacity:0.5;" viewBox="0 0 24 24"><path d="${ft}"></path></svg>
                        <div>PHOTO UPLOAD AREA</div>
                        <div style="font-size: 0.7rem; opacity: 0.5;">(Drag & Drop or Click)</div>
                    </div>
                </div>

                <div class="form-section">
                    ${Zs.renderMD3TextInput("Strain Name *",r.strain||"",t=>e.onEditorChange("strain",t))}
                    ${Zs.renderMD3TextInput("Breeder/Seedbank",r.breeder||"",t=>e.onEditorChange("breeder",t))}
                </div>
            </div>

            <!-- Right Column -->
            <div class="editor-col right">
                <div class="form-section">
                    <label class="section-label">Type *</label>
                    <div class="type-selector">
                        ${Zs.renderTypeOption("Indica",_t,"Indica"===r.type,()=>e.onEditorChange("type","Indica"))}
                        ${Zs.renderTypeOption("Sativa",mt,"Sativa"===r.type,()=>e.onEditorChange("type","Sativa"))}
                        ${Zs.renderTypeOption("Hybrid",vt,"Hybrid"===r.type,()=>e.onEditorChange("type","Hybrid"))}
                        ${Zs.renderTypeOption("Ruderalis",bt,"Ruderalis/Auto"===r.type,()=>e.onEditorChange("type","Ruderalis/Auto"))}
                    </div>
                </div>

                ${"Hybrid"===r.type?j`
                <div class="form-section">
                    <label class="section-label">Hybrid Dominance</label>
                    <select class="md3-input" .value=${r.hybrid_ratio||""} @change=${t=>e.onEditorChange("hybrid_ratio",t.target.value)}>
                        <option value="">Select Dominance...</option>
                        <option value="Sativa Dom">Sativa Dominant</option>
                        <option value="Indica Dom">Indica Dominant</option>
                        <option value="Balanced">Balanced (50/50)</option>
                    </select>
                </div>
                `:W}

                <div class="form-section">
                    <label class="section-label">Flowering Time (Days) [Min] - [Max]</label>
                    <div style="display: flex; gap: 16px;">
                        <input type="number" class="md3-input" placeholder="Min" .value=${r.flowering_min||""} @input=${t=>e.onEditorChange("flowering_min",t.target.value)}>
                        <span style="align-self:center;">-</span>
                        <input type="number" class="md3-input" placeholder="Max" .value=${r.flowering_max||""} @input=${t=>e.onEditorChange("flowering_max",t.target.value)}>
                    </div>
                </div>

                <div class="form-section">
                   ${Zs.renderMD3TextInput("Lineage / Parents",r.lineage||"",t=>e.onEditorChange("lineage",t))}
                </div>

                <div class="form-section">
                    <label class="section-label">Sex Setup</label>
                    <div class="checkbox-group">
                        <label>
                           <input type="checkbox" ?checked=${"Feminized"===r.sex} @change=${()=>e.onEditorChange("sex","Feminized")}> Feminized
                        </label>
                        <label>
                           <input type="checkbox" ?checked=${"Regular"===r.sex} @change=${()=>e.onEditorChange("sex","Regular")}> Regular
                        </label>
                    </div>
                </div>

                <div class="form-section">
                    <label class="section-label">Description / Grower Notes</label>
                    <textarea class="md3-input" rows="4" @input=${t=>e.onEditorChange("description",t.target.value)} .value=${r.description||""}></textarea>
                </div>
            </div>
        </div>

        <div class="dialog-footer">
            <button class="md3-button tonal" @click=${e.onCancelEditor}>Cancel</button>
            <button class="md3-button primary" @click=${e.onSave}>+ Save</button>
        </div>
     `}static renderTypeOption(t,e,r,i){return j`
         <div class="type-option ${r?"selected":""}" @click=${i}>
             <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${e}"></path></svg>
             <span>${t}</span>
             ${r?j`<div class="selection-dot"></div>`:W}
         </div>
      `}static renderMD3TextInput(t,e,r){return j`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="text"
          class="md3-input"
          .value=${e}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderMD3SelectInput(t,e,r,i){return j`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <select
          class="md3-input"
          .value=${e}
          @change=${t=>i(t.target.value)}
        >
          <option value="">Select...</option>
          ${r.map(t=>j`<option value="${t}" ?selected=${t===e}>${t}</option>`)}
        </select>
      </div>
    `}static renderMD3NumberInput(t,e,r){return j`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="number"
          class="md3-input"
          min="1"
          .value=${e}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderMD3DateInput(t,e,r){const i=zs.toDateTimeLocal(e);return j`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="datetime-local"
          class="md3-input"
          .value=${i}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderPlantStatsMD3(t){return t.attributes?.veg_days||t.attributes?.flower_days||t.attributes?.dry_days||t.attributes?.cure_days?j`
      <div class="detail-card">
        <h3>Current Progress</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
           ${t.attributes?.veg_days?j`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-veg);">${t.attributes.veg_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Veg Days</span>
             </div>
           `:""}
           ${t.attributes?.flower_days?j`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-flower);">${t.attributes.flower_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Flower Days</span>
             </div>
           `:""}
           ${t.attributes?.dry_days?j`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-dry);">${t.attributes.dry_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Drying Days</span>
             </div>
           `:""}
           ${t.attributes?.cure_days?j`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-cure);">${t.attributes.cure_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Curing Days</span>
             </div>
           `:""}
        </div>
      </div>
    `:j``}}let js=class extends ot{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._strainLibraryDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1,this._historyData=null,this._lightCycleCollapsed=!0,this._activeEnvGraphs=new Set,this._tooltip=null,this._handleTakeClone=t=>{const e=t.attributes?.plant_id||t.entity_id.replace("sensor.","");this.hass.callService("growspace_manager","take_clone",{mother_plant_id:e}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})},this.clonePlant=(t,e)=>{const r=t.attributes?.plant_id||t.entity_id.replace("sensor.",""),i=e;this.hass.callService("growspace_manager","take_clone",{mother_plant_id:r,num_clones:i}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})}}firstUpdated(){this.dataService=new Us(this.hass),this.initializeSelectedDevice(),this._fetchHistory()}updated(t){super.updated(t),t.has("selectedDevice")&&this._fetchHistory()}async _fetchHistory(){if(!this.hass||!this.selectedDevice)return;const t=this.dataService.getGrowspaceDevices().find(t=>t.device_id===this.selectedDevice);if(!t)return;let e=t.name.toLowerCase().replace(/\s+/g,"_");t.overview_entity_id&&(e=t.overview_entity_id.replace("sensor.",""));const r=`binary_sensor.${e}_optimal_conditions`,i=new Date,s=new Date(i.getTime()-864e5);try{const t=await this.dataService.getHistory(r,s,i);this._historyData=t}catch(t){console.error("Failed to fetch history",t)}}initializeSelectedDevice(){const t=this.dataService.getGrowspaceDevices();if(t.length&&!this.selectedDevice){if(this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);if(e)return void(this.selectedDevice=e.device_id)}this.selectedDevice=t[0].device_id}}static async getConfigElement(){await Promise.resolve().then(function(){return Ws});return document.createElement("growspace-manager-card-editor")}static getStubConfig(){return{default_growspace:"4x4",compact:!0}}setConfig(t){if(!t)throw new Error("Invalid configuration");this._config=t,void 0!==this._config.compact&&(this._isCompactView=this._config.compact)}getCardSize(){return 4}_handleDeviceChange(t){const e=t.target;this.selectedDevice=e.value}_handlePlantClick(t){this._plantOverviewDialog={open:!0,plant:t,editedAttributes:{...t.attributes}}}getHaDateTimeString(){const t=this.hass.config.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone;return Ps.now().setZone(t).toFormat("yyyy-LL-dd'T'HH:mm")}_openAddPlantDialog(t,e){const r=this.getHaDateTimeString(),i=this.dataService.getStrainLibrary(),s=i.length>0?i[0].strain:"",n=i.length>0?i[0].phenotype:"";this._addPlantDialog={open:!0,row:t,col:e,strain:s,phenotype:n,veg_start:r,flower_start:r}}async _confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const{row:t,col:e,strain:r,phenotype:i,veg_start:s,flower_start:n}=this._addPlantDialog;try{const a={growspace_id:this.selectedDevice,row:t+1,col:e+1,strain:r,phenotype:i,veg_start:zs.formatDateForBackend(s)??zs.formatDateForBackend(zs.getCurrentDateTime()),flower_start:zs.formatDateForBackend(n)??zs.formatDateForBackend(zs.getCurrentDateTime())};console.log("Adding plant to growspace:",this.selectedDevice,a),console.log("Adding plant:",a),await this.dataService.addPlant(a),this._addPlantDialog=null}catch(t){console.error("Error adding plant:",t)}}async _updatePlant(){if(!this._plantOverviewDialog)return;const{plant:t,editedAttributes:e}=this._plantOverviewDialog,r={plant_id:t.attributes?.plant_id||t.entity_id.replace("sensor.","")},i=["seedling_start","mother_start","clone_start","veg_start","flower_start","dry_start","cure_start"];["strain","phenotype","row","col",...i].forEach(t=>{if(void 0!==e[t]&&null!==e[t])if(i.includes(t)){const i=zs.formatDateForBackend(String(e[t]));i&&(r[t]=i)}else r[t]=e[t]});try{await this.dataService.updatePlant(r),this._plantOverviewDialog=null}catch(t){console.error("Error updating plant:",t)}}async _handleDeletePlant(t){if(confirm("Are you sure you want to delete this plant?"))try{await this.dataService.removePlant(t),this._plantOverviewDialog=null}catch(t){console.error("Error deleting plant:",t)}}async _movePlantToNextStage(t){if(!this._plantOverviewDialog?.plant)return void console.error("No plant found in overview dialog");const e=this._plantOverviewDialog.plant,r=e.attributes?.stage;let i="";const s=new Set(["mother","flower","dry","cure"]);if(r&&s.has(r)){"flower"===r?i="dry":"dry"===r?i="cure":"mother"===r?i="clone":(console.error("Unknown stage, cannot move plant",i),i="error");try{const t=e.attributes?.plant_id||e.entity_id.replace("sensor.","");await this.dataService.harvestPlant(t,i),this._plantOverviewDialog=null}catch(t){console.error("Error moving plant to next stage:",t)}}else alert("Plant must be in mother or flower or dry or cure stage to move. stage is "+r)}async _harvestPlant(t){await this._movePlantToNextStage(t)}async _finishDryingPlant(t){await this._movePlantToNextStage(t)}_toggleLightCycle(){this._lightCycleCollapsed=!this._lightCycleCollapsed}_toggleEnvGraph(t){const e=new Set(this._activeEnvGraphs);e.has(t)?e.delete(t):e.add(t),this._activeEnvGraphs=e,this.requestUpdate()}_handleGraphHover(t,e,r,i,s){const n=t.clientX-i.left,a=i.width,o=new Date,l=new Date(o.getTime()-864e5).getTime(),c=l+n/a*(o.getTime()-l);let u=r[0],d=Math.abs(c-u.time);for(let t=1;t<r.length;t++){const e=Math.abs(c-r[t].time);e<d&&(d=e,u=r[t])}const h=new Date(c).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).toLowerCase();let p=`${u.value} ${s}`;"state"===s&&(p=1===u.value?"ON":"OFF"),this._tooltip={id:e,x:n,time:h,value:p}}_openStrainLibraryDialog(){const t=this.dataService.getStrainLibrary();this._strainLibraryDialog={open:!0,view:"library",newStrain:"",newPhenotype:"",strains:t,searchQuery:"",activeFilters:[],expandedStrains:[],confirmClearAll:!1}}_openStrainEditor(t){this._strainLibraryDialog&&(this._strainLibraryDialog.view="editor",this._strainLibraryDialog.editingStrain=t,this._strainLibraryDialog.editorState=t?{strain:t.strain,breeder:t.meta?.breeder||"",type:t.meta?.type||"",hybrid_ratio:t.meta?.hybrid_ratio||"",flowering_min:t.meta?.flowering_days_min||0,flowering_max:t.meta?.flowering_days_max||0,lineage:t.meta?.lineage||"",sex:t.meta?.sex||"",description:t.meta?.description||"",image:t.meta?.image||""}:{strain:"",breeder:"",type:"",hybrid_ratio:"",flowering_min:0,flowering_max:0,lineage:"",sex:"",description:"",image:""},this.requestUpdate())}_cancelEdit(){this._strainLibraryDialog&&(this._strainLibraryDialog.view="library",this._strainLibraryDialog.editingStrain=void 0,this._strainLibraryDialog.editorState=void 0,this.requestUpdate())}async _saveStrain(){if(!this._strainLibraryDialog||!this._strainLibraryDialog.editorState)return;const t=this._strainLibraryDialog.editorState;if(!t.strain)return void alert("Strain Name is required");const e={breeder:t.breeder,type:t.type,hybrid_ratio:t.hybrid_ratio,flowering_days_min:t.flowering_min,flowering_days_max:t.flowering_max,lineage:t.lineage,sex:t.sex,description:t.description,image:t.image};try{await this.dataService.saveStrain(t.strain,e),this._cancelEdit(),setTimeout(()=>{this._strainLibraryDialog.strains=this.dataService.getStrainLibrary(),this.requestUpdate()},1e3)}catch(t){console.error("Error saving strain:",t),alert("Failed to save strain. Check logs.")}}_handleEditorChange(t,e){this._strainLibraryDialog?.editorState&&(this._strainLibraryDialog.editorState[t]=e,this.requestUpdate())}_setStrainSearchQuery(t){this._strainLibraryDialog&&(this._strainLibraryDialog.searchQuery=t,this.requestUpdate())}_handleImportCSV(){alert("CSV Import/Export feature coming soon!")}async _removeStrain(t){if(this._strainLibraryDialog)try{const e=t.split("|"),r=e[0],i=e.length>1&&"default"!==e[1]?e[1]:void 0;await this.dataService.removeStrain(r,i),this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e.key!==t),this.requestUpdate()}catch(t){console.error("Error removing strain:",t)}}renderEnvGraph(t,e,r,i){if(!this._historyData||0===this._historyData.length)return j``;const s=[...this._historyData].sort((t,e)=>new Date(t.last_changed).getTime()-new Date(e.last_changed).getTime()),n=new Date,a=new Date(n.getTime()-864e5),o=[];if(s.forEach(e=>{const r=new Date(e.last_changed).getTime();if(r<a.getTime())return;const i=((t,e)=>{if(t&&t.attributes)return void 0!==t.attributes[e]?t.attributes[e]:t.attributes.observations&&"object"==typeof t.attributes.observations?t.attributes.observations[e]:void 0})(e,t);void 0===i||isNaN(parseFloat(i))||o.push({time:r,value:parseFloat(i)})}),o.length<2)return j``;const l=Math.min(...o.map(t=>t.value)),c=Math.max(...o.map(t=>t.value)),u=c-l||1,d=l-.1*u,h=c+.1*u-d,p=o.map(t=>[(t.time-a.getTime())/864e5*1e3,100-(t.value-d)/h*100]),m=`M ${p.map(t=>`${t[0]},${t[1]}`).join(" L ")}`;return j`
      <div class="gs-light-cycle-card" style="margin-top: 12px; border: 1px solid ${e}40;">
         <div class="gs-light-header-row" @click=${()=>this._toggleEnvGraph(t)}>
             <div class="gs-light-title" style="font-size: 1.2rem;">
                 <div class="gs-icon-box" style="color: ${e}; background: ${e}10; border-color: ${e}30; width: 36px; height: 36px;">
                      <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${wt}"></path></svg>
                 </div>
                 <div>
                    <div>${r}</div>
                    <div class="gs-light-subtitle">24H HISTORY • ${l.toFixed(1)} - ${c.toFixed(1)} ${i}</div>
                 </div>
             </div>
             <div style="opacity: 0.7;">
                <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"}"></path></svg>
             </div>
         </div>

         <div class="gs-chart-container" style="height: 100px;"
              @mousemove=${e=>{const r=e.currentTarget.getBoundingClientRect();this._handleGraphHover(e,t,o,r,i)}}
              @mouseleave=${()=>this._tooltip=null}>

             ${this._tooltip&&this._tooltip.id===t?j`
                 <div class="gs-cursor-line" style="left: ${this._tooltip.x}px;"></div>
                 <div class="gs-tooltip" style="left: ${this._tooltip.x}px;">
                    <div class="time">${this._tooltip.time}</div>
                    <div>${this._tooltip.value}</div>
                 </div>
             `:""}

             <svg class="gs-chart-svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
                 <defs>
                     <linearGradient id="grad-${t}" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" style="stop-color:${e};stop-opacity:0.5" />
                         <stop offset="100%" style="stop-color:${e};stop-opacity:0" />
                     </linearGradient>
                 </defs>
                 <path class="chart-line" d="${m}" style="stroke: ${e};" />
                 <path class="chart-gradient-fill" d="${m} V 100 H 0 Z" style="fill: url(#grad-${t});" />
             </svg>
             <div class="chart-markers">
                <span>-24H</span>
                <span>NOW</span>
             </div>
         </div>
      </div>
    `}renderDialogs(){const t=this.dataService?.getStrainLibrary()||[],e={},r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;return r&&Object.entries(r).forEach(([t,r])=>{e[t]=r}),j`
      ${Zs.renderAddPlantDialog(this._addPlantDialog,t,{onClose:()=>this._addPlantDialog=null,onConfirm:()=>this._confirmAddPlant(),onStrainChange:e=>{if(this._addPlantDialog){this._addPlantDialog.strain=e;const r=t.find(t=>t.strain===e);r&&r.phenotype?this._addPlantDialog.phenotype=r.phenotype:this._addPlantDialog.phenotype="",this.requestUpdate()}},onPhenotypeChange:t=>{this._addPlantDialog&&(this._addPlantDialog.phenotype=t)},onVegStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.veg_start=t)},onFlowerStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.flower_start=t)},onRowChange:t=>{if(this._addPlantDialog){const e=parseInt(t);!isNaN(e)&&e>0&&(this._addPlantDialog.row=e-1,this.requestUpdate())}},onColChange:t=>{if(this._addPlantDialog){const e=parseInt(t);!isNaN(e)&&e>0&&(this._addPlantDialog.col=e-1,this.requestUpdate())}}})}

      ${Zs.renderPlantOverviewDialog(this._plantOverviewDialog,e,{onClose:()=>this._plantOverviewDialog=null,onUpdate:()=>{this._updatePlant()},onDelete:t=>{this._handleDeletePlant(t)},onHarvest:t=>{this._harvestPlant(t)},onClone:(t,e)=>{this.clonePlant(t,e)},onTakeClone:(t,e)=>{this.clonePlant(t,e)},onMoveClone:(t,e)=>{this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Clone ${t.attributes.friendly_name} moved to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})},onFinishDrying:t=>{this._finishDryingPlant(t)},_harvestPlant:this._harvestPlant.bind(this),_finishDryingPlant:this._finishDryingPlant.bind(this),onAttributeChange:(t,e)=>{this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes[t]=e)}})}

      ${Zs.renderStrainLibraryDialog(this._strainLibraryDialog,{onClose:()=>this._strainLibraryDialog=null,onOpenEditor:t=>this._openStrainEditor(t),onSave:()=>this._saveStrain(),onCancelEditor:()=>this._cancelEdit(),onSearch:t=>this._setStrainSearchQuery(t),onEditorChange:(t,e)=>this._handleEditorChange(t,e),onRemoveStrain:(t,e)=>this._removeStrain(`${t}|${e||"default"}`),onImportCSV:()=>this._handleImportCSV()})}
    `}};js.styles=[Hs,o`
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

      /* Unified Card Container - Glassmorphism & Gradient */
      .unified-growspace-card {
        background: rgba(30, 30, 35, 0.6);
        background-image: linear-gradient(135deg, rgba(50, 50, 60, 0.8) 0%, rgba(40, 30, 60, 0.8) 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);

        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: #fff;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      }

      /* Strain Library Redesign Styles */
      .strain-library-container {
         width: 90vw;
         max-width: 1000px;
         height: 80vh;
         display: flex;
         flex-direction: column;
         background: linear-gradient(135deg, #1E2328 0%, #171A1E 100%); /* Deep Charcoal */
         border: 1px solid #333;
         position: relative;
         overflow: hidden;
      }

      .library-toolbar {
         display: flex;
         flex-direction: column;
         gap: 16px;
         margin-bottom: 24px;
      }

      .search-box {
         position: relative;
         display: flex;
         align-items: center;
         background: rgba(255, 255, 255, 0.05);
         border: 1px solid rgba(255, 255, 255, 0.1);
         border-radius: 12px;
         padding: 0 16px;
      }
      .search-box input {
         flex: 1;
         background: transparent;
         border: none;
         color: #fff;
         padding: 12px 8px;
         font-size: 1rem;
      }
      .search-box input:focus { outline: none; }
      .search-box .search-icon { width: 20px; height: 20px; opacity: 0.5; }
      .search-box .filter-btn {
         background: transparent;
         border: none;
         color: #fff;
         opacity: 0.7;
         cursor: pointer;
         padding: 8px;
      }

      .filter-tags {
         display: flex;
         gap: 8px;
         flex-wrap: wrap;
         align-items: center;
      }
      .filter-tag {
         background: rgba(255, 255, 255, 0.1);
         border-radius: 16px;
         padding: 4px 12px;
         font-size: 0.85rem;
         display: flex;
         align-items: center;
         gap: 6px;
         cursor: pointer;
      }
      .filter-tag .close { opacity: 0.5; font-size: 1.1em; }
      .clear-all {
         font-size: 0.85rem;
         color: var(--primary-color);
         cursor: pointer;
         opacity: 0.8;
      }

      .strain-grid {
         display: grid;
         grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
         gap: 16px;
         overflow-y: auto;
         padding-right: 4px;
         flex: 1;
      }

      .strain-card {
         background: rgba(255, 255, 255, 0.03);
         border: 1px solid rgba(255, 255, 255, 0.05);
         border-radius: 16px;
         overflow: hidden;
         cursor: pointer;
         transition: all 0.2s;
         display: flex;
         flex-direction: column;
      }
      .strain-card:hover {
         transform: translateY(-4px);
         box-shadow: 0 8px 24px rgba(0,0,0,0.3);
         border-color: var(--primary-color);
      }

      .card-image-area {
         height: 140px;
         background: rgba(0,0,0,0.2);
         position: relative;
         display: flex;
         align-items: center;
         justify-content: center;
      }
      .card-image-area img {
         width: 100%;
         height: 100%;
         object-fit: cover;
      }
      .placeholder-image {
         opacity: 0.2;
         width: 48px;
         height: 48px;
      }
      .type-badge {
         position: absolute;
         bottom: 8px;
         right: 8px;
         width: 28px;
         height: 28px;
         background: rgba(0,0,0,0.6);
         border-radius: 50%;
         display: flex;
         align-items: center;
         justify-content: center;
         color: var(--primary-color);
         backdrop-filter: blur(4px);
      }
      .type-badge svg { width: 16px; height: 16px; }

      .card-content {
         padding: 16px;
         display: flex;
         flex-direction: column;
         gap: 6px;
      }
      .strain-name {
         font-weight: 600;
         font-size: 1.1rem;
         color: #fff;
      }
      .strain-sub {
         font-size: 0.85rem;
         opacity: 0.6;
      }
      .strain-stats {
         font-size: 0.8rem;
         font-weight: 500;
         color: #fff;
         margin-top: 4px;
      }
      .strain-breeder {
         font-size: 0.75rem;
         opacity: 0.5;
         margin-top: auto;
      }
      .pheno-count-badge {
         font-size: 0.75rem;
         background: rgba(255,255,255,0.05);
         padding: 2px 8px;
         border-radius: 4px;
         width: fit-content;
         margin-top: 8px;
         color: rgba(255,255,255,0.7);
      }

      .library-footer {
         margin-top: 16px;
         padding-top: 16px;
         border-top: 1px solid rgba(255,255,255,0.05);
         display: flex;
         justify-content: space-between;
      }

      /* Editor Styles */
      .editor-content {
         display: grid;
         grid-template-columns: 1fr 1.5fr;
         gap: 32px;
         flex: 1;
         overflow-y: auto;
         padding-right: 8px;
      }
      .editor-col {
         display: flex;
         flex-direction: column;
         gap: 24px;
      }
      .photo-upload-area {
         width: 100%;
         aspect-ratio: 4/3;
         background: rgba(255,255,255,0.03);
         border: 2px dashed rgba(255,255,255,0.1);
         border-radius: 16px;
         display: flex;
         align-items: center;
         justify-content: center;
         cursor: pointer;
         transition: border-color 0.2s;
      }
      .photo-upload-area:hover {
         border-color: var(--primary-color);
         background: rgba(255,255,255,0.05);
      }
      .upload-placeholder {
         display: flex;
         flex-direction: column;
         align-items: center;
         gap: 8px;
         color: #fff;
         font-weight: 500;
         text-align: center;
      }

      .form-section {
         display: flex;
         flex-direction: column;
         gap: 8px;
      }
      .section-label {
         font-size: 0.85rem;
         opacity: 0.7;
         margin-left: 4px;
      }

      .type-selector {
         display: grid;
         grid-template-columns: 1fr 1fr;
         gap: 12px;
      }
      .type-option {
         background: rgba(255,255,255,0.05);
         border: 1px solid rgba(255,255,255,0.05);
         border-radius: 12px;
         padding: 12px;
         display: flex;
         align-items: center;
         gap: 10px;
         cursor: pointer;
         position: relative;
         transition: all 0.2s;
      }
      .type-option:hover { background: rgba(255,255,255,0.08); }
      .type-option.selected {
         background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.15);
         border-color: var(--primary-color);
         color: #fff;
      }
      .selection-dot {
         width: 8px;
         height: 8px;
         background: var(--primary-color);
         border-radius: 50%;
         margin-left: auto;
         box-shadow: 0 0 8px var(--primary-color);
      }

      .dialog-footer {
         margin-top: 24px;
         display: flex;
         justify-content: flex-end;
         gap: 12px;
      }

      @media (max-width: 768px) {
         .strain-library-container {
             width: 100vw;
             height: 100vh;
             border-radius: 0;
             border: none;
         }
         .editor-content {
             grid-template-columns: 1fr;
         }
         .strain-grid {
             grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
         }
      }

      /* Existing styles... */
      
      /* ... (Keep previous styles for main card, dialog container glass, etc.) */
      /* Unified Card Container - Glassmorphism & Gradient */
      .unified-growspace-card {
        background: rgba(30, 30, 35, 0.6);
        background-image: linear-gradient(135deg, rgba(50, 50, 60, 0.8) 0%, rgba(40, 30, 60, 0.8) 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: #fff;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      }

      .gs-stats-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .gs-header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: var(--spacing-md);
      }
      /* ... Rest of existing styles */
    `],t([pt(),e("design:type",Object)],js.prototype,"_addPlantDialog",void 0),t([pt(),e("design:type",Object)],js.prototype,"_defaultApplied",void 0),t([pt(),e("design:type",Object)],js.prototype,"_plantOverviewDialog",void 0),t([pt(),e("design:type",Object)],js.prototype,"_strainLibraryDialog",void 0),t([pt(),e("design:type",Object)],js.prototype,"selectedDevice",void 0),t([pt(),e("design:type",Object)],js.prototype,"_draggedPlant",void 0),t([pt(),e("design:type",Boolean)],js.prototype,"_isCompactView",void 0),t([pt(),e("design:type",Object)],js.prototype,"_historyData",void 0),t([pt(),e("design:type",Boolean)],js.prototype,"_lightCycleCollapsed",void 0),t([pt(),e("design:type",Set)],js.prototype,"_activeEnvGraphs",void 0),t([pt(),e("design:type",Object)],js.prototype,"_tooltip",void 0),t([ht({attribute:!1}),e("design:type",Object)],js.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],js.prototype,"_config",void 0),js=t([ct("growspace-manager-card")],js);let Rs=class extends ot{constructor(){super(...arguments),this._growspaceOptions=[]}setConfig(t){this._config=t,this._loadGrowspaces()}updated(t){t.has("hass")&&this.hass&&(this._loadGrowspaces(),this._subscribeToSensorUpdates())}disconnectedCallback(){super.disconnectedCallback(),this._unsubStateChanged&&(this._unsubStateChanged(),this._unsubStateChanged=void 0)}_subscribeToSensorUpdates(){this.hass&&!this._unsubStateChanged&&(this._unsubStateChanged=this.hass.connection.subscribeEvents(t=>{const e=t.data.new_state;"sensor.growspaces_list"===e?.entity_id&&(Array.isArray(e.attributes?.growspaces)?this._growspaceOptions=e.attributes.growspaces:this._growspaceOptions=[])},"state_changed"))}_loadGrowspaces(){if(!this.hass)return;const t=this.hass.states["sensor.growspaces_list"];if(t&&t.attributes?.growspaces){const e=t.attributes.growspaces;this._growspaceOptions=Object.values(e)}else this._growspaceOptions=[]}render(){return this._config?j`
      <div class="form-group">
        <label>Default Growspace</label>
        <select
          .value=${this._config.default_growspace??""}
          @change=${t=>this._valueChanged("default_growspace",t.target.value)}
        >
          <option value="">Select a growspace</option>
          ${0===this._growspaceOptions.length?j`<option disabled>No growspaces found</option>`:this._growspaceOptions.map(t=>j`<option value="${t}">${t}</option>`)}
        </select>
      </div>
    `:j``}_valueChanged(t,e){if(!this._config)return;const r={...this._config,[t]:e};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:r},bubbles:!0,composed:!0}))}};Rs.styles=o`
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
  `,t([ht({attribute:!1}),e("design:type",Object)],Rs.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],Rs.prototype,"_config",void 0),t([pt(),e("design:type",Array)],Rs.prototype,"_growspaceOptions",void 0),Rs=t([ct("growspace-manager-card-editor")],Rs);var Ws=Object.freeze({__proto__:null,get GrowspaceManagerCardEditor(){return Rs}});export{js as GrowspaceManagerCard};
