function t(t,e,r,a){var s,i=arguments.length,n=i<3?e:null===a?a=Object.getOwnPropertyDescriptor(e,r):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,r,a);else for(var o=t.length-1;o>=0;o--)(s=t[o])&&(n=(i<3?s(n):i>3?s(e,r,n):s(e,r))||n);return i>3&&n&&Object.defineProperty(e,r,n),n}function e(t,e){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(t,e)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const r=globalThis,a=r.ShadowRoot&&(void 0===r.ShadyCSS||r.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),i=new WeakMap;class n{constructor(t,e,r){if(this._$cssResult$=!0,r!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(a&&void 0===t){const r=void 0!==e&&1===e.length;r&&(t=i.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),r&&i.set(e,t))}return t}toString(){return this.cssText}}const o=(t,...e)=>{const r=1===t.length?t[0]:e.reduce((e,r,a)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+t[a+1],t[0]);return new n(r,t,s)},l=a?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const r of t.cssRules)e+=r.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,s))(e)})(t):t,{is:c,defineProperty:d,getOwnPropertyDescriptor:u,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:g}=Object,m=globalThis,f=m.trustedTypes,y=f?f.emptyScript:"",v=m.reactiveElementPolyfillSupport,b=(t,e)=>t,w={toAttribute(t,e){switch(e){case Boolean:t=t?y:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let r=t;switch(e){case Boolean:r=null!==t;break;case Number:r=null===t?null:Number(t);break;case Object:case Array:try{r=JSON.parse(t)}catch(t){r=null}}return r}},_=(t,e)=>!c(t,e),x={attribute:!0,type:String,converter:w,reflect:!1,useDefault:!1,hasChanged:_};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;class S extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=x){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const r=Symbol(),a=this.getPropertyDescriptor(t,r,e);void 0!==a&&d(this.prototype,t,a)}}static getPropertyDescriptor(t,e,r){const{get:a,set:s}=u(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:a,set(e){const i=a?.call(this);s?.call(this,e),this.requestUpdate(t,i,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??x}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const t=g(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const t=this.properties,e=[...h(t),...p(t)];for(const r of e)this.createProperty(r,t[r])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,r]of e)this.elementProperties.set(t,r)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const r=this._$Eu(t,e);void 0!==r&&this._$Eh.set(r,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const r=new Set(t.flat(1/0).reverse());for(const t of r)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const r=e.attribute;return!1===r?void 0:"string"==typeof r?r:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const r of e.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(a)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const a of e){const e=document.createElement("style"),s=r.litNonce;void 0!==s&&e.setAttribute("nonce",s),e.textContent=a.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,r){this._$AK(t,r)}_$ET(t,e){const r=this.constructor.elementProperties.get(t),a=this.constructor._$Eu(t,r);if(void 0!==a&&!0===r.reflect){const s=(void 0!==r.converter?.toAttribute?r.converter:w).toAttribute(e,r.type);this._$Em=t,null==s?this.removeAttribute(a):this.setAttribute(a,s),this._$Em=null}}_$AK(t,e){const r=this.constructor,a=r._$Eh.get(t);if(void 0!==a&&this._$Em!==a){const t=r.getPropertyOptions(a),s="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:w;this._$Em=a;const i=s.fromAttribute(e,t.type);this[a]=i??this._$Ej?.get(a)??i,this._$Em=null}}requestUpdate(t,e,r){if(void 0!==t){const a=this.constructor,s=this[t];if(r??=a.getPropertyOptions(t),!((r.hasChanged??_)(s,e)||r.useDefault&&r.reflect&&s===this._$Ej?.get(t)&&!this.hasAttribute(a._$Eu(t,r))))return;this.C(t,e,r)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:r,reflect:a,wrapped:s},i){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,i??e??this[t]),!0!==s||void 0!==i)||(this._$AL.has(t)||(this.hasUpdated||r||(e=void 0),this._$AL.set(t,e)),!0===a&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,r]of t){const{wrapped:t}=r,a=this[e];!0!==t||this._$AL.has(e)||void 0===a||this.C(e,void 0,r,a)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}S.elementStyles=[],S.shadowRootOptions={mode:"open"},S[b("elementProperties")]=new Map,S[b("finalized")]=new Map,v?.({ReactiveElement:S}),(m.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const $=globalThis,D=$.trustedTypes,k=D?D.createPolicy("lit-html",{createHTML:t=>t}):void 0,C="$lit$",A=`lit$${Math.random().toFixed(9).slice(2)}$`,O="?"+A,M=`<${O}>`,T=document,E=()=>T.createComment(""),N=t=>null===t||"object"!=typeof t&&"function"!=typeof t,L=Array.isArray,I="[ \t\n\f\r]",V=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,P=/-->/g,z=/>/g,F=RegExp(`>|${I}(?:([^\\s"'>=/]+)(${I}*=${I}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),H=/'/g,j=/"/g,Z=/^(?:script|style|textarea|title)$/i,U=(t=>(e,...r)=>({_$litType$:t,strings:e,values:r}))(1),W=Symbol.for("lit-noChange"),R=Symbol.for("lit-nothing"),q=new WeakMap,Y=T.createTreeWalker(T,129);function B(t,e){if(!L(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==k?k.createHTML(e):e}const G=(t,e)=>{const r=t.length-1,a=[];let s,i=2===e?"<svg>":3===e?"<math>":"",n=V;for(let e=0;e<r;e++){const r=t[e];let o,l,c=-1,d=0;for(;d<r.length&&(n.lastIndex=d,l=n.exec(r),null!==l);)d=n.lastIndex,n===V?"!--"===l[1]?n=P:void 0!==l[1]?n=z:void 0!==l[2]?(Z.test(l[2])&&(s=RegExp("</"+l[2],"g")),n=F):void 0!==l[3]&&(n=F):n===F?">"===l[0]?(n=s??V,c=-1):void 0===l[1]?c=-2:(c=n.lastIndex-l[2].length,o=l[1],n=void 0===l[3]?F:'"'===l[3]?j:H):n===j||n===H?n=F:n===P||n===z?n=V:(n=F,s=void 0);const u=n===F&&t[e+1].startsWith("/>")?" ":"";i+=n===V?r+M:c>=0?(a.push(o),r.slice(0,c)+C+r.slice(c)+A+u):r+A+(-2===c?e:u)}return[B(t,i+(t[r]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),a]};class J{constructor({strings:t,_$litType$:e},r){let a;this.parts=[];let s=0,i=0;const n=t.length-1,o=this.parts,[l,c]=G(t,e);if(this.el=J.createElement(l,r),Y.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(a=Y.nextNode())&&o.length<n;){if(1===a.nodeType){if(a.hasAttributes())for(const t of a.getAttributeNames())if(t.endsWith(C)){const e=c[i++],r=a.getAttribute(t).split(A),n=/([.?@])?(.*)/.exec(e);o.push({type:1,index:s,name:n[2],strings:r,ctor:"."===n[1]?et:"?"===n[1]?rt:"@"===n[1]?at:tt}),a.removeAttribute(t)}else t.startsWith(A)&&(o.push({type:6,index:s}),a.removeAttribute(t));if(Z.test(a.tagName)){const t=a.textContent.split(A),e=t.length-1;if(e>0){a.textContent=D?D.emptyScript:"";for(let r=0;r<e;r++)a.append(t[r],E()),Y.nextNode(),o.push({type:2,index:++s});a.append(t[e],E())}}}else if(8===a.nodeType)if(a.data===O)o.push({type:2,index:s});else{let t=-1;for(;-1!==(t=a.data.indexOf(A,t+1));)o.push({type:7,index:s}),t+=A.length-1}s++}}static createElement(t,e){const r=T.createElement("template");return r.innerHTML=t,r}}function Q(t,e,r=t,a){if(e===W)return e;let s=void 0!==a?r._$Co?.[a]:r._$Cl;const i=N(e)?void 0:e._$litDirective$;return s?.constructor!==i&&(s?._$AO?.(!1),void 0===i?s=void 0:(s=new i(t),s._$AT(t,r,a)),void 0!==a?(r._$Co??=[])[a]=s:r._$Cl=s),void 0!==s&&(e=Q(t,s._$AS(t,e.values),s,a)),e}class K{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:r}=this._$AD,a=(t?.creationScope??T).importNode(e,!0);Y.currentNode=a;let s=Y.nextNode(),i=0,n=0,o=r[0];for(;void 0!==o;){if(i===o.index){let e;2===o.type?e=new X(s,s.nextSibling,this,t):1===o.type?e=new o.ctor(s,o.name,o.strings,this,t):6===o.type&&(e=new st(s,this,t)),this._$AV.push(e),o=r[++n]}i!==o?.index&&(s=Y.nextNode(),i++)}return Y.currentNode=T,a}p(t){let e=0;for(const r of this._$AV)void 0!==r&&(void 0!==r.strings?(r._$AI(t,r,e),e+=r.strings.length-2):r._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,r,a){this.type=2,this._$AH=R,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=r,this.options=a,this._$Cv=a?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),N(t)?t===R||null==t||""===t?(this._$AH!==R&&this._$AR(),this._$AH=R):t!==this._$AH&&t!==W&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>L(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==R&&N(this._$AH)?this._$AA.nextSibling.data=t:this.T(T.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:r}=t,a="number"==typeof r?this._$AC(t):(void 0===r.el&&(r.el=J.createElement(B(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===a)this._$AH.p(e);else{const t=new K(a,this),r=t.u(this.options);t.p(e),this.T(r),this._$AH=t}}_$AC(t){let e=q.get(t.strings);return void 0===e&&q.set(t.strings,e=new J(t)),e}k(t){L(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let r,a=0;for(const s of t)a===e.length?e.push(r=new X(this.O(E()),this.O(E()),this,this.options)):r=e[a],r._$AI(s),a++;a<e.length&&(this._$AR(r&&r._$AB.nextSibling,a),e.length=a)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,r,a,s){this.type=1,this._$AH=R,this._$AN=void 0,this.element=t,this.name=e,this._$AM=a,this.options=s,r.length>2||""!==r[0]||""!==r[1]?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=R}_$AI(t,e=this,r,a){const s=this.strings;let i=!1;if(void 0===s)t=Q(this,t,e,0),i=!N(t)||t!==this._$AH&&t!==W,i&&(this._$AH=t);else{const a=t;let n,o;for(t=s[0],n=0;n<s.length-1;n++)o=Q(this,a[r+n],e,n),o===W&&(o=this._$AH[n]),i||=!N(o)||o!==this._$AH[n],o===R?t=R:t!==R&&(t+=(o??"")+s[n+1]),this._$AH[n]=o}i&&!a&&this.j(t)}j(t){t===R?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===R?void 0:t}}class rt extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==R)}}class at extends tt{constructor(t,e,r,a,s){super(t,e,r,a,s),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??R)===W)return;const r=this._$AH,a=t===R&&r!==R||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,s=t!==R&&(r===R||a);a&&this.element.removeEventListener(this.name,this,r),s&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class st{constructor(t,e,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const it=$.litHtmlPolyfillSupport;it?.(J,X),($.litHtmlVersions??=[]).push("3.3.1");const nt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends S{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,r)=>{const a=r?.renderBefore??e;let s=a._$litPart$;if(void 0===s){const t=r?.renderBefore??null;a._$litPart$=s=new X(e.insertBefore(E(),t),t,void 0,r??{})}return s._$AI(t),s})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}}ot._$litElement$=!0,ot.finalized=!0,nt.litElementHydrateSupport?.({LitElement:ot});const lt=nt.litElementPolyfillSupport;lt?.({LitElement:ot}),(nt.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ct=t=>(e,r)=>{void 0!==r?r.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},dt={attribute:!0,type:String,converter:w,reflect:!1,hasChanged:_},ut=(t=dt,e,r)=>{const{kind:a,metadata:s}=r;let i=globalThis.litPropertyMetadata.get(s);if(void 0===i&&globalThis.litPropertyMetadata.set(s,i=new Map),"setter"===a&&((t=Object.create(t)).wrapped=!0),i.set(r.name,t),"accessor"===a){const{name:a}=r;return{set(r){const s=e.get.call(this);e.set.call(this,r),this.requestUpdate(a,s,t)},init(e){return void 0!==e&&this.C(a,void 0,t,e),e}}}if("setter"===a){const{name:a}=r;return function(r){const s=this[a];e.call(this,r),this.requestUpdate(a,s,t)}}throw Error("Unsupported decorator location: "+a)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ht(t){return(e,r)=>"object"==typeof r?ut(t,e,r):((t,e,r)=>{const a=e.hasOwnProperty(r);return e.constructor.createProperty(r,t),a?Object.getOwnPropertyDescriptor(e,r):void 0})(t,e,r)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pt(t){return ht({...t,state:!0,attribute:!1})}var gt="M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z",mt="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",ft="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",yt="M22 9A4.32 4.32 0 0 1 19.78 8.45A3.4 3.4 0 0 0 18 8V7A4.32 4.32 0 0 1 20.22 7.55A3.4 3.4 0 0 0 22 8M22 6A3.4 3.4 0 0 1 20.22 5.55A4.32 4.32 0 0 0 18 5V6A3.4 3.4 0 0 1 19.78 6.45A4.32 4.32 0 0 0 22 7M22 10A3.4 3.4 0 0 1 20.22 9.55A4.32 4.32 0 0 0 18 9V10A3.4 3.4 0 0 1 19.78 10.45A4.32 4.32 0 0 0 22 11M10 12.73A70.39 70.39 0 0 0 17 11V4S10.5 2 7.5 2A5.5 5.5 0 0 0 6.12 12.82L7 19H8A3 3 0 0 0 9.46 21.33A3.15 3.15 0 0 1 11 24H12A4.12 4.12 0 0 0 10.09 20.55C9.39 20 9 19.63 9 19H10M7.5 10A2.5 2.5 0 1 1 10 7.5A2.5 2.5 0 0 1 7.5 10Z",vt="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",bt="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z";class wt extends Error{}class _t extends wt{constructor(t){super(`Invalid DateTime: ${t.toMessage()}`)}}class xt extends wt{constructor(t){super(`Invalid Interval: ${t.toMessage()}`)}}class St extends wt{constructor(t){super(`Invalid Duration: ${t.toMessage()}`)}}class $t extends wt{}class Dt extends wt{constructor(t){super(`Invalid unit ${t}`)}}class kt extends wt{}class Ct extends wt{constructor(){super("Zone is an abstract class")}}const At="numeric",Ot="short",Mt="long",Tt={year:At,month:At,day:At},Et={year:At,month:Ot,day:At},Nt={year:At,month:Ot,day:At,weekday:Ot},Lt={year:At,month:Mt,day:At},It={year:At,month:Mt,day:At,weekday:Mt},Vt={hour:At,minute:At},Pt={hour:At,minute:At,second:At},zt={hour:At,minute:At,second:At,timeZoneName:Ot},Ft={hour:At,minute:At,second:At,timeZoneName:Mt},Ht={hour:At,minute:At,hourCycle:"h23"},jt={hour:At,minute:At,second:At,hourCycle:"h23"},Zt={hour:At,minute:At,second:At,hourCycle:"h23",timeZoneName:Ot},Ut={hour:At,minute:At,second:At,hourCycle:"h23",timeZoneName:Mt},Wt={year:At,month:At,day:At,hour:At,minute:At},Rt={year:At,month:At,day:At,hour:At,minute:At,second:At},qt={year:At,month:Ot,day:At,hour:At,minute:At},Yt={year:At,month:Ot,day:At,hour:At,minute:At,second:At},Bt={year:At,month:Ot,day:At,weekday:Ot,hour:At,minute:At},Gt={year:At,month:Mt,day:At,hour:At,minute:At,timeZoneName:Ot},Jt={year:At,month:Mt,day:At,hour:At,minute:At,second:At,timeZoneName:Ot},Qt={year:At,month:Mt,day:At,weekday:Mt,hour:At,minute:At,timeZoneName:Mt},Kt={year:At,month:Mt,day:At,weekday:Mt,hour:At,minute:At,second:At,timeZoneName:Mt};class Xt{get type(){throw new Ct}get name(){throw new Ct}get ianaName(){return this.name}get isUniversal(){throw new Ct}offsetName(t,e){throw new Ct}formatOffset(t,e){throw new Ct}offset(t){throw new Ct}equals(t){throw new Ct}get isValid(){throw new Ct}}let te=null;class ee extends Xt{static get instance(){return null===te&&(te=new ee),te}get type(){return"system"}get name(){return(new Intl.DateTimeFormat).resolvedOptions().timeZone}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return _r(t,e,r)}formatOffset(t,e){return Dr(this.offset(t),e)}offset(t){return-new Date(t).getTimezoneOffset()}equals(t){return"system"===t.type}get isValid(){return!0}}const re=new Map;const ae={year:0,month:1,day:2,era:3,hour:4,minute:5,second:6};const se=new Map;class ie extends Xt{static create(t){let e=se.get(t);return void 0===e&&se.set(t,e=new ie(t)),e}static resetCache(){se.clear(),re.clear()}static isValidSpecifier(t){return this.isValidZone(t)}static isValidZone(t){if(!t)return!1;try{return new Intl.DateTimeFormat("en-US",{timeZone:t}).format(),!0}catch(t){return!1}}constructor(t){super(),this.zoneName=t,this.valid=ie.isValidZone(t)}get type(){return"iana"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return _r(t,e,r,this.name)}formatOffset(t,e){return Dr(this.offset(t),e)}offset(t){if(!this.valid)return NaN;const e=new Date(t);if(isNaN(e))return NaN;const r=function(t){let e=re.get(t);return void 0===e&&(e=new Intl.DateTimeFormat("en-US",{hour12:!1,timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",era:"short"}),re.set(t,e)),e}(this.name);let[a,s,i,n,o,l,c]=r.formatToParts?function(t,e){const r=t.formatToParts(e),a=[];for(let t=0;t<r.length;t++){const{type:e,value:s}=r[t],i=ae[e];"era"===e?a[i]=s:tr(i)||(a[i]=parseInt(s,10))}return a}(r,e):function(t,e){const r=t.format(e).replace(/\u200E/g,""),a=/(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(r),[,s,i,n,o,l,c,d]=a;return[n,s,i,o,l,c,d]}(r,e);"BC"===n&&(a=1-Math.abs(a));let d=+e;const u=d%1e3;return d-=u>=0?u:1e3+u,(yr({year:a,month:s,day:i,hour:24===o?0:o,minute:l,second:c,millisecond:0})-d)/6e4}equals(t){return"iana"===t.type&&t.name===this.name}get isValid(){return this.valid}}let ne={};const oe=new Map;function le(t,e={}){const r=JSON.stringify([t,e]);let a=oe.get(r);return void 0===a&&(a=new Intl.DateTimeFormat(t,e),oe.set(r,a)),a}const ce=new Map;const de=new Map;let ue=null;const he=new Map;function pe(t){let e=he.get(t);return void 0===e&&(e=new Intl.DateTimeFormat(t).resolvedOptions(),he.set(t,e)),e}const ge=new Map;function me(t,e,r,a){const s=t.listingMode();return"error"===s?null:"en"===s?r(e):a(e)}class fe{constructor(t,e,r){this.padTo=r.padTo||0,this.floor=r.floor||!1;const{padTo:a,floor:s,...i}=r;if(!e||Object.keys(i).length>0){const e={useGrouping:!1,...r};r.padTo>0&&(e.minimumIntegerDigits=r.padTo),this.inf=function(t,e={}){const r=JSON.stringify([t,e]);let a=ce.get(r);return void 0===a&&(a=new Intl.NumberFormat(t,e),ce.set(r,a)),a}(t,e)}}format(t){if(this.inf){const e=this.floor?Math.floor(t):t;return this.inf.format(e)}return cr(this.floor?Math.floor(t):pr(t,3),this.padTo)}}class ye{constructor(t,e,r){let a;if(this.opts=r,this.originalZone=void 0,this.opts.timeZone)this.dt=t;else if("fixed"===t.zone.type){const e=t.offset/60*-1,r=e>=0?`Etc/GMT+${e}`:`Etc/GMT${e}`;0!==t.offset&&ie.create(r).valid?(a=r,this.dt=t):(a="UTC",this.dt=0===t.offset?t:t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone)}else"system"===t.zone.type?this.dt=t:"iana"===t.zone.type?(this.dt=t,a=t.zone.name):(a="UTC",this.dt=t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone);const s={...this.opts};s.timeZone=s.timeZone||a,this.dtf=le(e,s)}format(){return this.originalZone?this.formatToParts().map(({value:t})=>t).join(""):this.dtf.format(this.dt.toJSDate())}formatToParts(){const t=this.dtf.formatToParts(this.dt.toJSDate());return this.originalZone?t.map(t=>{if("timeZoneName"===t.type){const e=this.originalZone.offsetName(this.dt.ts,{locale:this.dt.locale,format:this.opts.timeZoneName});return{...t,value:e}}return t}):t}resolvedOptions(){return this.dtf.resolvedOptions()}}class ve{constructor(t,e,r){this.opts={style:"long",...r},!e&&ar()&&(this.rtf=function(t,e={}){const{base:r,...a}=e,s=JSON.stringify([t,a]);let i=de.get(s);return void 0===i&&(i=new Intl.RelativeTimeFormat(t,e),de.set(s,i)),i}(t,r))}format(t,e){return this.rtf?this.rtf.format(t,e):function(t,e,r="always",a=!1){const s={years:["year","yr."],quarters:["quarter","qtr."],months:["month","mo."],weeks:["week","wk."],days:["day","day","days"],hours:["hour","hr."],minutes:["minute","min."],seconds:["second","sec."]},i=-1===["hours","minutes","seconds"].indexOf(t);if("auto"===r&&i){const r="days"===t;switch(e){case 1:return r?"tomorrow":`next ${s[t][0]}`;case-1:return r?"yesterday":`last ${s[t][0]}`;case 0:return r?"today":`this ${s[t][0]}`}}const n=Object.is(e,-0)||e<0,o=Math.abs(e),l=1===o,c=s[t],d=a?l?c[1]:c[2]||c[1]:l?s[t][0]:t;return n?`${o} ${d} ago`:`in ${o} ${d}`}(e,t,this.opts.numeric,"long"!==this.opts.style)}formatToParts(t,e){return this.rtf?this.rtf.formatToParts(t,e):[]}}const be={firstDay:1,minimalDays:4,weekend:[6,7]};class we{static fromOpts(t){return we.create(t.locale,t.numberingSystem,t.outputCalendar,t.weekSettings,t.defaultToEN)}static create(t,e,r,a,s=!1){const i=t||ze.defaultLocale,n=i||(s?"en-US":ue||(ue=(new Intl.DateTimeFormat).resolvedOptions().locale,ue)),o=e||ze.defaultNumberingSystem,l=r||ze.defaultOutputCalendar,c=or(a)||ze.defaultWeekSettings;return new we(n,o,l,c,i)}static resetCache(){ue=null,oe.clear(),ce.clear(),de.clear(),he.clear(),ge.clear()}static fromObject({locale:t,numberingSystem:e,outputCalendar:r,weekSettings:a}={}){return we.create(t,e,r,a)}constructor(t,e,r,a,s){const[i,n,o]=function(t){const e=t.indexOf("-x-");-1!==e&&(t=t.substring(0,e));const r=t.indexOf("-u-");if(-1===r)return[t];{let e,a;try{e=le(t).resolvedOptions(),a=t}catch(s){const i=t.substring(0,r);e=le(i).resolvedOptions(),a=i}const{numberingSystem:s,calendar:i}=e;return[a,s,i]}}(t);this.locale=i,this.numberingSystem=e||n||null,this.outputCalendar=r||o||null,this.weekSettings=a,this.intl=function(t,e,r){return r||e?(t.includes("-u-")||(t+="-u"),r&&(t+=`-ca-${r}`),e&&(t+=`-nu-${e}`),t):t}(this.locale,this.numberingSystem,this.outputCalendar),this.weekdaysCache={format:{},standalone:{}},this.monthsCache={format:{},standalone:{}},this.meridiemCache=null,this.eraCache={},this.specifiedLocale=s,this.fastNumbersCached=null}get fastNumbers(){var t;return null==this.fastNumbersCached&&(this.fastNumbersCached=(!(t=this).numberingSystem||"latn"===t.numberingSystem)&&("latn"===t.numberingSystem||!t.locale||t.locale.startsWith("en")||"latn"===pe(t.locale).numberingSystem)),this.fastNumbersCached}listingMode(){const t=this.isEnglish(),e=!(null!==this.numberingSystem&&"latn"!==this.numberingSystem||null!==this.outputCalendar&&"gregory"!==this.outputCalendar);return t&&e?"en":"intl"}clone(t){return t&&0!==Object.getOwnPropertyNames(t).length?we.create(t.locale||this.specifiedLocale,t.numberingSystem||this.numberingSystem,t.outputCalendar||this.outputCalendar,or(t.weekSettings)||this.weekSettings,t.defaultToEN||!1):this}redefaultToEN(t={}){return this.clone({...t,defaultToEN:!0})}redefaultToSystem(t={}){return this.clone({...t,defaultToEN:!1})}months(t,e=!1){return me(this,t,Mr,()=>{const r="ja"===this.intl||this.intl.startsWith("ja-"),a=(e&=!r)?{month:t,day:"numeric"}:{month:t},s=e?"format":"standalone";if(!this.monthsCache[s][t]){const e=r?t=>this.dtFormatter(t,a).format():t=>this.extract(t,a,"month");this.monthsCache[s][t]=function(t){const e=[];for(let r=1;r<=12;r++){const a=Is.utc(2009,r,1);e.push(t(a))}return e}(e)}return this.monthsCache[s][t]})}weekdays(t,e=!1){return me(this,t,Lr,()=>{const r=e?{weekday:t,year:"numeric",month:"long",day:"numeric"}:{weekday:t},a=e?"format":"standalone";return this.weekdaysCache[a][t]||(this.weekdaysCache[a][t]=function(t){const e=[];for(let r=1;r<=7;r++){const a=Is.utc(2016,11,13+r);e.push(t(a))}return e}(t=>this.extract(t,r,"weekday"))),this.weekdaysCache[a][t]})}meridiems(){return me(this,void 0,()=>Ir,()=>{if(!this.meridiemCache){const t={hour:"numeric",hourCycle:"h12"};this.meridiemCache=[Is.utc(2016,11,13,9),Is.utc(2016,11,13,19)].map(e=>this.extract(e,t,"dayperiod"))}return this.meridiemCache})}eras(t){return me(this,t,Fr,()=>{const e={era:t};return this.eraCache[t]||(this.eraCache[t]=[Is.utc(-40,1,1),Is.utc(2017,1,1)].map(t=>this.extract(t,e,"era"))),this.eraCache[t]})}extract(t,e,r){const a=this.dtFormatter(t,e).formatToParts().find(t=>t.type.toLowerCase()===r);return a?a.value:null}numberFormatter(t={}){return new fe(this.intl,t.forceSimple||this.fastNumbers,t)}dtFormatter(t,e={}){return new ye(t,this.intl,e)}relFormatter(t={}){return new ve(this.intl,this.isEnglish(),t)}listFormatter(t={}){return function(t,e={}){const r=JSON.stringify([t,e]);let a=ne[r];return a||(a=new Intl.ListFormat(t,e),ne[r]=a),a}(this.intl,t)}isEnglish(){return"en"===this.locale||"en-us"===this.locale.toLowerCase()||pe(this.intl).locale.startsWith("en-us")}getWeekSettings(){return this.weekSettings?this.weekSettings:sr()?function(t){let e=ge.get(t);if(!e){const r=new Intl.Locale(t);e="getWeekInfo"in r?r.getWeekInfo():r.weekInfo,"minimalDays"in e||(e={...be,...e}),ge.set(t,e)}return e}(this.locale):be}getStartOfWeek(){return this.getWeekSettings().firstDay}getMinDaysInFirstWeek(){return this.getWeekSettings().minimalDays}getWeekendDays(){return this.getWeekSettings().weekend}equals(t){return this.locale===t.locale&&this.numberingSystem===t.numberingSystem&&this.outputCalendar===t.outputCalendar}toString(){return`Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`}}let _e=null;class xe extends Xt{static get utcInstance(){return null===_e&&(_e=new xe(0)),_e}static instance(t){return 0===t?xe.utcInstance:new xe(t)}static parseSpecifier(t){if(t){const e=t.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);if(e)return new xe(xr(e[1],e[2]))}return null}constructor(t){super(),this.fixed=t}get type(){return"fixed"}get name(){return 0===this.fixed?"UTC":`UTC${Dr(this.fixed,"narrow")}`}get ianaName(){return 0===this.fixed?"Etc/UTC":`Etc/GMT${Dr(-this.fixed,"narrow")}`}offsetName(){return this.name}formatOffset(t,e){return Dr(this.fixed,e)}get isUniversal(){return!0}offset(){return this.fixed}equals(t){return"fixed"===t.type&&t.fixed===this.fixed}get isValid(){return!0}}class Se extends Xt{constructor(t){super(),this.zoneName=t}get type(){return"invalid"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(){return null}formatOffset(){return""}offset(){return NaN}equals(){return!1}get isValid(){return!1}}function $e(t,e){if(tr(t)||null===t)return e;if(t instanceof Xt)return t;if(function(t){return"string"==typeof t}(t)){const r=t.toLowerCase();return"default"===r?e:"local"===r||"system"===r?ee.instance:"utc"===r||"gmt"===r?xe.utcInstance:xe.parseSpecifier(r)||ie.create(t)}return er(t)?xe.instance(t):"object"==typeof t&&"offset"in t&&"function"==typeof t.offset?t:new Se(t)}const De={arab:"[٠-٩]",arabext:"[۰-۹]",bali:"[᭐-᭙]",beng:"[০-৯]",deva:"[०-९]",fullwide:"[０-９]",gujr:"[૦-૯]",hanidec:"[〇|一|二|三|四|五|六|七|八|九]",khmr:"[០-៩]",knda:"[೦-೯]",laoo:"[໐-໙]",limb:"[᥆-᥏]",mlym:"[൦-൯]",mong:"[᠐-᠙]",mymr:"[၀-၉]",orya:"[୦-୯]",tamldec:"[௦-௯]",telu:"[౦-౯]",thai:"[๐-๙]",tibt:"[༠-༩]",latn:"\\d"},ke={arab:[1632,1641],arabext:[1776,1785],bali:[6992,7001],beng:[2534,2543],deva:[2406,2415],fullwide:[65296,65303],gujr:[2790,2799],khmr:[6112,6121],knda:[3302,3311],laoo:[3792,3801],limb:[6470,6479],mlym:[3430,3439],mong:[6160,6169],mymr:[4160,4169],orya:[2918,2927],tamldec:[3046,3055],telu:[3174,3183],thai:[3664,3673],tibt:[3872,3881]},Ce=De.hanidec.replace(/[\[|\]]/g,"").split("");const Ae=new Map;function Oe({numberingSystem:t},e=""){const r=t||"latn";let a=Ae.get(r);void 0===a&&(a=new Map,Ae.set(r,a));let s=a.get(e);return void 0===s&&(s=new RegExp(`${De[r]}${e}`),a.set(e,s)),s}let Me,Te=()=>Date.now(),Ee="system",Ne=null,Le=null,Ie=null,Ve=60,Pe=null;class ze{static get now(){return Te}static set now(t){Te=t}static set defaultZone(t){Ee=t}static get defaultZone(){return $e(Ee,ee.instance)}static get defaultLocale(){return Ne}static set defaultLocale(t){Ne=t}static get defaultNumberingSystem(){return Le}static set defaultNumberingSystem(t){Le=t}static get defaultOutputCalendar(){return Ie}static set defaultOutputCalendar(t){Ie=t}static get defaultWeekSettings(){return Pe}static set defaultWeekSettings(t){Pe=or(t)}static get twoDigitCutoffYear(){return Ve}static set twoDigitCutoffYear(t){Ve=t%100}static get throwOnInvalid(){return Me}static set throwOnInvalid(t){Me=t}static resetCaches(){we.resetCache(),ie.resetCache(),Is.resetCache(),Ae.clear()}}class Fe{constructor(t,e){this.reason=t,this.explanation=e}toMessage(){return this.explanation?`${this.reason}: ${this.explanation}`:this.reason}}const He=[0,31,59,90,120,151,181,212,243,273,304,334],je=[0,31,60,91,121,152,182,213,244,274,305,335];function Ze(t,e){return new Fe("unit out of range",`you specified ${e} (of type ${typeof e}) as a ${t}, which is invalid`)}function Ue(t,e,r){const a=new Date(Date.UTC(t,e-1,r));t<100&&t>=0&&a.setUTCFullYear(a.getUTCFullYear()-1900);const s=a.getUTCDay();return 0===s?7:s}function We(t,e,r){return r+(gr(t)?je:He)[e-1]}function Re(t,e){const r=gr(t)?je:He,a=r.findIndex(t=>t<e);return{month:a+1,day:e-r[a]}}function qe(t,e){return(t-e+7)%7+1}function Ye(t,e=4,r=1){const{year:a,month:s,day:i}=t,n=We(a,s,i),o=qe(Ue(a,s,i),r);let l,c=Math.floor((n-o+14-e)/7);return c<1?(l=a-1,c=br(l,e,r)):c>br(a,e,r)?(l=a+1,c=1):l=a,{weekYear:l,weekNumber:c,weekday:o,...kr(t)}}function Be(t,e=4,r=1){const{weekYear:a,weekNumber:s,weekday:i}=t,n=qe(Ue(a,1,e),r),o=mr(a);let l,c=7*s+i-n-7+e;c<1?(l=a-1,c+=mr(l)):c>o?(l=a+1,c-=mr(a)):l=a;const{month:d,day:u}=Re(l,c);return{year:l,month:d,day:u,...kr(t)}}function Ge(t){const{year:e,month:r,day:a}=t;return{year:e,ordinal:We(e,r,a),...kr(t)}}function Je(t){const{year:e,ordinal:r}=t,{month:a,day:s}=Re(e,r);return{year:e,month:a,day:s,...kr(t)}}function Qe(t,e){if(!tr(t.localWeekday)||!tr(t.localWeekNumber)||!tr(t.localWeekYear)){if(!tr(t.weekday)||!tr(t.weekNumber)||!tr(t.weekYear))throw new $t("Cannot mix locale-based week fields with ISO-based week fields");return tr(t.localWeekday)||(t.weekday=t.localWeekday),tr(t.localWeekNumber)||(t.weekNumber=t.localWeekNumber),tr(t.localWeekYear)||(t.weekYear=t.localWeekYear),delete t.localWeekday,delete t.localWeekNumber,delete t.localWeekYear,{minDaysInFirstWeek:e.getMinDaysInFirstWeek(),startOfWeek:e.getStartOfWeek()}}return{minDaysInFirstWeek:4,startOfWeek:1}}function Ke(t){const e=rr(t.year),r=lr(t.month,1,12),a=lr(t.day,1,fr(t.year,t.month));return e?r?!a&&Ze("day",t.day):Ze("month",t.month):Ze("year",t.year)}function Xe(t){const{hour:e,minute:r,second:a,millisecond:s}=t,i=lr(e,0,23)||24===e&&0===r&&0===a&&0===s,n=lr(r,0,59),o=lr(a,0,59),l=lr(s,0,999);return i?n?o?!l&&Ze("millisecond",s):Ze("second",a):Ze("minute",r):Ze("hour",e)}function tr(t){return void 0===t}function er(t){return"number"==typeof t}function rr(t){return"number"==typeof t&&t%1==0}function ar(){try{return"undefined"!=typeof Intl&&!!Intl.RelativeTimeFormat}catch(t){return!1}}function sr(){try{return"undefined"!=typeof Intl&&!!Intl.Locale&&("weekInfo"in Intl.Locale.prototype||"getWeekInfo"in Intl.Locale.prototype)}catch(t){return!1}}function ir(t,e,r){if(0!==t.length)return t.reduce((t,a)=>{const s=[e(a),a];return t&&r(t[0],s[0])===t[0]?t:s},null)[1]}function nr(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function or(t){if(null==t)return null;if("object"!=typeof t)throw new kt("Week settings must be an object");if(!lr(t.firstDay,1,7)||!lr(t.minimalDays,1,7)||!Array.isArray(t.weekend)||t.weekend.some(t=>!lr(t,1,7)))throw new kt("Invalid week settings");return{firstDay:t.firstDay,minimalDays:t.minimalDays,weekend:Array.from(t.weekend)}}function lr(t,e,r){return rr(t)&&t>=e&&t<=r}function cr(t,e=2){let r;return r=t<0?"-"+(""+-t).padStart(e,"0"):(""+t).padStart(e,"0"),r}function dr(t){return tr(t)||null===t||""===t?void 0:parseInt(t,10)}function ur(t){return tr(t)||null===t||""===t?void 0:parseFloat(t)}function hr(t){if(!tr(t)&&null!==t&&""!==t){const e=1e3*parseFloat("0."+t);return Math.floor(e)}}function pr(t,e,r="round"){const a=10**e;switch(r){case"expand":return t>0?Math.ceil(t*a)/a:Math.floor(t*a)/a;case"trunc":return Math.trunc(t*a)/a;case"round":return Math.round(t*a)/a;case"floor":return Math.floor(t*a)/a;case"ceil":return Math.ceil(t*a)/a;default:throw new RangeError(`Value rounding ${r} is out of range`)}}function gr(t){return t%4==0&&(t%100!=0||t%400==0)}function mr(t){return gr(t)?366:365}function fr(t,e){const r=function(t,e){return t-e*Math.floor(t/e)}(e-1,12)+1;return 2===r?gr(t+(e-r)/12)?29:28:[31,null,31,30,31,30,31,31,30,31,30,31][r-1]}function yr(t){let e=Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second,t.millisecond);return t.year<100&&t.year>=0&&(e=new Date(e),e.setUTCFullYear(t.year,t.month-1,t.day)),+e}function vr(t,e,r){return-qe(Ue(t,1,e),r)+e-1}function br(t,e=4,r=1){const a=vr(t,e,r),s=vr(t+1,e,r);return(mr(t)-a+s)/7}function wr(t){return t>99?t:t>ze.twoDigitCutoffYear?1900+t:2e3+t}function _r(t,e,r,a=null){const s=new Date(t),i={hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"};a&&(i.timeZone=a);const n={timeZoneName:e,...i},o=new Intl.DateTimeFormat(r,n).formatToParts(s).find(t=>"timezonename"===t.type.toLowerCase());return o?o.value:null}function xr(t,e){let r=parseInt(t,10);Number.isNaN(r)&&(r=0);const a=parseInt(e,10)||0;return 60*r+(r<0||Object.is(r,-0)?-a:a)}function Sr(t){const e=Number(t);if("boolean"==typeof t||""===t||!Number.isFinite(e))throw new kt(`Invalid unit value ${t}`);return e}function $r(t,e){const r={};for(const a in t)if(nr(t,a)){const s=t[a];if(null==s)continue;r[e(a)]=Sr(s)}return r}function Dr(t,e){const r=Math.trunc(Math.abs(t/60)),a=Math.trunc(Math.abs(t%60)),s=t>=0?"+":"-";switch(e){case"short":return`${s}${cr(r,2)}:${cr(a,2)}`;case"narrow":return`${s}${r}${a>0?`:${a}`:""}`;case"techie":return`${s}${cr(r,2)}${cr(a,2)}`;default:throw new RangeError(`Value format ${e} is out of range for property format`)}}function kr(t){return function(t,e){return e.reduce((e,r)=>(e[r]=t[r],e),{})}(t,["hour","minute","second","millisecond"])}const Cr=["January","February","March","April","May","June","July","August","September","October","November","December"],Ar=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],Or=["J","F","M","A","M","J","J","A","S","O","N","D"];function Mr(t){switch(t){case"narrow":return[...Or];case"short":return[...Ar];case"long":return[...Cr];case"numeric":return["1","2","3","4","5","6","7","8","9","10","11","12"];case"2-digit":return["01","02","03","04","05","06","07","08","09","10","11","12"];default:return null}}const Tr=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],Er=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],Nr=["M","T","W","T","F","S","S"];function Lr(t){switch(t){case"narrow":return[...Nr];case"short":return[...Er];case"long":return[...Tr];case"numeric":return["1","2","3","4","5","6","7"];default:return null}}const Ir=["AM","PM"],Vr=["Before Christ","Anno Domini"],Pr=["BC","AD"],zr=["B","A"];function Fr(t){switch(t){case"narrow":return[...zr];case"short":return[...Pr];case"long":return[...Vr];default:return null}}function Hr(t,e){let r="";for(const a of t)a.literal?r+=a.val:r+=e(a.val);return r}const jr={D:Tt,DD:Et,DDD:Lt,DDDD:It,t:Vt,tt:Pt,ttt:zt,tttt:Ft,T:Ht,TT:jt,TTT:Zt,TTTT:Ut,f:Wt,ff:qt,fff:Gt,ffff:Qt,F:Rt,FF:Yt,FFF:Jt,FFFF:Kt};class Zr{static create(t,e={}){return new Zr(t,e)}static parseFormat(t){let e=null,r="",a=!1;const s=[];for(let i=0;i<t.length;i++){const n=t.charAt(i);"'"===n?((r.length>0||a)&&s.push({literal:a||/^\s+$/.test(r),val:""===r?"'":r}),e=null,r="",a=!a):a||n===e?r+=n:(r.length>0&&s.push({literal:/^\s+$/.test(r),val:r}),r=n,e=n)}return r.length>0&&s.push({literal:a||/^\s+$/.test(r),val:r}),s}static macroTokenToFormatOpts(t){return jr[t]}constructor(t,e){this.opts=e,this.loc=t,this.systemLoc=null}formatWithSystemDefault(t,e){null===this.systemLoc&&(this.systemLoc=this.loc.redefaultToSystem());return this.systemLoc.dtFormatter(t,{...this.opts,...e}).format()}dtFormatter(t,e={}){return this.loc.dtFormatter(t,{...this.opts,...e})}formatDateTime(t,e){return this.dtFormatter(t,e).format()}formatDateTimeParts(t,e){return this.dtFormatter(t,e).formatToParts()}formatInterval(t,e){return this.dtFormatter(t.start,e).dtf.formatRange(t.start.toJSDate(),t.end.toJSDate())}resolvedOptions(t,e){return this.dtFormatter(t,e).resolvedOptions()}num(t,e=0,r=void 0){if(this.opts.forceSimple)return cr(t,e);const a={...this.opts};return e>0&&(a.padTo=e),r&&(a.signDisplay=r),this.loc.numberFormatter(a).format(t)}formatDateTimeFromString(t,e){const r="en"===this.loc.listingMode(),a=this.loc.outputCalendar&&"gregory"!==this.loc.outputCalendar,s=(e,r)=>this.loc.extract(t,e,r),i=e=>t.isOffsetFixed&&0===t.offset&&e.allowZ?"Z":t.isValid?t.zone.formatOffset(t.ts,e.format):"",n=()=>r?function(t){return Ir[t.hour<12?0:1]}(t):s({hour:"numeric",hourCycle:"h12"},"dayperiod"),o=(e,a)=>r?function(t,e){return Mr(e)[t.month-1]}(t,e):s(a?{month:e}:{month:e,day:"numeric"},"month"),l=(e,a)=>r?function(t,e){return Lr(e)[t.weekday-1]}(t,e):s(a?{weekday:e}:{weekday:e,month:"long",day:"numeric"},"weekday"),c=e=>{const r=Zr.macroTokenToFormatOpts(e);return r?this.formatWithSystemDefault(t,r):e},d=e=>r?function(t,e){return Fr(e)[t.year<0?0:1]}(t,e):s({era:e},"era");return Hr(Zr.parseFormat(e),e=>{switch(e){case"S":return this.num(t.millisecond);case"u":case"SSS":return this.num(t.millisecond,3);case"s":return this.num(t.second);case"ss":return this.num(t.second,2);case"uu":return this.num(Math.floor(t.millisecond/10),2);case"uuu":return this.num(Math.floor(t.millisecond/100));case"m":return this.num(t.minute);case"mm":return this.num(t.minute,2);case"h":return this.num(t.hour%12==0?12:t.hour%12);case"hh":return this.num(t.hour%12==0?12:t.hour%12,2);case"H":return this.num(t.hour);case"HH":return this.num(t.hour,2);case"Z":return i({format:"narrow",allowZ:this.opts.allowZ});case"ZZ":return i({format:"short",allowZ:this.opts.allowZ});case"ZZZ":return i({format:"techie",allowZ:this.opts.allowZ});case"ZZZZ":return t.zone.offsetName(t.ts,{format:"short",locale:this.loc.locale});case"ZZZZZ":return t.zone.offsetName(t.ts,{format:"long",locale:this.loc.locale});case"z":return t.zoneName;case"a":return n();case"d":return a?s({day:"numeric"},"day"):this.num(t.day);case"dd":return a?s({day:"2-digit"},"day"):this.num(t.day,2);case"c":case"E":return this.num(t.weekday);case"ccc":return l("short",!0);case"cccc":return l("long",!0);case"ccccc":return l("narrow",!0);case"EEE":return l("short",!1);case"EEEE":return l("long",!1);case"EEEEE":return l("narrow",!1);case"L":return a?s({month:"numeric",day:"numeric"},"month"):this.num(t.month);case"LL":return a?s({month:"2-digit",day:"numeric"},"month"):this.num(t.month,2);case"LLL":return o("short",!0);case"LLLL":return o("long",!0);case"LLLLL":return o("narrow",!0);case"M":return a?s({month:"numeric"},"month"):this.num(t.month);case"MM":return a?s({month:"2-digit"},"month"):this.num(t.month,2);case"MMM":return o("short",!1);case"MMMM":return o("long",!1);case"MMMMM":return o("narrow",!1);case"y":return a?s({year:"numeric"},"year"):this.num(t.year);case"yy":return a?s({year:"2-digit"},"year"):this.num(t.year.toString().slice(-2),2);case"yyyy":return a?s({year:"numeric"},"year"):this.num(t.year,4);case"yyyyyy":return a?s({year:"numeric"},"year"):this.num(t.year,6);case"G":return d("short");case"GG":return d("long");case"GGGGG":return d("narrow");case"kk":return this.num(t.weekYear.toString().slice(-2),2);case"kkkk":return this.num(t.weekYear,4);case"W":return this.num(t.weekNumber);case"WW":return this.num(t.weekNumber,2);case"n":return this.num(t.localWeekNumber);case"nn":return this.num(t.localWeekNumber,2);case"ii":return this.num(t.localWeekYear.toString().slice(-2),2);case"iiii":return this.num(t.localWeekYear,4);case"o":return this.num(t.ordinal);case"ooo":return this.num(t.ordinal,3);case"q":return this.num(t.quarter);case"qq":return this.num(t.quarter,2);case"X":return this.num(Math.floor(t.ts/1e3));case"x":return this.num(t.ts);default:return c(e)}})}formatDurationFromString(t,e){const r="negativeLargestOnly"===this.opts.signMode?-1:1,a=t=>{switch(t[0]){case"S":return"milliseconds";case"s":return"seconds";case"m":return"minutes";case"h":return"hours";case"d":return"days";case"w":return"weeks";case"M":return"months";case"y":return"years";default:return null}},s=Zr.parseFormat(e),i=s.reduce((t,{literal:e,val:r})=>e?t:t.concat(r),[]),n=t.shiftTo(...i.map(a).filter(t=>t));return Hr(s,((t,e)=>s=>{const i=a(s);if(i){const a=e.isNegativeDuration&&i!==e.largestUnit?r:1;let n;return n="negativeLargestOnly"===this.opts.signMode&&i!==e.largestUnit?"never":"all"===this.opts.signMode?"always":"auto",this.num(t.get(i)*a,s.length,n)}return s})(n,{isNegativeDuration:n<0,largestUnit:Object.keys(n.values)[0]}))}}const Ur=/[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;function Wr(...t){const e=t.reduce((t,e)=>t+e.source,"");return RegExp(`^${e}$`)}function Rr(...t){return e=>t.reduce(([t,r,a],s)=>{const[i,n,o]=s(e,a);return[{...t,...i},n||r,o]},[{},null,1]).slice(0,2)}function qr(t,...e){if(null==t)return[null,null];for(const[r,a]of e){const e=r.exec(t);if(e)return a(e)}return[null,null]}function Yr(...t){return(e,r)=>{const a={};let s;for(s=0;s<t.length;s++)a[t[s]]=dr(e[r+s]);return[a,null,r+s]}}const Br=/(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/,Gr=/(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/,Jr=RegExp(`${Gr.source}${`(?:${Br.source}?(?:\\[(${Ur.source})\\])?)?`}`),Qr=RegExp(`(?:[Tt]${Jr.source})?`),Kr=Yr("weekYear","weekNumber","weekDay"),Xr=Yr("year","ordinal"),ta=RegExp(`${Gr.source} ?(?:${Br.source}|(${Ur.source}))?`),ea=RegExp(`(?: ${ta.source})?`);function ra(t,e,r){const a=t[e];return tr(a)?r:dr(a)}function aa(t,e){return[{hours:ra(t,e,0),minutes:ra(t,e+1,0),seconds:ra(t,e+2,0),milliseconds:hr(t[e+3])},null,e+4]}function sa(t,e){const r=!t[e]&&!t[e+1],a=xr(t[e+1],t[e+2]);return[{},r?null:xe.instance(a),e+3]}function ia(t,e){return[{},t[e]?ie.create(t[e]):null,e+1]}const na=RegExp(`^T?${Gr.source}$`),oa=/^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;function la(t){const[e,r,a,s,i,n,o,l,c]=t,d="-"===e[0],u=l&&"-"===l[0],h=(t,e=!1)=>void 0!==t&&(e||t&&d)?-t:t;return[{years:h(ur(r)),months:h(ur(a)),weeks:h(ur(s)),days:h(ur(i)),hours:h(ur(n)),minutes:h(ur(o)),seconds:h(ur(l),"-0"===l),milliseconds:h(hr(c),u)}]}const ca={GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function da(t,e,r,a,s,i,n){const o={year:2===e.length?wr(dr(e)):dr(e),month:Ar.indexOf(r)+1,day:dr(a),hour:dr(s),minute:dr(i)};return n&&(o.second=dr(n)),t&&(o.weekday=t.length>3?Tr.indexOf(t)+1:Er.indexOf(t)+1),o}const ua=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;function ha(t){const[,e,r,a,s,i,n,o,l,c,d,u]=t,h=da(e,s,a,r,i,n,o);let p;return p=l?ca[l]:c?0:xr(d,u),[h,new xe(p)]}const pa=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,ga=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,ma=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;function fa(t){const[,e,r,a,s,i,n,o]=t;return[da(e,s,a,r,i,n,o),xe.utcInstance]}function ya(t){const[,e,r,a,s,i,n,o]=t;return[da(e,o,r,a,s,i,n),xe.utcInstance]}const va=Wr(/([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,Qr),ba=Wr(/(\d{4})-?W(\d\d)(?:-?(\d))?/,Qr),wa=Wr(/(\d{4})-?(\d{3})/,Qr),_a=Wr(Jr),xa=Rr(function(t,e){return[{year:ra(t,e),month:ra(t,e+1,1),day:ra(t,e+2,1)},null,e+3]},aa,sa,ia),Sa=Rr(Kr,aa,sa,ia),$a=Rr(Xr,aa,sa,ia),Da=Rr(aa,sa,ia);const ka=Rr(aa);const Ca=Wr(/(\d{4})-(\d\d)-(\d\d)/,ea),Aa=Wr(ta),Oa=Rr(aa,sa,ia);const Ma="Invalid Duration",Ta={weeks:{days:7,hours:168,minutes:10080,seconds:604800,milliseconds:6048e5},days:{hours:24,minutes:1440,seconds:86400,milliseconds:864e5},hours:{minutes:60,seconds:3600,milliseconds:36e5},minutes:{seconds:60,milliseconds:6e4},seconds:{milliseconds:1e3}},Ea={years:{quarters:4,months:12,weeks:52,days:365,hours:8760,minutes:525600,seconds:31536e3,milliseconds:31536e6},quarters:{months:3,weeks:13,days:91,hours:2184,minutes:131040,seconds:7862400,milliseconds:78624e5},months:{weeks:4,days:30,hours:720,minutes:43200,seconds:2592e3,milliseconds:2592e6},...Ta},Na=365.2425,La=30.436875,Ia={years:{quarters:4,months:12,weeks:52.1775,days:Na,hours:8765.82,minutes:525949.2,seconds:525949.2*60,milliseconds:525949.2*60*1e3},quarters:{months:3,weeks:13.044375,days:91.310625,hours:2191.455,minutes:131487.3,seconds:525949.2*60/4,milliseconds:7889237999.999999},months:{weeks:4.3481250000000005,days:La,hours:730.485,minutes:43829.1,seconds:2629746,milliseconds:2629746e3},...Ta},Va=["years","quarters","months","weeks","days","hours","minutes","seconds","milliseconds"],Pa=Va.slice(0).reverse();function za(t,e,r=!1){const a={values:r?e.values:{...t.values,...e.values||{}},loc:t.loc.clone(e.loc),conversionAccuracy:e.conversionAccuracy||t.conversionAccuracy,matrix:e.matrix||t.matrix};return new Za(a)}function Fa(t,e){let r=e.milliseconds??0;for(const a of Pa.slice(1))e[a]&&(r+=e[a]*t[a].milliseconds);return r}function Ha(t,e){const r=Fa(t,e)<0?-1:1;Va.reduceRight((a,s)=>{if(tr(e[s]))return a;if(a){const i=e[a]*r,n=t[s][a],o=Math.floor(i/n);e[s]+=o*r,e[a]-=o*n*r}return s},null),Va.reduce((r,a)=>{if(tr(e[a]))return r;if(r){const s=e[r]%1;e[r]-=s,e[a]+=s*t[r][a]}return a},null)}function ja(t){const e={};for(const[r,a]of Object.entries(t))0!==a&&(e[r]=a);return e}class Za{constructor(t){const e="longterm"===t.conversionAccuracy||!1;let r=e?Ia:Ea;t.matrix&&(r=t.matrix),this.values=t.values,this.loc=t.loc||we.create(),this.conversionAccuracy=e?"longterm":"casual",this.invalid=t.invalid||null,this.matrix=r,this.isLuxonDuration=!0}static fromMillis(t,e){return Za.fromObject({milliseconds:t},e)}static fromObject(t,e={}){if(null==t||"object"!=typeof t)throw new kt("Duration.fromObject: argument expected to be an object, got "+(null===t?"null":typeof t));return new Za({values:$r(t,Za.normalizeUnit),loc:we.fromObject(e),conversionAccuracy:e.conversionAccuracy,matrix:e.matrix})}static fromDurationLike(t){if(er(t))return Za.fromMillis(t);if(Za.isDuration(t))return t;if("object"==typeof t)return Za.fromObject(t);throw new kt(`Unknown duration argument ${t} of type ${typeof t}`)}static fromISO(t,e){const[r]=function(t){return qr(t,[oa,la])}(t);return r?Za.fromObject(r,e):Za.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static fromISOTime(t,e){const[r]=function(t){return qr(t,[na,ka])}(t);return r?Za.fromObject(r,e):Za.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static invalid(t,e=null){if(!t)throw new kt("need to specify a reason the Duration is invalid");const r=t instanceof Fe?t:new Fe(t,e);if(ze.throwOnInvalid)throw new St(r);return new Za({invalid:r})}static normalizeUnit(t){const e={year:"years",years:"years",quarter:"quarters",quarters:"quarters",month:"months",months:"months",week:"weeks",weeks:"weeks",day:"days",days:"days",hour:"hours",hours:"hours",minute:"minutes",minutes:"minutes",second:"seconds",seconds:"seconds",millisecond:"milliseconds",milliseconds:"milliseconds"}[t?t.toLowerCase():t];if(!e)throw new Dt(t);return e}static isDuration(t){return t&&t.isLuxonDuration||!1}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}toFormat(t,e={}){const r={...e,floor:!1!==e.round&&!1!==e.floor};return this.isValid?Zr.create(this.loc,r).formatDurationFromString(this,t):Ma}toHuman(t={}){if(!this.isValid)return Ma;const e=!1!==t.showZeros,r=Va.map(r=>{const a=this.values[r];return tr(a)||0===a&&!e?null:this.loc.numberFormatter({style:"unit",unitDisplay:"long",...t,unit:r.slice(0,-1)}).format(a)}).filter(t=>t);return this.loc.listFormatter({type:"conjunction",style:t.listStyle||"narrow",...t}).format(r)}toObject(){return this.isValid?{...this.values}:{}}toISO(){if(!this.isValid)return null;let t="P";return 0!==this.years&&(t+=this.years+"Y"),0===this.months&&0===this.quarters||(t+=this.months+3*this.quarters+"M"),0!==this.weeks&&(t+=this.weeks+"W"),0!==this.days&&(t+=this.days+"D"),0===this.hours&&0===this.minutes&&0===this.seconds&&0===this.milliseconds||(t+="T"),0!==this.hours&&(t+=this.hours+"H"),0!==this.minutes&&(t+=this.minutes+"M"),0===this.seconds&&0===this.milliseconds||(t+=pr(this.seconds+this.milliseconds/1e3,3)+"S"),"P"===t&&(t+="T0S"),t}toISOTime(t={}){if(!this.isValid)return null;const e=this.toMillis();if(e<0||e>=864e5)return null;t={suppressMilliseconds:!1,suppressSeconds:!1,includePrefix:!1,format:"extended",...t,includeOffset:!1};return Is.fromMillis(e,{zone:"UTC"}).toISOTime(t)}toJSON(){return this.toISO()}toString(){return this.toISO()}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Duration { values: ${JSON.stringify(this.values)} }`:`Duration { Invalid, reason: ${this.invalidReason} }`}toMillis(){return this.isValid?Fa(this.matrix,this.values):NaN}valueOf(){return this.toMillis()}plus(t){if(!this.isValid)return this;const e=Za.fromDurationLike(t),r={};for(const t of Va)(nr(e.values,t)||nr(this.values,t))&&(r[t]=e.get(t)+this.get(t));return za(this,{values:r},!0)}minus(t){if(!this.isValid)return this;const e=Za.fromDurationLike(t);return this.plus(e.negate())}mapUnits(t){if(!this.isValid)return this;const e={};for(const r of Object.keys(this.values))e[r]=Sr(t(this.values[r],r));return za(this,{values:e},!0)}get(t){return this[Za.normalizeUnit(t)]}set(t){if(!this.isValid)return this;return za(this,{values:{...this.values,...$r(t,Za.normalizeUnit)}})}reconfigure({locale:t,numberingSystem:e,conversionAccuracy:r,matrix:a}={}){return za(this,{loc:this.loc.clone({locale:t,numberingSystem:e}),matrix:a,conversionAccuracy:r})}as(t){return this.isValid?this.shiftTo(t).get(t):NaN}normalize(){if(!this.isValid)return this;const t=this.toObject();return Ha(this.matrix,t),za(this,{values:t},!0)}rescale(){if(!this.isValid)return this;return za(this,{values:ja(this.normalize().shiftToAll().toObject())},!0)}shiftTo(...t){if(!this.isValid)return this;if(0===t.length)return this;t=t.map(t=>Za.normalizeUnit(t));const e={},r={},a=this.toObject();let s;for(const i of Va)if(t.indexOf(i)>=0){s=i;let t=0;for(const e in r)t+=this.matrix[e][i]*r[e],r[e]=0;er(a[i])&&(t+=a[i]);const n=Math.trunc(t);e[i]=n,r[i]=(1e3*t-1e3*n)/1e3}else er(a[i])&&(r[i]=a[i]);for(const t in r)0!==r[t]&&(e[s]+=t===s?r[t]:r[t]/this.matrix[s][t]);return Ha(this.matrix,e),za(this,{values:e},!0)}shiftToAll(){return this.isValid?this.shiftTo("years","months","weeks","days","hours","minutes","seconds","milliseconds"):this}negate(){if(!this.isValid)return this;const t={};for(const e of Object.keys(this.values))t[e]=0===this.values[e]?0:-this.values[e];return za(this,{values:t},!0)}removeZeros(){if(!this.isValid)return this;return za(this,{values:ja(this.values)},!0)}get years(){return this.isValid?this.values.years||0:NaN}get quarters(){return this.isValid?this.values.quarters||0:NaN}get months(){return this.isValid?this.values.months||0:NaN}get weeks(){return this.isValid?this.values.weeks||0:NaN}get days(){return this.isValid?this.values.days||0:NaN}get hours(){return this.isValid?this.values.hours||0:NaN}get minutes(){return this.isValid?this.values.minutes||0:NaN}get seconds(){return this.isValid?this.values.seconds||0:NaN}get milliseconds(){return this.isValid?this.values.milliseconds||0:NaN}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}equals(t){if(!this.isValid||!t.isValid)return!1;if(!this.loc.equals(t.loc))return!1;function e(t,e){return void 0===t||0===t?void 0===e||0===e:t===e}for(const r of Va)if(!e(this.values[r],t.values[r]))return!1;return!0}}const Ua="Invalid Interval";class Wa{constructor(t){this.s=t.start,this.e=t.end,this.invalid=t.invalid||null,this.isLuxonInterval=!0}static invalid(t,e=null){if(!t)throw new kt("need to specify a reason the Interval is invalid");const r=t instanceof Fe?t:new Fe(t,e);if(ze.throwOnInvalid)throw new xt(r);return new Wa({invalid:r})}static fromDateTimes(t,e){const r=Vs(t),a=Vs(e),s=function(t,e){return t&&t.isValid?e&&e.isValid?e<t?Wa.invalid("end before start",`The end of an interval must be after its start, but you had start=${t.toISO()} and end=${e.toISO()}`):null:Wa.invalid("missing or invalid end"):Wa.invalid("missing or invalid start")}(r,a);return null==s?new Wa({start:r,end:a}):s}static after(t,e){const r=Za.fromDurationLike(e),a=Vs(t);return Wa.fromDateTimes(a,a.plus(r))}static before(t,e){const r=Za.fromDurationLike(e),a=Vs(t);return Wa.fromDateTimes(a.minus(r),a)}static fromISO(t,e){const[r,a]=(t||"").split("/",2);if(r&&a){let t,s,i,n;try{t=Is.fromISO(r,e),s=t.isValid}catch(a){s=!1}try{i=Is.fromISO(a,e),n=i.isValid}catch(a){n=!1}if(s&&n)return Wa.fromDateTimes(t,i);if(s){const r=Za.fromISO(a,e);if(r.isValid)return Wa.after(t,r)}else if(n){const t=Za.fromISO(r,e);if(t.isValid)return Wa.before(i,t)}}return Wa.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static isInterval(t){return t&&t.isLuxonInterval||!1}get start(){return this.isValid?this.s:null}get end(){return this.isValid?this.e:null}get lastDateTime(){return this.isValid&&this.e?this.e.minus(1):null}get isValid(){return null===this.invalidReason}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}length(t="milliseconds"){return this.isValid?this.toDuration(t).get(t):NaN}count(t="milliseconds",e){if(!this.isValid)return NaN;const r=this.start.startOf(t,e);let a;return a=e?.useLocaleWeeks?this.end.reconfigure({locale:r.locale}):this.end,a=a.startOf(t,e),Math.floor(a.diff(r,t).get(t))+(a.valueOf()!==this.end.valueOf())}hasSame(t){return!!this.isValid&&(this.isEmpty()||this.e.minus(1).hasSame(this.s,t))}isEmpty(){return this.s.valueOf()===this.e.valueOf()}isAfter(t){return!!this.isValid&&this.s>t}isBefore(t){return!!this.isValid&&this.e<=t}contains(t){return!!this.isValid&&(this.s<=t&&this.e>t)}set({start:t,end:e}={}){return this.isValid?Wa.fromDateTimes(t||this.s,e||this.e):this}splitAt(...t){if(!this.isValid)return[];const e=t.map(Vs).filter(t=>this.contains(t)).sort((t,e)=>t.toMillis()-e.toMillis()),r=[];let{s:a}=this,s=0;for(;a<this.e;){const t=e[s]||this.e,i=+t>+this.e?this.e:t;r.push(Wa.fromDateTimes(a,i)),a=i,s+=1}return r}splitBy(t){const e=Za.fromDurationLike(t);if(!this.isValid||!e.isValid||0===e.as("milliseconds"))return[];let r,{s:a}=this,s=1;const i=[];for(;a<this.e;){const t=this.start.plus(e.mapUnits(t=>t*s));r=+t>+this.e?this.e:t,i.push(Wa.fromDateTimes(a,r)),a=r,s+=1}return i}divideEqually(t){return this.isValid?this.splitBy(this.length()/t).slice(0,t):[]}overlaps(t){return this.e>t.s&&this.s<t.e}abutsStart(t){return!!this.isValid&&+this.e===+t.s}abutsEnd(t){return!!this.isValid&&+t.e===+this.s}engulfs(t){return!!this.isValid&&(this.s<=t.s&&this.e>=t.e)}equals(t){return!(!this.isValid||!t.isValid)&&(this.s.equals(t.s)&&this.e.equals(t.e))}intersection(t){if(!this.isValid)return this;const e=this.s>t.s?this.s:t.s,r=this.e<t.e?this.e:t.e;return e>=r?null:Wa.fromDateTimes(e,r)}union(t){if(!this.isValid)return this;const e=this.s<t.s?this.s:t.s,r=this.e>t.e?this.e:t.e;return Wa.fromDateTimes(e,r)}static merge(t){const[e,r]=t.sort((t,e)=>t.s-e.s).reduce(([t,e],r)=>e?e.overlaps(r)||e.abutsStart(r)?[t,e.union(r)]:[t.concat([e]),r]:[t,r],[[],null]);return r&&e.push(r),e}static xor(t){let e=null,r=0;const a=[],s=t.map(t=>[{time:t.s,type:"s"},{time:t.e,type:"e"}]),i=Array.prototype.concat(...s).sort((t,e)=>t.time-e.time);for(const t of i)r+="s"===t.type?1:-1,1===r?e=t.time:(e&&+e!==+t.time&&a.push(Wa.fromDateTimes(e,t.time)),e=null);return Wa.merge(a)}difference(...t){return Wa.xor([this].concat(t)).map(t=>this.intersection(t)).filter(t=>t&&!t.isEmpty())}toString(){return this.isValid?`[${this.s.toISO()} – ${this.e.toISO()})`:Ua}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`:`Interval { Invalid, reason: ${this.invalidReason} }`}toLocaleString(t=Tt,e={}){return this.isValid?Zr.create(this.s.loc.clone(e),t).formatInterval(this):Ua}toISO(t){return this.isValid?`${this.s.toISO(t)}/${this.e.toISO(t)}`:Ua}toISODate(){return this.isValid?`${this.s.toISODate()}/${this.e.toISODate()}`:Ua}toISOTime(t){return this.isValid?`${this.s.toISOTime(t)}/${this.e.toISOTime(t)}`:Ua}toFormat(t,{separator:e=" – "}={}){return this.isValid?`${this.s.toFormat(t)}${e}${this.e.toFormat(t)}`:Ua}toDuration(t,e){return this.isValid?this.e.diff(this.s,t,e):Za.invalid(this.invalidReason)}mapEndpoints(t){return Wa.fromDateTimes(t(this.s),t(this.e))}}class Ra{static hasDST(t=ze.defaultZone){const e=Is.now().setZone(t).set({month:12});return!t.isUniversal&&e.offset!==e.set({month:6}).offset}static isValidIANAZone(t){return ie.isValidZone(t)}static normalizeZone(t){return $e(t,ze.defaultZone)}static getStartOfWeek({locale:t=null,locObj:e=null}={}){return(e||we.create(t)).getStartOfWeek()}static getMinimumDaysInFirstWeek({locale:t=null,locObj:e=null}={}){return(e||we.create(t)).getMinDaysInFirstWeek()}static getWeekendWeekdays({locale:t=null,locObj:e=null}={}){return(e||we.create(t)).getWeekendDays().slice()}static months(t="long",{locale:e=null,numberingSystem:r=null,locObj:a=null,outputCalendar:s="gregory"}={}){return(a||we.create(e,r,s)).months(t)}static monthsFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:a=null,outputCalendar:s="gregory"}={}){return(a||we.create(e,r,s)).months(t,!0)}static weekdays(t="long",{locale:e=null,numberingSystem:r=null,locObj:a=null}={}){return(a||we.create(e,r,null)).weekdays(t)}static weekdaysFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:a=null}={}){return(a||we.create(e,r,null)).weekdays(t,!0)}static meridiems({locale:t=null}={}){return we.create(t).meridiems()}static eras(t="short",{locale:e=null}={}){return we.create(e,null,"gregory").eras(t)}static features(){return{relative:ar(),localeWeek:sr()}}}function qa(t,e){const r=t=>t.toUTC(0,{keepLocalTime:!0}).startOf("day").valueOf(),a=r(e)-r(t);return Math.floor(Za.fromMillis(a).as("days"))}function Ya(t,e,r,a){let[s,i,n,o]=function(t,e,r){const a=[["years",(t,e)=>e.year-t.year],["quarters",(t,e)=>e.quarter-t.quarter+4*(e.year-t.year)],["months",(t,e)=>e.month-t.month+12*(e.year-t.year)],["weeks",(t,e)=>{const r=qa(t,e);return(r-r%7)/7}],["days",qa]],s={},i=t;let n,o;for(const[l,c]of a)r.indexOf(l)>=0&&(n=l,s[l]=c(t,e),o=i.plus(s),o>e?(s[l]--,(t=i.plus(s))>e&&(o=t,s[l]--,t=i.plus(s))):t=o);return[t,s,o,n]}(t,e,r);const l=e-s,c=r.filter(t=>["hours","minutes","seconds","milliseconds"].indexOf(t)>=0);0===c.length&&(n<e&&(n=s.plus({[o]:1})),n!==s&&(i[o]=(i[o]||0)+l/(n-s)));const d=Za.fromObject(i,a);return c.length>0?Za.fromMillis(l,a).shiftTo(...c).plus(d):d}function Ba(t,e=t=>t){return{regex:t,deser:([t])=>e(function(t){let e=parseInt(t,10);if(isNaN(e)){e="";for(let r=0;r<t.length;r++){const a=t.charCodeAt(r);if(-1!==t[r].search(De.hanidec))e+=Ce.indexOf(t[r]);else for(const t in ke){const[r,s]=ke[t];a>=r&&a<=s&&(e+=a-r)}}return parseInt(e,10)}return e}(t))}}const Ga=`[ ${String.fromCharCode(160)}]`,Ja=new RegExp(Ga,"g");function Qa(t){return t.replace(/\./g,"\\.?").replace(Ja,Ga)}function Ka(t){return t.replace(/\./g,"").replace(Ja," ").toLowerCase()}function Xa(t,e){return null===t?null:{regex:RegExp(t.map(Qa).join("|")),deser:([r])=>t.findIndex(t=>Ka(r)===Ka(t))+e}}function ts(t,e){return{regex:t,deser:([,t,e])=>xr(t,e),groups:e}}function es(t){return{regex:t,deser:([t])=>t}}const rs={year:{"2-digit":"yy",numeric:"yyyyy"},month:{numeric:"M","2-digit":"MM",short:"MMM",long:"MMMM"},day:{numeric:"d","2-digit":"dd"},weekday:{short:"EEE",long:"EEEE"},dayperiod:"a",dayPeriod:"a",hour12:{numeric:"h","2-digit":"hh"},hour24:{numeric:"H","2-digit":"HH"},minute:{numeric:"m","2-digit":"mm"},second:{numeric:"s","2-digit":"ss"},timeZoneName:{long:"ZZZZZ",short:"ZZZ"}};let as=null;function ss(t,e){return Array.prototype.concat(...t.map(t=>function(t,e){if(t.literal)return t;const r=os(Zr.macroTokenToFormatOpts(t.val),e);return null==r||r.includes(void 0)?t:r}(t,e)))}class is{constructor(t,e){if(this.locale=t,this.format=e,this.tokens=ss(Zr.parseFormat(e),t),this.units=this.tokens.map(e=>function(t,e){const r=Oe(e),a=Oe(e,"{2}"),s=Oe(e,"{3}"),i=Oe(e,"{4}"),n=Oe(e,"{6}"),o=Oe(e,"{1,2}"),l=Oe(e,"{1,3}"),c=Oe(e,"{1,6}"),d=Oe(e,"{1,9}"),u=Oe(e,"{2,4}"),h=Oe(e,"{4,6}"),p=t=>{return{regex:RegExp((e=t.val,e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"))),deser:([t])=>t,literal:!0};var e},g=(g=>{if(t.literal)return p(g);switch(g.val){case"G":return Xa(e.eras("short"),0);case"GG":return Xa(e.eras("long"),0);case"y":return Ba(c);case"yy":case"kk":return Ba(u,wr);case"yyyy":case"kkkk":return Ba(i);case"yyyyy":return Ba(h);case"yyyyyy":return Ba(n);case"M":case"L":case"d":case"H":case"h":case"m":case"q":case"s":case"W":return Ba(o);case"MM":case"LL":case"dd":case"HH":case"hh":case"mm":case"qq":case"ss":case"WW":return Ba(a);case"MMM":return Xa(e.months("short",!0),1);case"MMMM":return Xa(e.months("long",!0),1);case"LLL":return Xa(e.months("short",!1),1);case"LLLL":return Xa(e.months("long",!1),1);case"o":case"S":return Ba(l);case"ooo":case"SSS":return Ba(s);case"u":return es(d);case"uu":return es(o);case"uuu":case"E":case"c":return Ba(r);case"a":return Xa(e.meridiems(),0);case"EEE":return Xa(e.weekdays("short",!1),1);case"EEEE":return Xa(e.weekdays("long",!1),1);case"ccc":return Xa(e.weekdays("short",!0),1);case"cccc":return Xa(e.weekdays("long",!0),1);case"Z":case"ZZ":return ts(new RegExp(`([+-]${o.source})(?::(${a.source}))?`),2);case"ZZZ":return ts(new RegExp(`([+-]${o.source})(${a.source})?`),2);case"z":return es(/[a-z_+-/]{1,256}?/i);case" ":return es(/[^\S\n\r]/);default:return p(g)}})(t)||{invalidReason:"missing Intl.DateTimeFormat.formatToParts support"};return g.token=t,g}(e,t)),this.disqualifyingUnit=this.units.find(t=>t.invalidReason),!this.disqualifyingUnit){const[t,e]=function(t){const e=t.map(t=>t.regex).reduce((t,e)=>`${t}(${e.source})`,"");return[`^${e}$`,t]}(this.units);this.regex=RegExp(t,"i"),this.handlers=e}}explainFromTokens(t){if(this.isValid){const[e,r]=function(t,e,r){const a=t.match(e);if(a){const t={};let e=1;for(const s in r)if(nr(r,s)){const i=r[s],n=i.groups?i.groups+1:1;!i.literal&&i.token&&(t[i.token.val[0]]=i.deser(a.slice(e,e+n))),e+=n}return[a,t]}return[a,{}]}(t,this.regex,this.handlers),[a,s,i]=r?function(t){let e,r=null;tr(t.z)||(r=ie.create(t.z)),tr(t.Z)||(r||(r=new xe(t.Z)),e=t.Z),tr(t.q)||(t.M=3*(t.q-1)+1),tr(t.h)||(t.h<12&&1===t.a?t.h+=12:12===t.h&&0===t.a&&(t.h=0)),0===t.G&&t.y&&(t.y=-t.y),tr(t.u)||(t.S=hr(t.u));const a=Object.keys(t).reduce((e,r)=>{const a=(t=>{switch(t){case"S":return"millisecond";case"s":return"second";case"m":return"minute";case"h":case"H":return"hour";case"d":return"day";case"o":return"ordinal";case"L":case"M":return"month";case"y":return"year";case"E":case"c":return"weekday";case"W":return"weekNumber";case"k":return"weekYear";case"q":return"quarter";default:return null}})(r);return a&&(e[a]=t[r]),e},{});return[a,r,e]}(r):[null,null,void 0];if(nr(r,"a")&&nr(r,"H"))throw new $t("Can't include meridiem when specifying 24-hour format");return{input:t,tokens:this.tokens,regex:this.regex,rawMatches:e,matches:r,result:a,zone:s,specificOffset:i}}return{input:t,tokens:this.tokens,invalidReason:this.invalidReason}}get isValid(){return!this.disqualifyingUnit}get invalidReason(){return this.disqualifyingUnit?this.disqualifyingUnit.invalidReason:null}}function ns(t,e,r){return new is(t,r).explainFromTokens(e)}function os(t,e){if(!t)return null;const r=Zr.create(e,t).dtFormatter((as||(as=Is.fromMillis(1555555555555)),as)),a=r.formatToParts(),s=r.resolvedOptions();return a.map(e=>function(t,e,r){const{type:a,value:s}=t;if("literal"===a){const t=/^\s+$/.test(s);return{literal:!t,val:t?" ":s}}const i=e[a];let n=a;"hour"===a&&(n=null!=e.hour12?e.hour12?"hour12":"hour24":null!=e.hourCycle?"h11"===e.hourCycle||"h12"===e.hourCycle?"hour12":"hour24":r.hour12?"hour12":"hour24");let o=rs[n];if("object"==typeof o&&(o=o[i]),o)return{literal:!1,val:o}}(e,t,s))}const ls="Invalid DateTime",cs=864e13;function ds(t){return new Fe("unsupported zone",`the zone "${t.name}" is not supported`)}function us(t){return null===t.weekData&&(t.weekData=Ye(t.c)),t.weekData}function hs(t){return null===t.localWeekData&&(t.localWeekData=Ye(t.c,t.loc.getMinDaysInFirstWeek(),t.loc.getStartOfWeek())),t.localWeekData}function ps(t,e){const r={ts:t.ts,zone:t.zone,c:t.c,o:t.o,loc:t.loc,invalid:t.invalid};return new Is({...r,...e,old:r})}function gs(t,e,r){let a=t-60*e*1e3;const s=r.offset(a);if(e===s)return[a,e];a-=60*(s-e)*1e3;const i=r.offset(a);return s===i?[a,s]:[t-60*Math.min(s,i)*1e3,Math.max(s,i)]}function ms(t,e){const r=new Date(t+=60*e*1e3);return{year:r.getUTCFullYear(),month:r.getUTCMonth()+1,day:r.getUTCDate(),hour:r.getUTCHours(),minute:r.getUTCMinutes(),second:r.getUTCSeconds(),millisecond:r.getUTCMilliseconds()}}function fs(t,e,r){return gs(yr(t),e,r)}function ys(t,e){const r=t.o,a=t.c.year+Math.trunc(e.years),s=t.c.month+Math.trunc(e.months)+3*Math.trunc(e.quarters),i={...t.c,year:a,month:s,day:Math.min(t.c.day,fr(a,s))+Math.trunc(e.days)+7*Math.trunc(e.weeks)},n=Za.fromObject({years:e.years-Math.trunc(e.years),quarters:e.quarters-Math.trunc(e.quarters),months:e.months-Math.trunc(e.months),weeks:e.weeks-Math.trunc(e.weeks),days:e.days-Math.trunc(e.days),hours:e.hours,minutes:e.minutes,seconds:e.seconds,milliseconds:e.milliseconds}).as("milliseconds"),o=yr(i);let[l,c]=gs(o,r,t.zone);return 0!==n&&(l+=n,c=t.zone.offset(l)),{ts:l,o:c}}function vs(t,e,r,a,s,i){const{setZone:n,zone:o}=r;if(t&&0!==Object.keys(t).length||e){const a=e||o,s=Is.fromObject(t,{...r,zone:a,specificOffset:i});return n?s:s.setZone(o)}return Is.invalid(new Fe("unparsable",`the input "${s}" can't be parsed as ${a}`))}function bs(t,e,r=!0){return t.isValid?Zr.create(we.create("en-US"),{allowZ:r,forceSimple:!0}).formatDateTimeFromString(t,e):null}function ws(t,e,r){const a=t.c.year>9999||t.c.year<0;let s="";if(a&&t.c.year>=0&&(s+="+"),s+=cr(t.c.year,a?6:4),"year"===r)return s;if(e){if(s+="-",s+=cr(t.c.month),"month"===r)return s;s+="-"}else if(s+=cr(t.c.month),"month"===r)return s;return s+=cr(t.c.day),s}function _s(t,e,r,a,s,i,n){let o=!r||0!==t.c.millisecond||0!==t.c.second,l="";switch(n){case"day":case"month":case"year":break;default:if(l+=cr(t.c.hour),"hour"===n)break;if(e){if(l+=":",l+=cr(t.c.minute),"minute"===n)break;o&&(l+=":",l+=cr(t.c.second))}else{if(l+=cr(t.c.minute),"minute"===n)break;o&&(l+=cr(t.c.second))}if("second"===n)break;!o||a&&0===t.c.millisecond||(l+=".",l+=cr(t.c.millisecond,3))}return s&&(t.isOffsetFixed&&0===t.offset&&!i?l+="Z":t.o<0?(l+="-",l+=cr(Math.trunc(-t.o/60)),l+=":",l+=cr(Math.trunc(-t.o%60))):(l+="+",l+=cr(Math.trunc(t.o/60)),l+=":",l+=cr(Math.trunc(t.o%60)))),i&&(l+="["+t.zone.ianaName+"]"),l}const xs={month:1,day:1,hour:0,minute:0,second:0,millisecond:0},Ss={weekNumber:1,weekday:1,hour:0,minute:0,second:0,millisecond:0},$s={ordinal:1,hour:0,minute:0,second:0,millisecond:0},Ds=["year","month","day","hour","minute","second","millisecond"],ks=["weekYear","weekNumber","weekday","hour","minute","second","millisecond"],Cs=["year","ordinal","hour","minute","second","millisecond"];function As(t){const e={year:"year",years:"year",month:"month",months:"month",day:"day",days:"day",hour:"hour",hours:"hour",minute:"minute",minutes:"minute",quarter:"quarter",quarters:"quarter",second:"second",seconds:"second",millisecond:"millisecond",milliseconds:"millisecond",weekday:"weekday",weekdays:"weekday",weeknumber:"weekNumber",weeksnumber:"weekNumber",weeknumbers:"weekNumber",weekyear:"weekYear",weekyears:"weekYear",ordinal:"ordinal"}[t.toLowerCase()];if(!e)throw new Dt(t);return e}function Os(t){switch(t.toLowerCase()){case"localweekday":case"localweekdays":return"localWeekday";case"localweeknumber":case"localweeknumbers":return"localWeekNumber";case"localweekyear":case"localweekyears":return"localWeekYear";default:return As(t)}}function Ms(t,e){const r=$e(e.zone,ze.defaultZone);if(!r.isValid)return Is.invalid(ds(r));const a=we.fromObject(e);let s,i;if(tr(t.year))s=ze.now();else{for(const e of Ds)tr(t[e])&&(t[e]=xs[e]);const e=Ke(t)||Xe(t);if(e)return Is.invalid(e);const a=function(t){if(void 0===Ns&&(Ns=ze.now()),"iana"!==t.type)return t.offset(Ns);const e=t.name;let r=Ls.get(e);return void 0===r&&(r=t.offset(Ns),Ls.set(e,r)),r}(r);[s,i]=fs(t,a,r)}return new Is({ts:s,zone:r,loc:a,o:i})}function Ts(t,e,r){const a=!!tr(r.round)||r.round,s=tr(r.rounding)?"trunc":r.rounding,i=(t,i)=>{t=pr(t,a||r.calendary?0:2,r.calendary?"round":s);return e.loc.clone(r).relFormatter(r).format(t,i)},n=a=>r.calendary?e.hasSame(t,a)?0:e.startOf(a).diff(t.startOf(a),a).get(a):e.diff(t,a).get(a);if(r.unit)return i(n(r.unit),r.unit);for(const t of r.units){const e=n(t);if(Math.abs(e)>=1)return i(e,t)}return i(t>e?-0:0,r.units[r.units.length-1])}function Es(t){let e,r={};return t.length>0&&"object"==typeof t[t.length-1]?(r=t[t.length-1],e=Array.from(t).slice(0,t.length-1)):e=Array.from(t),[r,e]}let Ns;const Ls=new Map;class Is{constructor(t){const e=t.zone||ze.defaultZone;let r=t.invalid||(Number.isNaN(t.ts)?new Fe("invalid input"):null)||(e.isValid?null:ds(e));this.ts=tr(t.ts)?ze.now():t.ts;let a=null,s=null;if(!r){if(t.old&&t.old.ts===this.ts&&t.old.zone.equals(e))[a,s]=[t.old.c,t.old.o];else{const i=er(t.o)&&!t.old?t.o:e.offset(this.ts);a=ms(this.ts,i),r=Number.isNaN(a.year)?new Fe("invalid input"):null,a=r?null:a,s=r?null:i}}this._zone=e,this.loc=t.loc||we.create(),this.invalid=r,this.weekData=null,this.localWeekData=null,this.c=a,this.o=s,this.isLuxonDateTime=!0}static now(){return new Is({})}static local(){const[t,e]=Es(arguments),[r,a,s,i,n,o,l]=e;return Ms({year:r,month:a,day:s,hour:i,minute:n,second:o,millisecond:l},t)}static utc(){const[t,e]=Es(arguments),[r,a,s,i,n,o,l]=e;return t.zone=xe.utcInstance,Ms({year:r,month:a,day:s,hour:i,minute:n,second:o,millisecond:l},t)}static fromJSDate(t,e={}){const r=function(t){return"[object Date]"===Object.prototype.toString.call(t)}(t)?t.valueOf():NaN;if(Number.isNaN(r))return Is.invalid("invalid input");const a=$e(e.zone,ze.defaultZone);return a.isValid?new Is({ts:r,zone:a,loc:we.fromObject(e)}):Is.invalid(ds(a))}static fromMillis(t,e={}){if(er(t))return t<-cs||t>cs?Is.invalid("Timestamp out of range"):new Is({ts:t,zone:$e(e.zone,ze.defaultZone),loc:we.fromObject(e)});throw new kt(`fromMillis requires a numerical input, but received a ${typeof t} with value ${t}`)}static fromSeconds(t,e={}){if(er(t))return new Is({ts:1e3*t,zone:$e(e.zone,ze.defaultZone),loc:we.fromObject(e)});throw new kt("fromSeconds requires a numerical input")}static fromObject(t,e={}){t=t||{};const r=$e(e.zone,ze.defaultZone);if(!r.isValid)return Is.invalid(ds(r));const a=we.fromObject(e),s=$r(t,Os),{minDaysInFirstWeek:i,startOfWeek:n}=Qe(s,a),o=ze.now(),l=tr(e.specificOffset)?r.offset(o):e.specificOffset,c=!tr(s.ordinal),d=!tr(s.year),u=!tr(s.month)||!tr(s.day),h=d||u,p=s.weekYear||s.weekNumber;if((h||c)&&p)throw new $t("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(u&&c)throw new $t("Can't mix ordinal dates with month/day");const g=p||s.weekday&&!h;let m,f,y=ms(o,l);g?(m=ks,f=Ss,y=Ye(y,i,n)):c?(m=Cs,f=$s,y=Ge(y)):(m=Ds,f=xs);let v=!1;for(const t of m){tr(s[t])?s[t]=v?f[t]:y[t]:v=!0}const b=g?function(t,e=4,r=1){const a=rr(t.weekYear),s=lr(t.weekNumber,1,br(t.weekYear,e,r)),i=lr(t.weekday,1,7);return a?s?!i&&Ze("weekday",t.weekday):Ze("week",t.weekNumber):Ze("weekYear",t.weekYear)}(s,i,n):c?function(t){const e=rr(t.year),r=lr(t.ordinal,1,mr(t.year));return e?!r&&Ze("ordinal",t.ordinal):Ze("year",t.year)}(s):Ke(s),w=b||Xe(s);if(w)return Is.invalid(w);const _=g?Be(s,i,n):c?Je(s):s,[x,S]=fs(_,l,r),$=new Is({ts:x,zone:r,o:S,loc:a});return s.weekday&&h&&t.weekday!==$.weekday?Is.invalid("mismatched weekday",`you can't specify both a weekday of ${s.weekday} and a date of ${$.toISO()}`):$.isValid?$:Is.invalid($.invalid)}static fromISO(t,e={}){const[r,a]=function(t){return qr(t,[va,xa],[ba,Sa],[wa,$a],[_a,Da])}(t);return vs(r,a,e,"ISO 8601",t)}static fromRFC2822(t,e={}){const[r,a]=function(t){return qr(function(t){return t.replace(/\([^()]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").trim()}(t),[ua,ha])}(t);return vs(r,a,e,"RFC 2822",t)}static fromHTTP(t,e={}){const[r,a]=function(t){return qr(t,[pa,fa],[ga,fa],[ma,ya])}(t);return vs(r,a,e,"HTTP",e)}static fromFormat(t,e,r={}){if(tr(t)||tr(e))throw new kt("fromFormat requires an input string and a format");const{locale:a=null,numberingSystem:s=null}=r,i=we.fromOpts({locale:a,numberingSystem:s,defaultToEN:!0}),[n,o,l,c]=function(t,e,r){const{result:a,zone:s,specificOffset:i,invalidReason:n}=ns(t,e,r);return[a,s,i,n]}(i,t,e);return c?Is.invalid(c):vs(n,o,r,`format ${e}`,t,l)}static fromString(t,e,r={}){return Is.fromFormat(t,e,r)}static fromSQL(t,e={}){const[r,a]=function(t){return qr(t,[Ca,xa],[Aa,Oa])}(t);return vs(r,a,e,"SQL",t)}static invalid(t,e=null){if(!t)throw new kt("need to specify a reason the DateTime is invalid");const r=t instanceof Fe?t:new Fe(t,e);if(ze.throwOnInvalid)throw new _t(r);return new Is({invalid:r})}static isDateTime(t){return t&&t.isLuxonDateTime||!1}static parseFormatForOpts(t,e={}){const r=os(t,we.fromObject(e));return r?r.map(t=>t?t.val:null).join(""):null}static expandFormat(t,e={}){return ss(Zr.parseFormat(t),we.fromObject(e)).map(t=>t.val).join("")}static resetCache(){Ns=void 0,Ls.clear()}get(t){return this[t]}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}get outputCalendar(){return this.isValid?this.loc.outputCalendar:null}get zone(){return this._zone}get zoneName(){return this.isValid?this.zone.name:null}get year(){return this.isValid?this.c.year:NaN}get quarter(){return this.isValid?Math.ceil(this.c.month/3):NaN}get month(){return this.isValid?this.c.month:NaN}get day(){return this.isValid?this.c.day:NaN}get hour(){return this.isValid?this.c.hour:NaN}get minute(){return this.isValid?this.c.minute:NaN}get second(){return this.isValid?this.c.second:NaN}get millisecond(){return this.isValid?this.c.millisecond:NaN}get weekYear(){return this.isValid?us(this).weekYear:NaN}get weekNumber(){return this.isValid?us(this).weekNumber:NaN}get weekday(){return this.isValid?us(this).weekday:NaN}get isWeekend(){return this.isValid&&this.loc.getWeekendDays().includes(this.weekday)}get localWeekday(){return this.isValid?hs(this).weekday:NaN}get localWeekNumber(){return this.isValid?hs(this).weekNumber:NaN}get localWeekYear(){return this.isValid?hs(this).weekYear:NaN}get ordinal(){return this.isValid?Ge(this.c).ordinal:NaN}get monthShort(){return this.isValid?Ra.months("short",{locObj:this.loc})[this.month-1]:null}get monthLong(){return this.isValid?Ra.months("long",{locObj:this.loc})[this.month-1]:null}get weekdayShort(){return this.isValid?Ra.weekdays("short",{locObj:this.loc})[this.weekday-1]:null}get weekdayLong(){return this.isValid?Ra.weekdays("long",{locObj:this.loc})[this.weekday-1]:null}get offset(){return this.isValid?+this.o:NaN}get offsetNameShort(){return this.isValid?this.zone.offsetName(this.ts,{format:"short",locale:this.locale}):null}get offsetNameLong(){return this.isValid?this.zone.offsetName(this.ts,{format:"long",locale:this.locale}):null}get isOffsetFixed(){return this.isValid?this.zone.isUniversal:null}get isInDST(){return!this.isOffsetFixed&&(this.offset>this.set({month:1,day:1}).offset||this.offset>this.set({month:5}).offset)}getPossibleOffsets(){if(!this.isValid||this.isOffsetFixed)return[this];const t=864e5,e=6e4,r=yr(this.c),a=this.zone.offset(r-t),s=this.zone.offset(r+t),i=this.zone.offset(r-a*e),n=this.zone.offset(r-s*e);if(i===n)return[this];const o=r-i*e,l=r-n*e,c=ms(o,i),d=ms(l,n);return c.hour===d.hour&&c.minute===d.minute&&c.second===d.second&&c.millisecond===d.millisecond?[ps(this,{ts:o}),ps(this,{ts:l})]:[this]}get isInLeapYear(){return gr(this.year)}get daysInMonth(){return fr(this.year,this.month)}get daysInYear(){return this.isValid?mr(this.year):NaN}get weeksInWeekYear(){return this.isValid?br(this.weekYear):NaN}get weeksInLocalWeekYear(){return this.isValid?br(this.localWeekYear,this.loc.getMinDaysInFirstWeek(),this.loc.getStartOfWeek()):NaN}resolvedLocaleOptions(t={}){const{locale:e,numberingSystem:r,calendar:a}=Zr.create(this.loc.clone(t),t).resolvedOptions(this);return{locale:e,numberingSystem:r,outputCalendar:a}}toUTC(t=0,e={}){return this.setZone(xe.instance(t),e)}toLocal(){return this.setZone(ze.defaultZone)}setZone(t,{keepLocalTime:e=!1,keepCalendarTime:r=!1}={}){if((t=$e(t,ze.defaultZone)).equals(this.zone))return this;if(t.isValid){let a=this.ts;if(e||r){const e=t.offset(this.ts),r=this.toObject();[a]=fs(r,e,t)}return ps(this,{ts:a,zone:t})}return Is.invalid(ds(t))}reconfigure({locale:t,numberingSystem:e,outputCalendar:r}={}){return ps(this,{loc:this.loc.clone({locale:t,numberingSystem:e,outputCalendar:r})})}setLocale(t){return this.reconfigure({locale:t})}set(t){if(!this.isValid)return this;const e=$r(t,Os),{minDaysInFirstWeek:r,startOfWeek:a}=Qe(e,this.loc),s=!tr(e.weekYear)||!tr(e.weekNumber)||!tr(e.weekday),i=!tr(e.ordinal),n=!tr(e.year),o=!tr(e.month)||!tr(e.day),l=n||o,c=e.weekYear||e.weekNumber;if((l||i)&&c)throw new $t("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(o&&i)throw new $t("Can't mix ordinal dates with month/day");let d;s?d=Be({...Ye(this.c,r,a),...e},r,a):tr(e.ordinal)?(d={...this.toObject(),...e},tr(e.day)&&(d.day=Math.min(fr(d.year,d.month),d.day))):d=Je({...Ge(this.c),...e});const[u,h]=fs(d,this.o,this.zone);return ps(this,{ts:u,o:h})}plus(t){if(!this.isValid)return this;return ps(this,ys(this,Za.fromDurationLike(t)))}minus(t){if(!this.isValid)return this;return ps(this,ys(this,Za.fromDurationLike(t).negate()))}startOf(t,{useLocaleWeeks:e=!1}={}){if(!this.isValid)return this;const r={},a=Za.normalizeUnit(t);switch(a){case"years":r.month=1;case"quarters":case"months":r.day=1;case"weeks":case"days":r.hour=0;case"hours":r.minute=0;case"minutes":r.second=0;case"seconds":r.millisecond=0}if("weeks"===a)if(e){const t=this.loc.getStartOfWeek(),{weekday:e}=this;e<t&&(r.weekNumber=this.weekNumber-1),r.weekday=t}else r.weekday=1;if("quarters"===a){const t=Math.ceil(this.month/3);r.month=3*(t-1)+1}return this.set(r)}endOf(t,e){return this.isValid?this.plus({[t]:1}).startOf(t,e).minus(1):this}toFormat(t,e={}){return this.isValid?Zr.create(this.loc.redefaultToEN(e)).formatDateTimeFromString(this,t):ls}toLocaleString(t=Tt,e={}){return this.isValid?Zr.create(this.loc.clone(e),t).formatDateTime(this):ls}toLocaleParts(t={}){return this.isValid?Zr.create(this.loc.clone(t),t).formatDateTimeParts(this):[]}toISO({format:t="extended",suppressSeconds:e=!1,suppressMilliseconds:r=!1,includeOffset:a=!0,extendedZone:s=!1,precision:i="milliseconds"}={}){if(!this.isValid)return null;const n="extended"===t;let o=ws(this,n,i=As(i));return Ds.indexOf(i)>=3&&(o+="T"),o+=_s(this,n,e,r,a,s,i),o}toISODate({format:t="extended",precision:e="day"}={}){return this.isValid?ws(this,"extended"===t,As(e)):null}toISOWeekDate(){return bs(this,"kkkk-'W'WW-c")}toISOTime({suppressMilliseconds:t=!1,suppressSeconds:e=!1,includeOffset:r=!0,includePrefix:a=!1,extendedZone:s=!1,format:i="extended",precision:n="milliseconds"}={}){if(!this.isValid)return null;return n=As(n),(a&&Ds.indexOf(n)>=3?"T":"")+_s(this,"extended"===i,e,t,r,s,n)}toRFC2822(){return bs(this,"EEE, dd LLL yyyy HH:mm:ss ZZZ",!1)}toHTTP(){return bs(this.toUTC(),"EEE, dd LLL yyyy HH:mm:ss 'GMT'")}toSQLDate(){return this.isValid?ws(this,!0):null}toSQLTime({includeOffset:t=!0,includeZone:e=!1,includeOffsetSpace:r=!0}={}){let a="HH:mm:ss.SSS";return(e||t)&&(r&&(a+=" "),e?a+="z":t&&(a+="ZZ")),bs(this,a,!0)}toSQL(t={}){return this.isValid?`${this.toSQLDate()} ${this.toSQLTime(t)}`:null}toString(){return this.isValid?this.toISO():ls}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`:`DateTime { Invalid, reason: ${this.invalidReason} }`}valueOf(){return this.toMillis()}toMillis(){return this.isValid?this.ts:NaN}toSeconds(){return this.isValid?this.ts/1e3:NaN}toUnixInteger(){return this.isValid?Math.floor(this.ts/1e3):NaN}toJSON(){return this.toISO()}toBSON(){return this.toJSDate()}toObject(t={}){if(!this.isValid)return{};const e={...this.c};return t.includeConfig&&(e.outputCalendar=this.outputCalendar,e.numberingSystem=this.loc.numberingSystem,e.locale=this.loc.locale),e}toJSDate(){return new Date(this.isValid?this.ts:NaN)}diff(t,e="milliseconds",r={}){if(!this.isValid||!t.isValid)return Za.invalid("created by diffing an invalid DateTime");const a={locale:this.locale,numberingSystem:this.numberingSystem,...r},s=(o=e,Array.isArray(o)?o:[o]).map(Za.normalizeUnit),i=t.valueOf()>this.valueOf(),n=Ya(i?this:t,i?t:this,s,a);var o;return i?n.negate():n}diffNow(t="milliseconds",e={}){return this.diff(Is.now(),t,e)}until(t){return this.isValid?Wa.fromDateTimes(this,t):this}hasSame(t,e,r){if(!this.isValid)return!1;const a=t.valueOf(),s=this.setZone(t.zone,{keepLocalTime:!0});return s.startOf(e,r)<=a&&a<=s.endOf(e,r)}equals(t){return this.isValid&&t.isValid&&this.valueOf()===t.valueOf()&&this.zone.equals(t.zone)&&this.loc.equals(t.loc)}toRelative(t={}){if(!this.isValid)return null;const e=t.base||Is.fromObject({},{zone:this.zone}),r=t.padding?this<e?-t.padding:t.padding:0;let a=["years","months","days","hours","minutes","seconds"],s=t.unit;return Array.isArray(t.unit)&&(a=t.unit,s=void 0),Ts(e,this.plus(r),{...t,numeric:"always",units:a,unit:s})}toRelativeCalendar(t={}){return this.isValid?Ts(t.base||Is.fromObject({},{zone:this.zone}),this,{...t,numeric:"auto",units:["years","months","days"],calendary:!0}):null}static min(...t){if(!t.every(Is.isDateTime))throw new kt("min requires all arguments be DateTimes");return ir(t,t=>t.valueOf(),Math.min)}static max(...t){if(!t.every(Is.isDateTime))throw new kt("max requires all arguments be DateTimes");return ir(t,t=>t.valueOf(),Math.max)}static fromFormatExplain(t,e,r={}){const{locale:a=null,numberingSystem:s=null}=r;return ns(we.fromOpts({locale:a,numberingSystem:s,defaultToEN:!0}),t,e)}static fromStringExplain(t,e,r={}){return Is.fromFormatExplain(t,e,r)}static buildFormatParser(t,e={}){const{locale:r=null,numberingSystem:a=null}=e,s=we.fromOpts({locale:r,numberingSystem:a,defaultToEN:!0});return new is(s,t)}static fromFormatParser(t,e,r={}){if(tr(t)||tr(e))throw new kt("fromFormatParser requires an input string and a format parser");const{locale:a=null,numberingSystem:s=null}=r,i=we.fromOpts({locale:a,numberingSystem:s,defaultToEN:!0});if(!i.equals(e.locale))throw new kt(`fromFormatParser called with a locale of ${i}, but the format parser was created for ${e.locale}`);const{result:n,zone:o,specificOffset:l,invalidReason:c}=e.explainFromTokens(t);return c?Is.invalid(c):vs(n,o,r,`format ${e.format}`,t,l)}static get DATE_SHORT(){return Tt}static get DATE_MED(){return Et}static get DATE_MED_WITH_WEEKDAY(){return Nt}static get DATE_FULL(){return Lt}static get DATE_HUGE(){return It}static get TIME_SIMPLE(){return Vt}static get TIME_WITH_SECONDS(){return Pt}static get TIME_WITH_SHORT_OFFSET(){return zt}static get TIME_WITH_LONG_OFFSET(){return Ft}static get TIME_24_SIMPLE(){return Ht}static get TIME_24_WITH_SECONDS(){return jt}static get TIME_24_WITH_SHORT_OFFSET(){return Zt}static get TIME_24_WITH_LONG_OFFSET(){return Ut}static get DATETIME_SHORT(){return Wt}static get DATETIME_SHORT_WITH_SECONDS(){return Rt}static get DATETIME_MED(){return qt}static get DATETIME_MED_WITH_SECONDS(){return Yt}static get DATETIME_MED_WITH_WEEKDAY(){return Bt}static get DATETIME_FULL(){return Gt}static get DATETIME_FULL_WITH_SECONDS(){return Jt}static get DATETIME_HUGE(){return Qt}static get DATETIME_HUGE_WITH_SECONDS(){return Kt}}function Vs(t){if(Is.isDateTime(t))return t;if(t&&t.valueOf&&er(t.valueOf()))return Is.fromJSDate(t);if(t&&"object"==typeof t)return Is.fromObject(t);throw new kt(`Unknown datetime argument: ${t}, of type ${typeof t}`)}const Ps=o`
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
`;class zs{static normalizeStage(t){const e=t.toLowerCase();return"veg"===e?"vegetative":"mom"===e?"mother":e}static getPlantStageColor(t){const e=this.normalizeStage(t);return this.stageColors[e]??"#757575"}static getPlantStageIcon(t){const e=this.normalizeStage(t);return this.stageIcons[e]??bt}static getPlantStage(t){const e=t?.attributes??{},r=new Date;return e.cure_start?"cure":e.dry_start?"dry":e.mom_start?"mother":e.clone_start?"clone":e.flower_start&&new Date(e.flower_start)<=r?"flower":e.veg_start&&new Date(e.veg_start)<=r?"vegetative":"seedling"}static createGridLayout(t,e,r){const a=Array.from({length:e},()=>Array.from({length:r},()=>null));return t.forEach(t=>{const s=(t.attributes?.row??1)-1,i=(t.attributes?.col??1)-1;s>=0&&s<e&&i>=0&&i<r&&(a[s][i]=t)}),{rows:e,cols:r,grid:a}}static calculateEffectiveRows(t){const{name:e,plants:r,plants_per_row:a}=t;if("dry"===e||"cure"===e||"mother"===e||"clone"===e){if(0===r.length)return 1;const t=Math.max(...r.map(t=>t.attributes?.row||1)),e=r.filter(e=>(e.attributes?.row||1)===t).length;return e>=a?t+1:t}return a}static parseDateTimeLocal(t){if(t)try{const e=16===t.length?t+":00":t,r=new Date(e);if(isNaN(r.getTime()))return;const a=r.getFullYear(),s=String(r.getMonth()+1).padStart(2,"0"),i=String(r.getDate()).padStart(2,"0"),n=String(r.getHours()).padStart(2,"0"),o=String(r.getMinutes()).padStart(2,"0");return`${a}-${s}-${i}T${n}:${o}:${String(r.getSeconds()).padStart(2,"0")}`}catch{return}}static formatDateForBackend(t){if(t)try{const e=t.split("T");if(e.length>0&&e[0].match(/^\d{4}-\d{2}-\d{2}$/))return e[0];const r=new Date(t);if(isNaN(r.getTime()))return;const a=r.getFullYear(),s=String(r.getMonth()+1).padStart(2,"0");return`${a}-${s}-${String(r.getDate()).padStart(2,"0")}`}catch{return}}static getCurrentDateTime(){const t=new Date,e=t=>t.toString().padStart(2,"0");return`${t.getFullYear()}-${e(t.getMonth()+1)}-${e(t.getDate())}T${e(t.getHours())}:${e(t.getMinutes())}:00`}static toDateTimeLocal(t){if(!t)return"";try{const e=new Date(t);if(isNaN(e.getTime()))return"";const r=t=>t.toString().padStart(2,"0"),a=e.getFullYear(),s=r(e.getMonth()+1),i=r(e.getDate()),n=r(e.getHours());return`${a}-${s}-${i}T${n}:${r(e.getMinutes())}`}catch{return""}}static getDominantStage(t){if(!t||0===t.length)return null;const e=["cure","dry","flower","vegetative","clone","mother","seedling"];let r=null,a=0;const s={};for(const e of t){const t=this.normalizeStage(e.state||this.getPlantStage(e));s[t]||(s[t]=[]),s[t].push(e)}for(const t of e)if(s[t]&&s[t].length>0){r=t;const e=`${"vegetative"===t?"veg":t}_days`,i=s[t].map(t=>{const r=t.attributes[e];return"number"==typeof r?r:0});a=Math.max(...i);break}return r?{stage:r,days:a}:null}}zs.stageColors={mother:"#E91E63",clone:"#FF5722",seedling:"#4CAF50",vegetative:"#8BC34A",flower:"#FF9800",dry:"#795548",cure:"#9C27B0"},zs.stageIcons={mother:bt,clone:bt,seedling:bt,vegetative:bt,flower:ft,dry:yt,cure:gt};class Fs{constructor(t){this.hass=t}getGrowspaceDevices(){if(!this.hass)return[];const t=Object.values(this.hass.states),e=t.filter(t=>t.entity_id.startsWith("sensor.")&&void 0!==t.attributes?.growspace_id&&void 0!==t.attributes?.rows&&void 0!==t.attributes?.plants_per_row&&void 0===t.attributes?.row&&void 0===t.attributes?.col),r=new Map;return e.forEach(t=>{const e=t.attributes.growspace_id;r.set(e,[])}),t.forEach(t=>{if(void 0!==t.attributes?.row&&void 0!==t.attributes?.col){const e=this.getGrowspaceId(t);r.has(e)||r.set(e,[]),r.get(e).push(t)}}),Array.from(r.entries()).map(([t,r])=>{const a=e.find(e=>e.attributes?.growspace_id===t),s=a?.attributes?.friendly_name||`Growspace ${t}`,i=a?.attributes?.type??(s.toLowerCase().includes("dry")?"dry":s.toLowerCase().includes("cure")?"cure":"normal");return n={device_id:t,overview_entity_id:a?.entity_id,name:s,plants:r,rows:a?.attributes?.rows??3,plants_per_row:a?.attributes?.plants_per_row??3,type:i},{...n,type:n.type??"normal"};var n})}getGrowspaceId(t){return t.attributes?.growspace_id||"unknown"}getStrainLibrary(){const t=Object.values(this.hass.states).find(t=>void 0!==t.attributes?.strains&&null!==t.attributes?.strains),e=t?.attributes?.strains;return e?Array.isArray(e)?e.map(t=>({strain:t,phenotype:"",key:`${t}|default`})):"object"==typeof e?Object.keys(e).map(t=>{const e=t.split("|");return{strain:e[0],phenotype:e.length>1&&"default"!==e[1]?e[1]:"",key:t}}).sort((t,e)=>t.strain.localeCompare(e.strain)):[]:[]}async getHistory(t,e,r){if(!this.hass)return[];let a=`history/period/${e.toISOString()}?filter_entity_id=${t}`;r&&(a+=`&end_time=${r.toISOString()}`);try{const t=await this.hass.callApi("GET",a);return t&&t.length>0?t[0]:[]}catch(t){return console.error("Error fetching history:",t),[]}}async addPlant(t){console.log("[DataService:addPlant] Sending payload:",t);try{"mother"!==t.growspace_id&&"mother_overview"!==t.growspace_id||(t.mother_start=(new Date).toISOString().split("T")[0]),"clone"!==t.growspace_id&&"clone_overview"!==t.growspace_id||(t.clone_start=(new Date).toISOString().split("T")[0]);const e=await this.hass.callService("growspace_manager","add_plant",t);return console.log("[DataService:addPlant] Response:",e),e}catch(t){throw console.error("[DataService:addPlant] Error:",t),t}}async updatePlant(t){console.log("[DataService:updatePlant] Sending payload:",t);try{const e=await this.hass.callService("growspace_manager","update_plant",t);return console.log("[DataService:updatePlant] Response:",e),e}catch(t){throw console.error("[DataService:updatePlant] Error:",t),t}}async removePlant(t){console.log("[DataService:removePlant] Removing plant_id:",t);try{const e=await this.hass.callService("growspace_manager","remove_plant",{plant_id:t});return console.log("[DataService:removePlant] Response:",e),e}catch(t){throw console.error("[DataService:removePlant] Error:",t),t}}async harvestPlant(t,e="dry"){console.log("[DataService:harvestPlant] Harvesting plant:",t,"→ target:",e);try{const r=(e||"").toLowerCase(),a={plant_id:t};r.includes("dry")?a.target_growspace_id="dry_overview":r.includes("cure")?a.target_growspace_id="cure_overview":r.includes("mother")?a.target_growspace_id="mother_overview":r.includes("clone")?a.target_growspace_id="clone_overview":r&&(a.target_growspace_name=e);const s=await this.hass.callService("growspace_manager","harvest_plant",a);return console.log("[DataService:harvestPlant] Response:",s),s}catch(t){throw console.error("[DataService:harvestPlant] Error:",t),t}}async takeClone(t,e="clone"){console.log("[DataService:takeClone] Cloning plant:",t,"→ target:",e);try{const r=(e||"").toLowerCase(),a={plant_id:t};r.includes("dry")?a.target_growspace_id="dry_overview":r.includes("cure")?a.target_growspace_id="cure_overview":r.includes("mother")?a.target_growspace_id="mother_overview":r.includes("clone")?a.target_growspace_id="clone_overview":r&&(a.target_growspace_name=e);const s=await this.hass.callService("growspace_manager","takeClone",a);return console.log("[DataService:takeClone] Response:",s),s}catch(t){throw console.error("[DataService:takeClone] Error:",t),t}}async swapPlants(t,e){console.log(`[DataService:swapPlants] Swapping plants: ${t} and ${e}`);try{const r=await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e});return console.log("[DataService:swapPlants] Response:",r),r}catch(t){throw console.error("[DataService:swapPlants] Error:",t),t}}async addStrain(t,e){console.log("[DataService:addStrain] Adding strain:",t,e);try{const r=await this.hass.callService("growspace_manager","add_strain",{strain:t,phenotype:e});return console.log("[DataService:addStrain] Response:",r),r}catch(t){throw console.error("[DataService:addStrain] Error:",t),t}}async removeStrain(t,e){console.log("[DataService:removeStrain] Removing strain:",t,e);try{const r=await this.hass.callService("growspace_manager","remove_strain",{strain:t,phenotype:e});return console.log("[DataService:removeStrain] Response:",r),r}catch(t){throw console.error("[DataService:removeStrain] Error:",t),t}}async importStrainLibrary(t){console.log("[DataService:importStrainLibrary] Importing strains:",t);try{const e=await this.hass.callService("growspace_manager","import_strain_library",{strains:t});return console.log("[DataService:importStrainLibrary] Response:",e),e}catch(t){throw console.error("[DataService:importStrainLibrary] Error:",t),t}}async clearStrainLibrary(){console.log("[DataService:clearStrainLibrary] Clearing library");try{const t=await this.hass.callService("growspace_manager","clear_strain_library");return console.log("[DataService:clearStrainLibrary] Response:",t),t}catch(t){throw console.error("[DataService:clearStrainLibrary] Error:",t),t}}}class Hs{static renderAddPlantDialog(t,e,r){if(!t?.open)return U``;const a=[...new Set(e.map(t=>t.strain))].sort();return U`
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
                 <path d="${mt}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${Hs.renderMD3SelectInput("Strain *",t.strain||"",a,r.onStrainChange)}
               ${Hs.renderMD3TextInput("Phenotype",t.phenotype||"",r.onPhenotypeChange)}
               <div style="display:flex; gap:16px;">
                 ${Hs.renderMD3NumberInput("Row",t.row+1,t=>r.onRowChange(t))}
                 ${Hs.renderMD3NumberInput("Col",t.col+1,t=>r.onColChange(t))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${Hs.renderMD3DateInput("Vegetative Start",t.veg_start||"",r.onVegStartChange)}
               ${Hs.renderMD3DateInput("Flower Start",t.flower_start||"",r.onFlowerStartChange)}
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
    `}static renderPlantOverviewDialog(t,e,r){if(!t?.open)return U``;const{plant:a,editedAttributes:s}=t,i=a.attributes?.plant_id||a.entity_id.replace("sensor.",""),n=zs.getPlantStageColor(a.state),o=zs.getPlantStageIcon(a.state),l=(t,e)=>{s[t]="number"==typeof e?e.toString():e,r.onAttributeChange(t,s[t])};return U`
      <ha-dialog
        open
        @closed=${r.onClose}
        hideActions
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="glass-dialog-container" style="--stage-color: ${n}">

          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${o}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
               <h2 class="dialog-title">${s.strain||"Unknown Strain"}</h2>
               <div class="dialog-subtitle">${a.state} Stage • ${s.phenotype||"No Phenotype"}</div>
            </div>
            <button class="md3-button text" @click=${r.onClose} style="min-width: auto; padding: 8px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                 <path d="${mt}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY & LOCATION CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${Hs.renderMD3TextInput("Strain Name",s.strain||"",t=>r.onAttributeChange("strain",t))}
               ${Hs.renderMD3TextInput("Phenotype",s.phenotype||"",t=>r.onAttributeChange("phenotype",t))}
               <div style="display:flex; gap:16px;">
                 ${Hs.renderMD3NumberInput("Row",s.row||1,t=>r.onAttributeChange("row",parseInt(t)))}
                 ${Hs.renderMD3NumberInput("Col",s.col||1,t=>r.onAttributeChange("col",parseInt(t)))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${"mother"===s.stage?Hs.renderMD3DateInput("Mother Start",s.mother_start??"",t=>l("mother_start",t)):R}
               ${"clone"===s.stage?Hs.renderMD3DateInput("Clone Start",s.clone_start??"",t=>l("clone_start",t)):R}
               ${"veg"===s.stage||"flower"===s.stage?Hs.renderMD3DateInput("Vegetative Start",s.veg_start??"",t=>l("veg_start",t)):R}
               ${"flower"===s.stage?Hs.renderMD3DateInput("Flower Start",s.flower_start??"",t=>l("flower_start",t)):R}
               ${"dry"===s.stage||"cure"===s.stage?Hs.renderMD3DateInput("Dry Start",s.dry_start??"",t=>l("dry_start",t)):R}
               ${"cure"===s.stage?Hs.renderMD3DateInput("Cure Start",s.cure_start??"",t=>l("cure_start",t)):R}
             </div>

             <!-- STATS CARD -->
             ${Hs.renderPlantStatsMD3(a)}

          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
             <button class="md3-button danger" @click=${()=>r.onDelete(i)}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"}"></path></svg>
               Delete
             </button>

             <button class="md3-button tonal" @click=${r.onUpdate}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"}"></path></svg>
               Save Changes
             </button>

             <!-- DYNAMIC ACTIONS BASED ON STAGE -->
             ${"mother"===a.state.toLowerCase()?U`
                <div class="take-clone-container" style="display:contents;" data-plant-id="${a.entity_id}">
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
                    @click=${t=>{const e=t.currentTarget.previousElementSibling,s=e?parseInt(e.value,10):1;r.onTakeClone(a,s)}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"}"></path></svg>
                    Take Clone
                  </button>
                </div>
             `:R}

             ${"flower"===a.state.toLowerCase()?U`
               <button class="md3-button primary" @click=${()=>r.onHarvest(a)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ft}"></path></svg>
                 Harvest
               </button>
             `:R}

             ${"dry"===a.state.toLowerCase()?U`
               <button class="md3-button primary" @click=${()=>r.onFinishDrying(a)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${gt}"></path></svg>
                 Finish Drying
               </button>
             `:R}

             ${"clone"===a.state.toLowerCase()?U`
               <div style="display:contents;">
                  <select class="md3-input" style="width: auto; height: 40px; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 0 16px;" id="clone-target-select">
                    <option value="">Move to...</option>
                    ${Object.entries(e).map(([t,e])=>U`<option value="${t}">${e}</option>`)}
                  </select>
                  <button class="md3-button primary"
                    @click=${t=>{const e=t.currentTarget.previousElementSibling;e.value?r.onMoveClone(a,e.value):alert("Select a growspace")}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"}"></path></svg>
                    Move
                  </button>
               </div>
             `:R}
          </div>

        </div>
      </ha-dialog>
    `}static renderStrainLibraryDialog(t,e){if(!t?.open)return U``;const r={},a=(t.searchQuery||"").toLowerCase();t.strains.forEach(t=>{const e=t.strain;(!a||e.toLowerCase().includes(a)||t.phenotype&&t.phenotype.toLowerCase().includes(a))&&(r[e]||(r[e]=[]),r[e].push(t))});const s=Object.keys(r).sort();return U`
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
            ${s.length>0?U`
              <table class="strain-table">
                ${s.map(a=>{const s=t.expandedStrains?.includes(a),i=r[a];return i.filter(t=>t.phenotype).length,U`
                    <tr class="strain-row" @click=${()=>e.onToggleExpand(a)}>
                      <td class="strain-cell expand-icon">
                        <svg style="width:24px;height:24px;fill:currentColor;"
                             class="rotate-icon ${s?"expanded":""}"
                             viewBox="0 0 24 24">
                          <path d="${"M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"}"></path>
                        </svg>
                      </td>
                      <td class="strain-cell content">
                        ${a}
                        <span class="badge">${i.length} Var.</span>
                      </td>
                    </tr>
                    ${s?U`
                      <tr class="pheno-row">
                        <td colspan="3" class="pheno-list">
                           ${i.map(t=>U`
                              <div class="pheno-item">
                                <span>${t.phenotype||"Default (No Phenotype)"}</span>
                                <button
                                  class="remove-button"
                                  title="Remove ${t.strain} ${t.phenotype}"
                                  @click=${r=>{r.stopPropagation(),e.onRemoveStrain(t.key)}}
                                >
                                  <svg class="remove-icon" viewBox="0 0 24 24">
                                    <path d="${mt}"></path>
                                  </svg>
                                </button>
                              </div>
                           `)}
                        </td>
                      </tr>
                    `:R}
                  `})}
              </table>
            `:U`
              <div class="no-data" style="background: transparent;">
                ${0===t.strains.length?"Library is empty. Add your first strain!":"No matches found."}
              </div>
            `}
          </div>

          <!-- FAB for Adding Strains -->
          <button class="fab-button" @click=${e.onToggleAddForm}>
             <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${t.isAddFormOpen?mt:vt}"></path>
             </svg>
          </button>

          <!-- Add Strain Form Overlay -->
          ${t.isAddFormOpen?U`
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
          ${t.confirmClearAll?U`
             <div class="confirmation-overlay">
                 <span style="color: white;">Delete all strains?</span>
                 <button class="action-button danger" @click=${e.onClearAll}>Yes</button>
                 <button class="action-button" @click=${e.onCancelClear}>No</button>
             </div>
          `:R}

        </div>

        <!-- Footer Actions -->
        <div slot="secondaryAction">
           ${t.confirmClearAll?R:U`
              <button class="action-button danger" @click=${e.onPromptClear} ?disabled=${0===t.strains.length}>
                Clear All
              </button>
           `}
        </div>

        <button class="action-button" slot="primaryAction" @click=${e.onClose}>
          Done
        </button>
      </ha-dialog>
    `}static renderMD3TextInput(t,e,r){return U`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="text"
          class="md3-input"
          .value=${e}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderMD3SelectInput(t,e,r,a){return U`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <select
          class="md3-input"
          .value=${e}
          @change=${t=>a(t.target.value)}
        >
          <option value="">Select...</option>
          ${r.map(t=>U`<option value="${t}" ?selected=${t===e}>${t}</option>`)}
        </select>
      </div>
    `}static renderMD3NumberInput(t,e,r){return U`
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
    `}static renderMD3DateInput(t,e,r){const a=zs.toDateTimeLocal(e);return U`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="datetime-local"
          class="md3-input"
          .value=${a}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderTextInput(t,e,r){return U`
      <div class="form-group">
        <label>${t}</label>
        <input 
          type="text" 
          class="form-input"
          .value=${e}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderNumberInput(t,e,r){return U`
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
    `}static renderDateTimeInput(t,e,r,a){return U`
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
          @input=${t=>a(t.target.value)}
        />
      </div>
    `}static renderPlantStatsMD3(t){return t.attributes?.veg_days||t.attributes?.flower_days||t.attributes?.dry_days||t.attributes?.cure_days?U`
      <div class="detail-card">
        <h3>Current Progress</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
           ${t.attributes?.veg_days?U`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-veg);">${t.attributes.veg_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Veg Days</span>
             </div>
           `:""}
           ${t.attributes?.flower_days?U`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-flower);">${t.attributes.flower_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Flower Days</span>
             </div>
           `:""}
           ${t.attributes?.dry_days?U`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-dry);">${t.attributes.dry_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Drying Days</span>
             </div>
           `:""}
           ${t.attributes?.cure_days?U`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-cure);">${t.attributes.cure_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Curing Days</span>
             </div>
           `:""}
        </div>
      </div>
    `:U``}static renderPlantStats(t){return this.renderPlantStatsMD3(t)}}let js=class extends ot{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._strainLibraryDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1,this._historyData=null,this._handleTakeClone=t=>{const e=t.attributes?.plant_id||t.entity_id.replace("sensor.","");this.hass.callService("growspace_manager","take_clone",{mother_plant_id:e}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})},this.clonePlant=(t,e)=>{const r=t.attributes?.plant_id||t.entity_id.replace("sensor.",""),a=e;this.hass.callService("growspace_manager","take_clone",{mother_plant_id:r,num_clones:a}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})}}firstUpdated(){this.dataService=new Fs(this.hass),this.initializeSelectedDevice(),this._fetchHistory()}updated(t){super.updated(t),t.has("selectedDevice")&&this._fetchHistory()}async _fetchHistory(){if(!this.hass||!this.selectedDevice)return;const t=this.dataService.getGrowspaceDevices().find(t=>t.device_id===this.selectedDevice);if(!t)return;let e=t.name.toLowerCase().replace(/\s+/g,"_");t.overview_entity_id&&(e=t.overview_entity_id.replace("sensor.",""));const r=`binary_sensor.${e}_optimal_conditions`,a=new Date,s=new Date(a.getTime()-864e5);try{const t=await this.dataService.getHistory(r,s,a);this._historyData=t}catch(t){console.error("Failed to fetch history",t)}}initializeSelectedDevice(){const t=this.dataService.getGrowspaceDevices();if(t.length&&!this.selectedDevice){if(this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);if(e)return void(this.selectedDevice=e.device_id)}this.selectedDevice=t[0].device_id}}static async getConfigElement(){await Promise.resolve().then(function(){return Us});return document.createElement("growspace-manager-card-editor")}static getStubConfig(){return{default_growspace:"4x4",compact:!0}}setConfig(t){if(!t)throw new Error("Invalid configuration");this._config=t}getCardSize(){return 4}_handleDeviceChange(t){const e=t.target;this.selectedDevice=e.value}_handlePlantClick(t){this._plantOverviewDialog={open:!0,plant:t,editedAttributes:{...t.attributes}}}getHaDateTimeString(){const t=this.hass.config.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone;return Is.now().setZone(t).toFormat("yyyy-LL-dd'T'HH:mm")}_openAddPlantDialog(t,e){const r=this.getHaDateTimeString(),a=this.dataService.getStrainLibrary(),s=a.length>0?a[0].strain:"",i=a.length>0?a[0].phenotype:"";this._addPlantDialog={open:!0,row:t,col:e,strain:s,phenotype:i,veg_start:r,flower_start:r}}async _confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const{row:t,col:e,strain:r,phenotype:a,veg_start:s,flower_start:i}=this._addPlantDialog;try{const n={growspace_id:this.selectedDevice,row:t+1,col:e+1,strain:r,phenotype:a,veg_start:zs.formatDateForBackend(s)??zs.formatDateForBackend(zs.getCurrentDateTime()),flower_start:zs.formatDateForBackend(i)??zs.formatDateForBackend(zs.getCurrentDateTime())};console.log("Adding plant to growspace:",this.selectedDevice,n),console.log("Adding plant:",n),await this.dataService.addPlant(n),this._addPlantDialog=null}catch(t){console.error("Error adding plant:",t)}}async _updatePlant(){if(!this._plantOverviewDialog)return;const{plant:t,editedAttributes:e}=this._plantOverviewDialog,r={plant_id:t.attributes?.plant_id||t.entity_id.replace("sensor.","")},a=["seedling_start","mother_start","clone_start","veg_start","flower_start","dry_start","cure_start"];["strain","phenotype","row","col",...a].forEach(t=>{if(void 0!==e[t]&&null!==e[t])if(a.includes(t)){const a=zs.formatDateForBackend(String(e[t]));a&&(r[t]=a)}else r[t]=e[t]});try{await this.dataService.updatePlant(r),this._plantOverviewDialog=null}catch(t){console.error("Error updating plant:",t)}}async _handleDeletePlant(t){if(confirm("Are you sure you want to delete this plant?"))try{await this.dataService.removePlant(t),this._plantOverviewDialog=null}catch(t){console.error("Error deleting plant:",t)}}async _movePlantToNextStage(t){if(!this._plantOverviewDialog?.plant)return void console.error("No plant found in overview dialog");const e=this._plantOverviewDialog.plant,r=e.attributes?.stage;let a="";const s=new Set(["mother","flower","dry","cure"]);if(r&&s.has(r)){"flower"===r?a="dry":"dry"===r?a="cure":"mother"===r?a="clone":(console.error("Unknown stage, cannot move plant",a),a="error");try{const t=e.attributes?.plant_id||e.entity_id.replace("sensor.","");await this.dataService.harvestPlant(t,a),this._plantOverviewDialog=null}catch(t){console.error("Error moving plant to next stage:",t)}}else alert("Plant must be in mother or flower or dry or cure stage to move. stage is "+r)}async _harvestPlant(t){await this._movePlantToNextStage(t)}async _finishDryingPlant(t){await this._movePlantToNextStage(t)}_openStrainLibraryDialog(){const t=this.dataService.getStrainLibrary();this._strainLibraryDialog={open:!0,newStrain:"",newPhenotype:"",strains:t,searchQuery:"",isAddFormOpen:!1,expandedStrains:[],confirmClearAll:!1}}_toggleStrainExpansion(t){if(!this._strainLibraryDialog)return;const e=this._strainLibraryDialog.expandedStrains||[],r=e.includes(t);this._strainLibraryDialog.expandedStrains=r?e.filter(e=>e!==t):[...e,t],this.requestUpdate()}_setStrainSearchQuery(t){this._strainLibraryDialog&&(this._strainLibraryDialog.searchQuery=t,this.requestUpdate())}_toggleAddStrainForm(){this._strainLibraryDialog&&(this._strainLibraryDialog.isAddFormOpen=!this._strainLibraryDialog.isAddFormOpen,this.requestUpdate())}_promptClearAll(){this._strainLibraryDialog&&(this._strainLibraryDialog.confirmClearAll=!0,this.requestUpdate())}_cancelClearAll(){this._strainLibraryDialog&&(this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate())}async _addStrain(){if(!this._strainLibraryDialog?.newStrain)return;const t=this._strainLibraryDialog.newStrain,e=this._strainLibraryDialog.newPhenotype;try{await this.dataService.addStrain(t,e);const r=`${t}|${e||"default"}`,a={strain:t,phenotype:e,key:r};this._strainLibraryDialog.strains.some(t=>t.key===r)||this._strainLibraryDialog.strains.push(a),this._strainLibraryDialog.newStrain="",this._strainLibraryDialog.newPhenotype="",this._strainLibraryDialog.isAddFormOpen=!1,this.requestUpdate()}catch(t){console.error("Error adding strain:",t)}}async _removeStrain(t){if(this._strainLibraryDialog)try{const e=t.split("|"),r=e[0],a=e.length>1&&"default"!==e[1]?e[1]:void 0;await this.dataService.removeStrain(r,a),this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e.key!==t),this.requestUpdate()}catch(t){console.error("Error removing strain:",t)}}async _clearStrains(){await this.dataService.clearStrainLibrary(),this._strainLibraryDialog&&(this._strainLibraryDialog.strains=[],this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate())}updateGrid(){this.dataService=new Fs(this.hass),this.requestUpdate()}_handleDragStart(t,e){this._draggedPlant=e,t.dataTransfer?.setData("text/plain",JSON.stringify({id:e.entity_id}));t.target.classList.add("dragging")}_handleDragEnd(t){t.target.classList.remove("dragging")}_handleDragOver(t){t.preventDefault()}async _handleDrop(t,e,r,a){if(t.preventDefault(),!this._draggedPlant||!this.selectedDevice)return;const s=this._draggedPlant;this._draggedPlant=null;try{if(a){const t=s.attributes.plant_id||s.entity_id.replace("sensor.",""),e=a.attributes.plant_id||a.entity_id.replace("sensor.","");await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e}),this.updateGrid()}else await this._movePlant(s,e,r)}catch(t){console.error("Error during drag-and-drop:",t)}}async _movePlant(t,e,r){try{const a=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.dataService.updatePlant({plant_id:a,row:e,col:r})}catch(t){console.error("Error moving plant:",t)}}_moveClonePlant(t,e){this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Moved clone ${t.attributes.friendly_name} to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})}render(){if(!this.hass)return U`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;this.dataService=new Fs(this.hass);const t=this.dataService.getGrowspaceDevices();if(!t.length)return U`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;if(!this._defaultApplied&&this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);e&&(this.selectedDevice=e.device_id),this._defaultApplied=!0}this.selectedDevice&&t.find(t=>t.device_id===this.selectedDevice)||(this.selectedDevice=t[0].device_id);const e=t.find(t=>t.device_id===this.selectedDevice);if(!e)return U`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;const r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;r&&Object.entries(r).forEach(([t,e])=>{});const a=zs.calculateEffectiveRows(e),{grid:s}=zs.createGridLayout(e.plants,a,e.plants_per_row),i=e.plants_per_row>6;return U`
      <ha-card class=${i?"wide-growspace":""}>
        ${this._isCompactView?"":this.renderGrowspaceHeader(e)}
        ${this.renderHeader(t)}
        ${this.renderGrid(s,a,e.plants_per_row)}
      </ha-card>
      
      ${this.renderDialogs()}
    `}renderGrowspaceHeader(t){const e=zs.getDominantStage(t.plants),r=this.dataService.getGrowspaceDevices();let a=t.name.toLowerCase().replace(/\s+/g,"_");t.overview_entity_id&&(a=t.overview_entity_id.replace("sensor.",""));const s=`binary_sensor.${a}_optimal_conditions`,i=this.hass.states[s],n=(t,e)=>{if(t&&t.attributes)return void 0!==t.attributes[e]?t.attributes[e]:t.attributes.observations&&"object"==typeof t.attributes.observations?t.attributes.observations[e]:void 0},o=n(i,"temperature"),l=n(i,"humidity"),c=n(i,"vpd"),d=n(i,"co2"),u=!0===n(i,"is_lights_on");let h="0h 0m",p=new Array(24).fill(!1);if(this._historyData&&this._historyData.length>0){const t=[...this._historyData].sort((t,e)=>new Date(e.last_changed).getTime()-new Date(t.last_changed).getTime()),e=u,r=t.findIndex(t=>!0===n(t,"is_lights_on")!==e);let a=null;if(0===r)a=new Date;else if(-1===r)t.length>0&&(a=new Date(t[t.length-1].last_changed),h="> 24h");else{const e=t[r-1];a=new Date(e.last_changed)}if(a){const t=(new Date).getTime()-a.getTime(),e=Math.floor(t/6e4);if("> 24h"!==h){h=`${Math.floor(e/60)}h ${e%60}m`}}const s=new Date;for(let e=0;e<24;e++){const r=new Date(s.getTime()-60*(23-e)*60*1e3),a=t.find(t=>new Date(t.last_changed)<=r);if(a)p[e]=!0===n(a,"is_lights_on");else if(t.length>0){const r=t[t.length-1];p[e]=!0===n(r,"is_lights_on")}}}return U`
      <div class="growspace-header-card">
         <div class="gs-header-top">
            <div class="gs-title-group">
               <!-- Title as Dropdown if no default is set -->
               ${this._config?.default_growspace?U`
                 <h3 class="gs-title">${t.name}</h3>
               `:U`
                 <select class="growspace-select-header" .value=${this.selectedDevice||""} @change=${this._handleDeviceChange}>
                    ${r.map(t=>U`<option value="${t.device_id}">${t.name}</option>`)}
                 </select>
               `}

               ${e?U`
               <div class="gs-stage-chip">
                 <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${zs.getPlantStageIcon(e.stage)}"></path></svg>
                 ${e.stage.charAt(0).toUpperCase()+e.stage.slice(1)} • Day ${e.days}
               </div>
               `:""}
            </div>

            <div class="gs-stats-chips">
                ${void 0!==o?U`<div class="stat-chip"><svg viewBox="0 0 24 24"><path d="${"M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z"}"></path></svg>${o}°C</div>`:""}
                ${void 0!==l?U`<div class="stat-chip"><svg viewBox="0 0 24 24"><path d="${"M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z"}"></path></svg>${l}%</div>`:""}
                ${void 0!==c?U`<div class="stat-chip"><svg viewBox="0 0 24 24"><path d="${"M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20M6.5 18H18.5Q19.55 18 20.27 17.27 21 16.55 21 15.5 21 14.45 20.27 13.73 19.55 13 18.5 13H17V11Q17 8.93 15.54 7.46 14.08 6 12 6 9.93 6 8.46 7.46 7 8.93 7 11H6.5Q5.05 11 4.03 12.03 3 13.05 3 14.5 3 15.95 4.03 17 5.05 18 6.5 18M12 12Z"}"></path></svg>${c} kPa</div>`:""}
                ${void 0!==d?U`<div class="stat-chip"><svg viewBox="0 0 24 24"><path d="${"M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z"}"></path></svg>${d} ppm</div>`:""}
            </div>
         </div>

         <!-- Nested Light Cycle Card -->
         <div class="gs-light-cycle-card">
            <div class="gs-light-header-row">
                <div class="gs-light-title">
                    <div class="gs-icon-box">
                       <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z"}"></path></svg>
                    </div>
                    <div>
                       <div style="font-size: 1.1rem; font-weight: 600;">Light Cycle</div>
                       <div style="font-size: 0.75rem; opacity: 0.7;">24H HISTORY</div>
                    </div>
                </div>

                ${i?U`
                <div class="light-status-chip ${u?"on":"off"}">
                   <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${u?"M12,6A6,6 0 0,1 18,12C18,14.22 16.79,16.16 15,17.2V19A1,1 0 0,1 14,20H10A1,1 0 0,1 9,19V17.2C7.21,16.16 6,14.22 6,12A6,6 0 0,1 12,6M14,21V22A1,1 0 0,1 13,23H11A1,1 0 0,1 10,22V21H14M20,11H23V13H20V11M1,11H4V13H1V11M13,1V4H11V1H13M4.92,3.5L7.05,5.64L5.63,7.05L3.5,4.93L4.92,3.5M16.95,5.63L19.07,3.5L20.5,4.93L18.37,7.05L16.95,5.63Z":"M12,2C9.76,2 7.78,3.05 6.5,4.68L16.31,14.5C17.94,13.21 19,11.24 19,9A7,7 0 0,0 12,2M3.28,4L2,5.27L5.04,8.3C5,8.53 5,8.76 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H14.73L18.73,22L20,20.72L3.28,4M9,20V21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9Z"}"></path>
                   </svg>
                   ${u?"ON":"OFF"} • ${h}
                </div>
                `:""}
            </div>

            <div class="gs-chart-container">
                <div class="gs-chart-bars">
                   ${p.map(t=>U`
                     <div class="chart-bar ${t?"active":""}"></div>
                   `)}
                </div>
                <div class="chart-markers">
                   <span>-24H</span>
                   <span>-12H</span>
                   <span>NOW</span>
                </div>
            </div>
         </div>
      </div>
    `}renderHeader(t){return t.find(t=>t.device_id===this.selectedDevice),U`
      <div class="header">
        ${this._config?.title?U`<h2 class="header-title">${this._config.title}</h2>`:""}
        
        ${this._isCompactView?U`
        <div class="selector-container">
          ${this._config?.default_growspace?U`
            <label for="device-select">Growspace:</label>
            <!-- Even if default is set, user wants dropdown in compact mode -->
            <select
              id="device-select"
              class="growspace-select"
              .value=${this.selectedDevice||""}
              @change=${this._handleDeviceChange}
            >
              ${t.map(t=>U`<option value="${t.device_id}">${t.name}</option>`)}
            </select>
          `:U`
            <label for="device-select">Growspace:</label>
            <select 
              id="device-select" 
              class="growspace-select"
              .value=${this.selectedDevice||""} 
              @change=${this._handleDeviceChange}
            >
              ${t.map(t=>U`<option value="${t.device_id}">${t.name}</option>`)}
            </select>
          `}
        </div>
        `:""}

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
              <path d="${"M4,2H6V4C6,5.44 6.68,6.61 7.88,7.78C8.74,8.61 9.89,9.41 11.09,10.2L9.26,11.39C8.27,10.72 7.31,10 6.5,9.21C5.07,7.82 4,6.1 4,4V2M18,2H20V4C20,6.1 18.93,7.82 17.5,9.21C16.09,10.59 14.29,11.73 12.54,12.84C10.79,13.96 9.09,15.05 7.88,16.22C6.68,17.39 6,18.56 6,20V22H4V20C4,17.9 5.07,16.18 6.5,14.79C7.91,13.41 9.71,12.27 11.46,11.16C13.21,10.04 14.91,8.95 16.12,7.78C17.32,6.61 18,5.44 18,4V2M14.74,12.61C15.73,13.28 16.69,14 17.5,14.79C18.93,16.18 20,17.9 20,20V22H18V20C18,18.56 17.32,17.39 16.12,16.22C15.26,15.39 14.11,14.59 12.91,13.8L14.74,12.61M7,3H17V4L16.94,4.5H7.06L7,4V3M7.68,6H16.32C16.08,6.34 15.8,6.69 15.42,7.06L14.91,7.5H9.07L8.58,7.06C8.2,6.69 7.92,6.34 7.68,6M9.09,16.5H14.93L15.42,16.94C15.8,17.31 16.08,17.66 16.32,18H7.68C7.92,17.66 8.2,17.31 8.58,16.94L9.09,16.5M7.06,19.5H16.94L17,20V21H7V20L7.06,19.5Z"}"></path>
            </svg>
            Strains
          </button>
        </div>
      </div>
    `}renderGrid(t,e,r){return U`
      <div class="grid ${this._isCompactView?"compact":""}" 
           style="grid-template-columns: repeat(${r}, 1fr); grid-template-rows: repeat(${e}, 1fr);">
        ${t.flat().map((t,e)=>{const a=Math.floor(e/r)+1,s=e%r+1;return t?this.renderPlantSlot(t,a,s):this.renderEmptySlot(a,s)})}
      </div>
    `}renderEmptySlot(t,e){return U`
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
    `}renderPlantSlot(t,e,r){const a=zs.getPlantStageColor(t.state),s=zs.getPlantStageIcon(t.state);return U`
      <div 
        class="plant" 
        style="grid-row: ${e}; grid-column: ${r}; --stage-color: ${a}"
        draggable="true"
        @dragstart=${e=>this._handleDragStart(e,t)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${a=>this._handleDrop(a,e,r,t)}
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
    `}renderPlantDays(t){const e=[{days:t.attributes?.seedling_days,icon:bt,title:"Days in Seedling",stage:"seedling"},{days:t.attributes?.mother_days,icon:bt,title:"Days in Mother",stage:"mother"},{days:t.attributes?.clone_days,icon:bt,title:"Days in Clone",stage:"clone"},{days:t.attributes?.veg_days,icon:bt,title:"Days in Vegetative",stage:"vegetative"},{days:t.attributes?.flower_days,icon:ft,title:"Days in Flower",stage:"flower"},{days:t.attributes?.dry_days,icon:yt,title:"Days in Dry",stage:"dry"},{days:t.attributes?.cure_days,icon:gt,title:"Days in Cure",stage:"cure"}].filter(t=>t.days);return e.length?U`
      <div class="plant-days">
        ${e.map(({days:t,icon:e,title:r,stage:a})=>{const s=zs.getPlantStageColor(a);return U`
            <span title="${r}" style="color: ${s}">
              <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${e}"></path>
              </svg>
              ${t}d
            </span>
          `})}
      </div>
    `:U``}renderDialogs(){const t=this.dataService?.getStrainLibrary()||[],e={},r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;return r&&Object.entries(r).forEach(([t,r])=>{e[t]=r}),U`
      ${Hs.renderAddPlantDialog(this._addPlantDialog,t,{onClose:()=>this._addPlantDialog=null,onConfirm:()=>this._confirmAddPlant(),onStrainChange:e=>{if(this._addPlantDialog){this._addPlantDialog.strain=e;const r=t.find(t=>t.strain===e);r&&r.phenotype?this._addPlantDialog.phenotype=r.phenotype:this._addPlantDialog.phenotype="",this.requestUpdate()}},onPhenotypeChange:t=>{this._addPlantDialog&&(this._addPlantDialog.phenotype=t)},onVegStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.veg_start=t)},onFlowerStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.flower_start=t)},onRowChange:t=>{if(this._addPlantDialog){const e=parseInt(t);!isNaN(e)&&e>0&&(this._addPlantDialog.row=e-1,this.requestUpdate())}},onColChange:t=>{if(this._addPlantDialog){const e=parseInt(t);!isNaN(e)&&e>0&&(this._addPlantDialog.col=e-1,this.requestUpdate())}}})}

      ${Hs.renderPlantOverviewDialog(this._plantOverviewDialog,e,{onClose:()=>this._plantOverviewDialog=null,onUpdate:()=>{this._updatePlant()},onDelete:t=>{this._handleDeletePlant(t)},onHarvest:t=>{this._harvestPlant(t)},onClone:(t,e)=>{this.clonePlant(t,e)},onTakeClone:(t,e)=>{this.clonePlant(t,e)},onMoveClone:(t,e)=>{this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Clone ${t.attributes.friendly_name} moved to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})},onFinishDrying:t=>{this._finishDryingPlant(t)},_harvestPlant:this._harvestPlant.bind(this),_finishDryingPlant:this._finishDryingPlant.bind(this),onAttributeChange:(t,e)=>{this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes[t]=e)}})}

      ${Hs.renderStrainLibraryDialog(this._strainLibraryDialog,{onClose:()=>this._strainLibraryDialog=null,onAddStrain:()=>this._addStrain(),onRemoveStrain:t=>this._removeStrain(t),onClearAll:()=>this._clearStrains(),onNewStrainChange:t=>{this._strainLibraryDialog&&(this._strainLibraryDialog.newStrain=t)},onNewPhenotypeChange:t=>{this._strainLibraryDialog&&(this._strainLibraryDialog.newPhenotype=t)},onEnterKey:t=>{"Enter"===t.key&&this._addStrain()},onToggleExpand:t=>this._toggleStrainExpansion(t),onSearch:t=>this._setStrainSearchQuery(t),onToggleAddForm:()=>this._toggleAddStrainForm(),onPromptClear:()=>this._promptClearAll(),onCancelClear:()=>this._cancelClearAll()})}
    `}};js.styles=[Ps,o`
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

      /* Growspace Header Styles - Glassmorphism & Gradient */
      .growspace-header-card {
        /* Fallback */
        background: rgba(30, 30, 35, 0.6);
        /* Gradient approximating the screenshot */
        background-image: linear-gradient(135deg, rgba(50, 50, 60, 0.8) 0%, rgba(40, 30, 60, 0.8) 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);

        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px;
        padding: 24px;
        margin-bottom: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: #fff;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      }

      .gs-header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: var(--spacing-md);
      }

      .gs-title-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .gs-title {
        font-size: 2rem;
        font-weight: 500;
        margin: 0;
        letter-spacing: -0.5px;
      }

      .gs-stage-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.15);
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 0.9rem;
        font-weight: 500;
        color: #fff;
        width: fit-content;
      }

      /* Chips Container */
      .gs-stats-chips {
         display: flex;
         flex-wrap: wrap;
         gap: 8px;
         justify-content: flex-end;
      }

      .stat-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        padding: 6px 14px;
        font-size: 0.9rem;
        color: #eee;
        backdrop-filter: blur(4px);
      }

      .stat-chip svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
        opacity: 0.9;
      }

      .light-status-chip {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 6px 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .light-status-chip.on {
        background: linear-gradient(90deg, rgba(255, 235, 59, 0.8), rgba(253, 216, 53, 0.6));
        color: #000;
        box-shadow: 0 0 15px rgba(253, 216, 53, 0.4);
        border: none;
      }

      .light-status-chip.off {
         background: rgba(0, 0, 0, 0.3);
         color: rgba(255, 255, 255, 0.7);
      }

      /* 24h Chart */
      .gs-chart-container {
         margin-top: 8px;
      }

      .gs-chart-label {
         font-size: 0.85rem;
         color: rgba(255, 255, 255, 0.7);
         margin-bottom: 6px;
      }

      .gs-chart-bars {
         display: flex;
         gap: 4px;
         height: 60px;
         width: 100%;
         align-items: flex-end;
      }

      .chart-bar {
         flex: 1;
         height: 100%;
         background: rgba(255, 255, 255, 0.05);
         border-radius: 4px;
         border: none;
         position: relative;
         overflow: hidden;
      }

      .chart-bar.active {
         background: rgba(255, 235, 59, 0.7); /* Yellowish */
         box-shadow: 0 0 8px rgba(255, 235, 59, 0.3);
      }

      /* Time markers for chart */
      .chart-markers {
         display: flex;
         justify-content: space-between;
         margin-top: 8px;
         font-size: 0.75rem;
         color: rgba(255, 255, 255, 0.5);
         font-weight: 500;
      }

      /* Light Cycle Card Nested */
      .gs-light-cycle-card {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 16px;
        padding: 20px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .gs-light-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .gs-light-title {
         font-size: 1.1rem;
         font-weight: 500;
         display: flex;
         align-items: center;
         gap: 10px;
         color: rgba(255, 255, 255, 0.9);
      }

      .gs-icon-box {
        background: rgba(255, 235, 59, 0.15);
        border-radius: 12px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 235, 59, 0.9);
      }

      /* Header Dropdown */
      .growspace-select-header {
        background: transparent;
        color: #fff;
        font-size: 2rem;
        font-weight: 500;
        font-family: inherit;
        border: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        width: auto;
        max-width: 100%;
        letter-spacing: -0.5px;
        border-bottom: 1px dashed rgba(255,255,255,0.3);
        transition: border-color 0.2s;
      }
      .growspace-select-header:hover {
         border-bottom-color: rgba(255,255,255,0.8);
      }
      .growspace-select-header:focus {
         outline: none;
         border-bottom-color: var(--primary-color);
      }
      .growspace-select-header option {
         background: var(--growspace-card-bg);
         color: var(--growspace-card-text);
         font-size: 1rem;
         padding: 10px;
      }

      /* Existing styles... */
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
        padding: 20px;

        /* Glass effect */
        background: rgba(30, 30, 35, 0.4);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      }

      .grid.compact {
        gap: var(--spacing-sm);
        padding: var(--spacing-md);
      }

      .plant {
        display: grid; 
        grid-template-columns: 1fr;
        grid-template-rows: 2fr 1fr 0.8fr 1fr 2fr;
        gap: 0px 0px;
        grid-template-areas:
          "icon"
          "name"
          "phenotype"
          "stage"
          "days";
        align-items: center;
        justify-items: center;
        cursor: pointer;
        aspect-ratio: 1;
        position: relative;
        overflow: hidden;
        min-height: 100px;
        text-align: center;
        padding: var(--spacing-md);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        /* New Glass Style (Lighter than header) */
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .plant::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: var(--stage-color, var(--plant-border-color-default));
        opacity: 0.8;
        transition: var(--transition-medium);
      }

      .plant:hover {
        transform: translateY(-4px);
        background: rgba(255, 255, 255, 0.08);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .plant.empty {
        background: rgba(0, 0, 0, 0.2);
        border: 2px dashed rgba(255, 255, 255, 0.1);
        backdrop-filter: none;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
      }

      .plant.empty:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: var(--plant-border-color-default);
        opacity: 1;
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
        grid-area: icon;
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
        grid-area: name;
        font-weight: var(--font-weight-bold);
        color: var(--growspace-card-text);
        font-size: var(--font-size-lg);
        margin-bottom: var(--spacing-xs);
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      .plant-stage {
        grid-area: stage;
        color: var(--stage-color, var(--secondary-text-color));
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-medium);
        margin-bottom: var(--spacing-xs);
        text-transform: capitalize;
      }

      .plant-phenotype {
        grid-area: phenotype;
        color: var(--secondary-text-color);
        font-size: var(--font-size-md);
        margin-bottom: var(--spacing-xs);
        font-style: italic;
      }

      .plant-days {
        grid-area: days;
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
        border-radius: 12px;
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
        --mdc-dialog-surface-fill-color: var(--growspace-card-bg);
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

      /* Glassmorphism for Dialogs */
      ha-dialog {
        --mdc-dialog-surface-fill-color: transparent; /* Transparent base for glass effect */
        --mdc-dialog-min-width: 400px;
        --mdc-dialog-max-width: 90vw;
      }

      /* Override internal dialog surface if possible, or we style the content wrapper */
      /* Note: Home Assistant dialogs use mwc-dialog which uses mdc-dialog.
         Directly styling shadow roots is hard, but we can try to influence it via variables
         or style our own container inside. */

      .glass-dialog-container {
        background: var(--growspace-card-bg);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        border-radius: 28px; /* MD3 extra large rounding */
        padding: var(--spacing-lg);
        color: #ffffff; /* Force white text for contrast against dark glass */
        margin: -24px; /* Counteract default dialog padding if necessary */
        min-width: 320px;
      }

      /* MD3 Dialog Layout */
      .dialog-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
        padding-bottom: var(--spacing-md);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .dialog-icon {
        width: 48px;
        height: 48px;
        padding: 12px;
        border-radius: 16px; /* MD3 medium shape */
        background: rgba(var(--stage-color-rgb, 76, 175, 80), 0.2);
        color: var(--stage-color, #4caf50);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .dialog-title-group {
        flex: 1;
      }

      .dialog-title {
        font-size: 1.5rem;
        font-weight: 500; /* MD3 Headline Small */
        margin: 0;
        color: #ffffff;
      }

      .dialog-subtitle {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.7);
        margin-top: 4px;
        text-transform: capitalize;
      }

      /* MD3 Cards inside Dialog */
      .detail-card {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: var(--spacing-md);
        margin-bottom: var(--spacing-md);
        border: 1px solid rgba(255, 255, 255, 0.05);
      }

      .detail-card h3 {
        margin: 0 0 var(--spacing-sm) 0;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* MD3 Input Styles */
      .md3-input-group {
        position: relative;
        margin-bottom: var(--spacing-md);
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px 4px 0 0;
        border-bottom: 1px solid var(--secondary-text-color);
        transition: background 0.2s;
      }

      .md3-input-group:hover {
        background: rgba(255, 255, 255, 0.06);
      }

      .md3-input-group:focus-within {
        background: rgba(255, 255, 255, 0.06);
        border-bottom: 2px solid var(--primary-color);
      }

      .md3-label {
        position: absolute;
        left: 16px;
        top: 8px;
        font-size: 0.75rem;
        color: var(--secondary-text-color);
        pointer-events: none;
        transition: 0.2s;
      }

      .md3-input-group:focus-within .md3-label {
        color: var(--primary-color);
      }

      .md3-input {
        width: 100%;
        padding: 24px 16px 8px;
        border: none;
        background: transparent;
        color: #ffffff;
        font-size: 1rem;
        font-family: inherit;
        box-sizing: border-box;
      }

      .md3-input:focus {
        outline: none;
      }

      /* Button Group & MD3 Buttons */
      .button-group {
        display: flex;
        gap: var(--spacing-sm);
        justify-content: flex-end;
        flex-wrap: wrap;
        margin-top: var(--spacing-lg);
      }

      .md3-button {
        height: 40px;
        padding: 0 24px;
        border-radius: 20px; /* Pill shape */
        border: none;
        font-family: inherit;
        font-weight: 500;
        font-size: 0.875rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
        text-transform: capitalize;
      }

      .md3-button.primary {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }

      .md3-button.primary:hover {
        box-shadow: 0 4px 8px rgba(0,0,0,0.4);
        filter: brightness(1.1);
      }

      .md3-button.tonal {
        background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.15);
        color: var(--primary-color);
      }

      .md3-button.tonal:hover {
        background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.25);
      }

      .md3-button.text {
        background: transparent;
        color: var(--primary-color);
      }

      .md3-button.text:hover {
        background: rgba(var(--rgb-primary-color, 33, 150, 243), 0.08);
      }

      .md3-button.danger {
        background: transparent;
        color: var(--error-color);
        border: 1px solid rgba(244, 67, 54, 0.5);
      }

      .md3-button.danger:hover {
        background: rgba(244, 67, 54, 0.1);
      }

      /* Specific adjustments for HA Dialog content constraints */
      ha-dialog {
        --mdc-theme-primary: var(--primary-color);
      }

      @media (max-width: 600px) {
        .glass-dialog-container {
            margin: -20px;
            padding: var(--spacing-md);
        }
        .dialog-header {
            flex-direction: column;
            text-align: center;
        }
        .button-group {
            justify-content: center;
        }
      }
    `],t([pt(),e("design:type",Object)],js.prototype,"_addPlantDialog",void 0),t([pt(),e("design:type",Object)],js.prototype,"_defaultApplied",void 0),t([pt(),e("design:type",Object)],js.prototype,"_plantOverviewDialog",void 0),t([pt(),e("design:type",Object)],js.prototype,"_strainLibraryDialog",void 0),t([pt(),e("design:type",Object)],js.prototype,"selectedDevice",void 0),t([pt(),e("design:type",Object)],js.prototype,"_draggedPlant",void 0),t([pt(),e("design:type",Boolean)],js.prototype,"_isCompactView",void 0),t([pt(),e("design:type",Object)],js.prototype,"_historyData",void 0),t([ht({attribute:!1}),e("design:type",Object)],js.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],js.prototype,"_config",void 0),js=t([ct("growspace-manager-card")],js);let Zs=class extends ot{constructor(){super(...arguments),this._growspaceOptions=[]}setConfig(t){this._config=t,this._loadGrowspaces()}updated(t){t.has("hass")&&this.hass&&(this._loadGrowspaces(),this._subscribeToSensorUpdates())}disconnectedCallback(){super.disconnectedCallback(),this._unsubStateChanged&&(this._unsubStateChanged(),this._unsubStateChanged=void 0)}_subscribeToSensorUpdates(){this.hass&&!this._unsubStateChanged&&(this._unsubStateChanged=this.hass.connection.subscribeEvents(t=>{const e=t.data.new_state;"sensor.growspaces_list"===e?.entity_id&&(Array.isArray(e.attributes?.growspaces)?this._growspaceOptions=e.attributes.growspaces:this._growspaceOptions=[])},"state_changed"))}_loadGrowspaces(){if(!this.hass)return;const t=this.hass.states["sensor.growspaces_list"];if(t&&t.attributes?.growspaces){const e=t.attributes.growspaces;this._growspaceOptions=Object.values(e)}else this._growspaceOptions=[]}render(){return this._config?U`
      <div class="form-group">
        <label>Default Growspace</label>
        <select
          .value=${this._config.default_growspace??""}
          @change=${t=>this._valueChanged("default_growspace",t.target.value)}
        >
          <option value="">Select a growspace</option>
          ${0===this._growspaceOptions.length?U`<option disabled>No growspaces found</option>`:this._growspaceOptions.map(t=>U`<option value="${t}">${t}</option>`)}
        </select>
      </div>
    `:U``}_valueChanged(t,e){if(!this._config)return;const r={...this._config,[t]:e};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:r},bubbles:!0,composed:!0}))}};Zs.styles=o`
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
  `,t([ht({attribute:!1}),e("design:type",Object)],Zs.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],Zs.prototype,"_config",void 0),t([pt(),e("design:type",Array)],Zs.prototype,"_growspaceOptions",void 0),Zs=t([ct("growspace-manager-card-editor")],Zs);var Us=Object.freeze({__proto__:null,get GrowspaceManagerCardEditor(){return Zs}});export{js as GrowspaceManagerCard};
