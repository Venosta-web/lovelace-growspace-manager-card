function t(t,e,r,s){var a,n=arguments.length,i=n<3?e:null===s?s=Object.getOwnPropertyDescriptor(e,r):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)i=Reflect.decorate(t,e,r,s);else for(var o=t.length-1;o>=0;o--)(a=t[o])&&(i=(n<3?a(i):n>3?a(e,r,i):a(e,r))||i);return n>3&&i&&Object.defineProperty(e,r,i),i}function e(t,e){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(t,e)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const r=globalThis,s=r.ShadowRoot&&(void 0===r.ShadyCSS||r.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,a=Symbol(),n=new WeakMap;class i{constructor(t,e,r){if(this._$cssResult$=!0,r!==a)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(s&&void 0===t){const r=void 0!==e&&1===e.length;r&&(t=n.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),r&&n.set(e,t))}return t}toString(){return this.cssText}}const o=(t,...e)=>{const r=1===t.length?t[0]:e.reduce((e,r,s)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+t[s+1],t[0]);return new i(r,t,a)},l=s?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const r of t.cssRules)e+=r.cssText;return(t=>new i("string"==typeof t?t:t+"",void 0,a))(e)})(t):t,{is:c,defineProperty:d,getOwnPropertyDescriptor:u,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:g}=Object,m=globalThis,f=m.trustedTypes,y=f?f.emptyScript:"",v=m.reactiveElementPolyfillSupport,b=(t,e)=>t,w={toAttribute(t,e){switch(e){case Boolean:t=t?y:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let r=t;switch(e){case Boolean:r=null!==t;break;case Number:r=null===t?null:Number(t);break;case Object:case Array:try{r=JSON.parse(t)}catch(t){r=null}}return r}},_=(t,e)=>!c(t,e),x={attribute:!0,type:String,converter:w,reflect:!1,useDefault:!1,hasChanged:_};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;class S extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=x){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const r=Symbol(),s=this.getPropertyDescriptor(t,r,e);void 0!==s&&d(this.prototype,t,s)}}static getPropertyDescriptor(t,e,r){const{get:s,set:a}=u(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:s,set(e){const n=s?.call(this);a?.call(this,e),this.requestUpdate(t,n,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??x}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const t=g(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const t=this.properties,e=[...h(t),...p(t)];for(const r of e)this.createProperty(r,t[r])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,r]of e)this.elementProperties.set(t,r)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const r=this._$Eu(t,e);void 0!==r&&this._$Eh.set(r,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const r=new Set(t.flat(1/0).reverse());for(const t of r)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const r=e.attribute;return!1===r?void 0:"string"==typeof r?r:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const r of e.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(s)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const s of e){const e=document.createElement("style"),a=r.litNonce;void 0!==a&&e.setAttribute("nonce",a),e.textContent=s.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,r){this._$AK(t,r)}_$ET(t,e){const r=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,r);if(void 0!==s&&!0===r.reflect){const a=(void 0!==r.converter?.toAttribute?r.converter:w).toAttribute(e,r.type);this._$Em=t,null==a?this.removeAttribute(s):this.setAttribute(s,a),this._$Em=null}}_$AK(t,e){const r=this.constructor,s=r._$Eh.get(t);if(void 0!==s&&this._$Em!==s){const t=r.getPropertyOptions(s),a="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:w;this._$Em=s;const n=a.fromAttribute(e,t.type);this[s]=n??this._$Ej?.get(s)??n,this._$Em=null}}requestUpdate(t,e,r){if(void 0!==t){const s=this.constructor,a=this[t];if(r??=s.getPropertyOptions(t),!((r.hasChanged??_)(a,e)||r.useDefault&&r.reflect&&a===this._$Ej?.get(t)&&!this.hasAttribute(s._$Eu(t,r))))return;this.C(t,e,r)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:r,reflect:s,wrapped:a},n){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==a||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||r||(e=void 0),this._$AL.set(t,e)),!0===s&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,r]of t){const{wrapped:t}=r,s=this[e];!0!==t||this._$AL.has(e)||void 0===s||this.C(e,void 0,r,s)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}S.elementStyles=[],S.shadowRootOptions={mode:"open"},S[b("elementProperties")]=new Map,S[b("finalized")]=new Map,v?.({ReactiveElement:S}),(m.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const $=globalThis,D=$.trustedTypes,k=D?D.createPolicy("lit-html",{createHTML:t=>t}):void 0,C="$lit$",O=`lit$${Math.random().toFixed(9).slice(2)}$`,A="?"+O,T=`<${A}>`,M=document,E=()=>M.createComment(""),N=t=>null===t||"object"!=typeof t&&"function"!=typeof t,L=Array.isArray,I="[ \t\n\f\r]",P=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,V=/-->/g,F=/>/g,z=RegExp(`>|${I}(?:([^\\s"'>=/]+)(${I}*=${I}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),H=/'/g,j=/"/g,U=/^(?:script|style|textarea|title)$/i,Z=(t=>(e,...r)=>({_$litType$:t,strings:e,values:r}))(1),W=Symbol.for("lit-noChange"),R=Symbol.for("lit-nothing"),q=new WeakMap,Y=M.createTreeWalker(M,129);function B(t,e){if(!L(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==k?k.createHTML(e):e}const G=(t,e)=>{const r=t.length-1,s=[];let a,n=2===e?"<svg>":3===e?"<math>":"",i=P;for(let e=0;e<r;e++){const r=t[e];let o,l,c=-1,d=0;for(;d<r.length&&(i.lastIndex=d,l=i.exec(r),null!==l);)d=i.lastIndex,i===P?"!--"===l[1]?i=V:void 0!==l[1]?i=F:void 0!==l[2]?(U.test(l[2])&&(a=RegExp("</"+l[2],"g")),i=z):void 0!==l[3]&&(i=z):i===z?">"===l[0]?(i=a??P,c=-1):void 0===l[1]?c=-2:(c=i.lastIndex-l[2].length,o=l[1],i=void 0===l[3]?z:'"'===l[3]?j:H):i===j||i===H?i=z:i===V||i===F?i=P:(i=z,a=void 0);const u=i===z&&t[e+1].startsWith("/>")?" ":"";n+=i===P?r+T:c>=0?(s.push(o),r.slice(0,c)+C+r.slice(c)+O+u):r+O+(-2===c?e:u)}return[B(t,n+(t[r]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),s]};class J{constructor({strings:t,_$litType$:e},r){let s;this.parts=[];let a=0,n=0;const i=t.length-1,o=this.parts,[l,c]=G(t,e);if(this.el=J.createElement(l,r),Y.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(s=Y.nextNode())&&o.length<i;){if(1===s.nodeType){if(s.hasAttributes())for(const t of s.getAttributeNames())if(t.endsWith(C)){const e=c[n++],r=s.getAttribute(t).split(O),i=/([.?@])?(.*)/.exec(e);o.push({type:1,index:a,name:i[2],strings:r,ctor:"."===i[1]?et:"?"===i[1]?rt:"@"===i[1]?st:tt}),s.removeAttribute(t)}else t.startsWith(O)&&(o.push({type:6,index:a}),s.removeAttribute(t));if(U.test(s.tagName)){const t=s.textContent.split(O),e=t.length-1;if(e>0){s.textContent=D?D.emptyScript:"";for(let r=0;r<e;r++)s.append(t[r],E()),Y.nextNode(),o.push({type:2,index:++a});s.append(t[e],E())}}}else if(8===s.nodeType)if(s.data===A)o.push({type:2,index:a});else{let t=-1;for(;-1!==(t=s.data.indexOf(O,t+1));)o.push({type:7,index:a}),t+=O.length-1}a++}}static createElement(t,e){const r=M.createElement("template");return r.innerHTML=t,r}}function Q(t,e,r=t,s){if(e===W)return e;let a=void 0!==s?r._$Co?.[s]:r._$Cl;const n=N(e)?void 0:e._$litDirective$;return a?.constructor!==n&&(a?._$AO?.(!1),void 0===n?a=void 0:(a=new n(t),a._$AT(t,r,s)),void 0!==s?(r._$Co??=[])[s]=a:r._$Cl=a),void 0!==a&&(e=Q(t,a._$AS(t,e.values),a,s)),e}class K{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:r}=this._$AD,s=(t?.creationScope??M).importNode(e,!0);Y.currentNode=s;let a=Y.nextNode(),n=0,i=0,o=r[0];for(;void 0!==o;){if(n===o.index){let e;2===o.type?e=new X(a,a.nextSibling,this,t):1===o.type?e=new o.ctor(a,o.name,o.strings,this,t):6===o.type&&(e=new at(a,this,t)),this._$AV.push(e),o=r[++i]}n!==o?.index&&(a=Y.nextNode(),n++)}return Y.currentNode=M,s}p(t){let e=0;for(const r of this._$AV)void 0!==r&&(void 0!==r.strings?(r._$AI(t,r,e),e+=r.strings.length-2):r._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,r,s){this.type=2,this._$AH=R,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=r,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),N(t)?t===R||null==t||""===t?(this._$AH!==R&&this._$AR(),this._$AH=R):t!==this._$AH&&t!==W&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>L(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==R&&N(this._$AH)?this._$AA.nextSibling.data=t:this.T(M.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:r}=t,s="number"==typeof r?this._$AC(t):(void 0===r.el&&(r.el=J.createElement(B(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===s)this._$AH.p(e);else{const t=new K(s,this),r=t.u(this.options);t.p(e),this.T(r),this._$AH=t}}_$AC(t){let e=q.get(t.strings);return void 0===e&&q.set(t.strings,e=new J(t)),e}k(t){L(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let r,s=0;for(const a of t)s===e.length?e.push(r=new X(this.O(E()),this.O(E()),this,this.options)):r=e[s],r._$AI(a),s++;s<e.length&&(this._$AR(r&&r._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,r,s,a){this.type=1,this._$AH=R,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=a,r.length>2||""!==r[0]||""!==r[1]?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=R}_$AI(t,e=this,r,s){const a=this.strings;let n=!1;if(void 0===a)t=Q(this,t,e,0),n=!N(t)||t!==this._$AH&&t!==W,n&&(this._$AH=t);else{const s=t;let i,o;for(t=a[0],i=0;i<a.length-1;i++)o=Q(this,s[r+i],e,i),o===W&&(o=this._$AH[i]),n||=!N(o)||o!==this._$AH[i],o===R?t=R:t!==R&&(t+=(o??"")+a[i+1]),this._$AH[i]=o}n&&!s&&this.j(t)}j(t){t===R?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===R?void 0:t}}class rt extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==R)}}class st extends tt{constructor(t,e,r,s,a){super(t,e,r,s,a),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??R)===W)return;const r=this._$AH,s=t===R&&r!==R||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,a=t!==R&&(r===R||s);s&&this.element.removeEventListener(this.name,this,r),a&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class at{constructor(t,e,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const nt=$.litHtmlPolyfillSupport;nt?.(J,X),($.litHtmlVersions??=[]).push("3.3.1");const it=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends S{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,r)=>{const s=r?.renderBefore??e;let a=s._$litPart$;if(void 0===a){const t=r?.renderBefore??null;s._$litPart$=a=new X(e.insertBefore(E(),t),t,void 0,r??{})}return a._$AI(t),a})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}}ot._$litElement$=!0,ot.finalized=!0,it.litElementHydrateSupport?.({LitElement:ot});const lt=it.litElementPolyfillSupport;lt?.({LitElement:ot}),(it.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ct=t=>(e,r)=>{void 0!==r?r.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},dt={attribute:!0,type:String,converter:w,reflect:!1,hasChanged:_},ut=(t=dt,e,r)=>{const{kind:s,metadata:a}=r;let n=globalThis.litPropertyMetadata.get(a);if(void 0===n&&globalThis.litPropertyMetadata.set(a,n=new Map),"setter"===s&&((t=Object.create(t)).wrapped=!0),n.set(r.name,t),"accessor"===s){const{name:s}=r;return{set(r){const a=e.get.call(this);e.set.call(this,r),this.requestUpdate(s,a,t)},init(e){return void 0!==e&&this.C(s,void 0,t,e),e}}}if("setter"===s){const{name:s}=r;return function(r){const a=this[s];e.call(this,r),this.requestUpdate(s,a,t)}}throw Error("Unsupported decorator location: "+s)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ht(t){return(e,r)=>"object"==typeof r?ut(t,e,r):((t,e,r)=>{const s=e.hasOwnProperty(r);return e.constructor.createProperty(r,t),s?Object.getOwnPropertyDescriptor(e,r):void 0})(t,e,r)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pt(t){return ht({...t,state:!0,attribute:!1})}var gt="M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z",mt="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",ft="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",yt="M22 9A4.32 4.32 0 0 1 19.78 8.45A3.4 3.4 0 0 0 18 8V7A4.32 4.32 0 0 1 20.22 7.55A3.4 3.4 0 0 0 22 8M22 6A3.4 3.4 0 0 1 20.22 5.55A4.32 4.32 0 0 0 18 5V6A3.4 3.4 0 0 1 19.78 6.45A4.32 4.32 0 0 0 22 7M22 10A3.4 3.4 0 0 1 20.22 9.55A4.32 4.32 0 0 0 18 9V10A3.4 3.4 0 0 1 19.78 10.45A4.32 4.32 0 0 0 22 11M10 12.73A70.39 70.39 0 0 0 17 11V4S10.5 2 7.5 2A5.5 5.5 0 0 0 6.12 12.82L7 19H8A3 3 0 0 0 9.46 21.33A3.15 3.15 0 0 1 11 24H12A4.12 4.12 0 0 0 10.09 20.55C9.39 20 9 19.63 9 19H10M7.5 10A2.5 2.5 0 1 1 10 7.5A2.5 2.5 0 0 1 7.5 10Z",vt="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",bt="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z";class wt extends Error{}class _t extends wt{constructor(t){super(`Invalid DateTime: ${t.toMessage()}`)}}class xt extends wt{constructor(t){super(`Invalid Interval: ${t.toMessage()}`)}}class St extends wt{constructor(t){super(`Invalid Duration: ${t.toMessage()}`)}}class $t extends wt{}class Dt extends wt{constructor(t){super(`Invalid unit ${t}`)}}class kt extends wt{}class Ct extends wt{constructor(){super("Zone is an abstract class")}}const Ot="numeric",At="short",Tt="long",Mt={year:Ot,month:Ot,day:Ot},Et={year:Ot,month:At,day:Ot},Nt={year:Ot,month:At,day:Ot,weekday:At},Lt={year:Ot,month:Tt,day:Ot},It={year:Ot,month:Tt,day:Ot,weekday:Tt},Pt={hour:Ot,minute:Ot},Vt={hour:Ot,minute:Ot,second:Ot},Ft={hour:Ot,minute:Ot,second:Ot,timeZoneName:At},zt={hour:Ot,minute:Ot,second:Ot,timeZoneName:Tt},Ht={hour:Ot,minute:Ot,hourCycle:"h23"},jt={hour:Ot,minute:Ot,second:Ot,hourCycle:"h23"},Ut={hour:Ot,minute:Ot,second:Ot,hourCycle:"h23",timeZoneName:At},Zt={hour:Ot,minute:Ot,second:Ot,hourCycle:"h23",timeZoneName:Tt},Wt={year:Ot,month:Ot,day:Ot,hour:Ot,minute:Ot},Rt={year:Ot,month:Ot,day:Ot,hour:Ot,minute:Ot,second:Ot},qt={year:Ot,month:At,day:Ot,hour:Ot,minute:Ot},Yt={year:Ot,month:At,day:Ot,hour:Ot,minute:Ot,second:Ot},Bt={year:Ot,month:At,day:Ot,weekday:At,hour:Ot,minute:Ot},Gt={year:Ot,month:Tt,day:Ot,hour:Ot,minute:Ot,timeZoneName:At},Jt={year:Ot,month:Tt,day:Ot,hour:Ot,minute:Ot,second:Ot,timeZoneName:At},Qt={year:Ot,month:Tt,day:Ot,weekday:Tt,hour:Ot,minute:Ot,timeZoneName:Tt},Kt={year:Ot,month:Tt,day:Ot,weekday:Tt,hour:Ot,minute:Ot,second:Ot,timeZoneName:Tt};class Xt{get type(){throw new Ct}get name(){throw new Ct}get ianaName(){return this.name}get isUniversal(){throw new Ct}offsetName(t,e){throw new Ct}formatOffset(t,e){throw new Ct}offset(t){throw new Ct}equals(t){throw new Ct}get isValid(){throw new Ct}}let te=null;class ee extends Xt{static get instance(){return null===te&&(te=new ee),te}get type(){return"system"}get name(){return(new Intl.DateTimeFormat).resolvedOptions().timeZone}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return _r(t,e,r)}formatOffset(t,e){return Dr(this.offset(t),e)}offset(t){return-new Date(t).getTimezoneOffset()}equals(t){return"system"===t.type}get isValid(){return!0}}const re=new Map;const se={year:0,month:1,day:2,era:3,hour:4,minute:5,second:6};const ae=new Map;class ne extends Xt{static create(t){let e=ae.get(t);return void 0===e&&ae.set(t,e=new ne(t)),e}static resetCache(){ae.clear(),re.clear()}static isValidSpecifier(t){return this.isValidZone(t)}static isValidZone(t){if(!t)return!1;try{return new Intl.DateTimeFormat("en-US",{timeZone:t}).format(),!0}catch(t){return!1}}constructor(t){super(),this.zoneName=t,this.valid=ne.isValidZone(t)}get type(){return"iana"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return _r(t,e,r,this.name)}formatOffset(t,e){return Dr(this.offset(t),e)}offset(t){if(!this.valid)return NaN;const e=new Date(t);if(isNaN(e))return NaN;const r=function(t){let e=re.get(t);return void 0===e&&(e=new Intl.DateTimeFormat("en-US",{hour12:!1,timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",era:"short"}),re.set(t,e)),e}(this.name);let[s,a,n,i,o,l,c]=r.formatToParts?function(t,e){const r=t.formatToParts(e),s=[];for(let t=0;t<r.length;t++){const{type:e,value:a}=r[t],n=se[e];"era"===e?s[n]=a:tr(n)||(s[n]=parseInt(a,10))}return s}(r,e):function(t,e){const r=t.format(e).replace(/\u200E/g,""),s=/(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(r),[,a,n,i,o,l,c,d]=s;return[i,a,n,o,l,c,d]}(r,e);"BC"===i&&(s=1-Math.abs(s));let d=+e;const u=d%1e3;return d-=u>=0?u:1e3+u,(yr({year:s,month:a,day:n,hour:24===o?0:o,minute:l,second:c,millisecond:0})-d)/6e4}equals(t){return"iana"===t.type&&t.name===this.name}get isValid(){return this.valid}}let ie={};const oe=new Map;function le(t,e={}){const r=JSON.stringify([t,e]);let s=oe.get(r);return void 0===s&&(s=new Intl.DateTimeFormat(t,e),oe.set(r,s)),s}const ce=new Map;const de=new Map;let ue=null;const he=new Map;function pe(t){let e=he.get(t);return void 0===e&&(e=new Intl.DateTimeFormat(t).resolvedOptions(),he.set(t,e)),e}const ge=new Map;function me(t,e,r,s){const a=t.listingMode();return"error"===a?null:"en"===a?r(e):s(e)}class fe{constructor(t,e,r){this.padTo=r.padTo||0,this.floor=r.floor||!1;const{padTo:s,floor:a,...n}=r;if(!e||Object.keys(n).length>0){const e={useGrouping:!1,...r};r.padTo>0&&(e.minimumIntegerDigits=r.padTo),this.inf=function(t,e={}){const r=JSON.stringify([t,e]);let s=ce.get(r);return void 0===s&&(s=new Intl.NumberFormat(t,e),ce.set(r,s)),s}(t,e)}}format(t){if(this.inf){const e=this.floor?Math.floor(t):t;return this.inf.format(e)}return cr(this.floor?Math.floor(t):pr(t,3),this.padTo)}}class ye{constructor(t,e,r){let s;if(this.opts=r,this.originalZone=void 0,this.opts.timeZone)this.dt=t;else if("fixed"===t.zone.type){const e=t.offset/60*-1,r=e>=0?`Etc/GMT+${e}`:`Etc/GMT${e}`;0!==t.offset&&ne.create(r).valid?(s=r,this.dt=t):(s="UTC",this.dt=0===t.offset?t:t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone)}else"system"===t.zone.type?this.dt=t:"iana"===t.zone.type?(this.dt=t,s=t.zone.name):(s="UTC",this.dt=t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone);const a={...this.opts};a.timeZone=a.timeZone||s,this.dtf=le(e,a)}format(){return this.originalZone?this.formatToParts().map(({value:t})=>t).join(""):this.dtf.format(this.dt.toJSDate())}formatToParts(){const t=this.dtf.formatToParts(this.dt.toJSDate());return this.originalZone?t.map(t=>{if("timeZoneName"===t.type){const e=this.originalZone.offsetName(this.dt.ts,{locale:this.dt.locale,format:this.opts.timeZoneName});return{...t,value:e}}return t}):t}resolvedOptions(){return this.dtf.resolvedOptions()}}class ve{constructor(t,e,r){this.opts={style:"long",...r},!e&&sr()&&(this.rtf=function(t,e={}){const{base:r,...s}=e,a=JSON.stringify([t,s]);let n=de.get(a);return void 0===n&&(n=new Intl.RelativeTimeFormat(t,e),de.set(a,n)),n}(t,r))}format(t,e){return this.rtf?this.rtf.format(t,e):function(t,e,r="always",s=!1){const a={years:["year","yr."],quarters:["quarter","qtr."],months:["month","mo."],weeks:["week","wk."],days:["day","day","days"],hours:["hour","hr."],minutes:["minute","min."],seconds:["second","sec."]},n=-1===["hours","minutes","seconds"].indexOf(t);if("auto"===r&&n){const r="days"===t;switch(e){case 1:return r?"tomorrow":`next ${a[t][0]}`;case-1:return r?"yesterday":`last ${a[t][0]}`;case 0:return r?"today":`this ${a[t][0]}`}}const i=Object.is(e,-0)||e<0,o=Math.abs(e),l=1===o,c=a[t],d=s?l?c[1]:c[2]||c[1]:l?a[t][0]:t;return i?`${o} ${d} ago`:`in ${o} ${d}`}(e,t,this.opts.numeric,"long"!==this.opts.style)}formatToParts(t,e){return this.rtf?this.rtf.formatToParts(t,e):[]}}const be={firstDay:1,minimalDays:4,weekend:[6,7]};class we{static fromOpts(t){return we.create(t.locale,t.numberingSystem,t.outputCalendar,t.weekSettings,t.defaultToEN)}static create(t,e,r,s,a=!1){const n=t||Fe.defaultLocale,i=n||(a?"en-US":ue||(ue=(new Intl.DateTimeFormat).resolvedOptions().locale,ue)),o=e||Fe.defaultNumberingSystem,l=r||Fe.defaultOutputCalendar,c=or(s)||Fe.defaultWeekSettings;return new we(i,o,l,c,n)}static resetCache(){ue=null,oe.clear(),ce.clear(),de.clear(),he.clear(),ge.clear()}static fromObject({locale:t,numberingSystem:e,outputCalendar:r,weekSettings:s}={}){return we.create(t,e,r,s)}constructor(t,e,r,s,a){const[n,i,o]=function(t){const e=t.indexOf("-x-");-1!==e&&(t=t.substring(0,e));const r=t.indexOf("-u-");if(-1===r)return[t];{let e,s;try{e=le(t).resolvedOptions(),s=t}catch(a){const n=t.substring(0,r);e=le(n).resolvedOptions(),s=n}const{numberingSystem:a,calendar:n}=e;return[s,a,n]}}(t);this.locale=n,this.numberingSystem=e||i||null,this.outputCalendar=r||o||null,this.weekSettings=s,this.intl=function(t,e,r){return r||e?(t.includes("-u-")||(t+="-u"),r&&(t+=`-ca-${r}`),e&&(t+=`-nu-${e}`),t):t}(this.locale,this.numberingSystem,this.outputCalendar),this.weekdaysCache={format:{},standalone:{}},this.monthsCache={format:{},standalone:{}},this.meridiemCache=null,this.eraCache={},this.specifiedLocale=a,this.fastNumbersCached=null}get fastNumbers(){var t;return null==this.fastNumbersCached&&(this.fastNumbersCached=(!(t=this).numberingSystem||"latn"===t.numberingSystem)&&("latn"===t.numberingSystem||!t.locale||t.locale.startsWith("en")||"latn"===pe(t.locale).numberingSystem)),this.fastNumbersCached}listingMode(){const t=this.isEnglish(),e=!(null!==this.numberingSystem&&"latn"!==this.numberingSystem||null!==this.outputCalendar&&"gregory"!==this.outputCalendar);return t&&e?"en":"intl"}clone(t){return t&&0!==Object.getOwnPropertyNames(t).length?we.create(t.locale||this.specifiedLocale,t.numberingSystem||this.numberingSystem,t.outputCalendar||this.outputCalendar,or(t.weekSettings)||this.weekSettings,t.defaultToEN||!1):this}redefaultToEN(t={}){return this.clone({...t,defaultToEN:!0})}redefaultToSystem(t={}){return this.clone({...t,defaultToEN:!1})}months(t,e=!1){return me(this,t,Tr,()=>{const r="ja"===this.intl||this.intl.startsWith("ja-"),s=(e&=!r)?{month:t,day:"numeric"}:{month:t},a=e?"format":"standalone";if(!this.monthsCache[a][t]){const e=r?t=>this.dtFormatter(t,s).format():t=>this.extract(t,s,"month");this.monthsCache[a][t]=function(t){const e=[];for(let r=1;r<=12;r++){const s=Ia.utc(2009,r,1);e.push(t(s))}return e}(e)}return this.monthsCache[a][t]})}weekdays(t,e=!1){return me(this,t,Lr,()=>{const r=e?{weekday:t,year:"numeric",month:"long",day:"numeric"}:{weekday:t},s=e?"format":"standalone";return this.weekdaysCache[s][t]||(this.weekdaysCache[s][t]=function(t){const e=[];for(let r=1;r<=7;r++){const s=Ia.utc(2016,11,13+r);e.push(t(s))}return e}(t=>this.extract(t,r,"weekday"))),this.weekdaysCache[s][t]})}meridiems(){return me(this,void 0,()=>Ir,()=>{if(!this.meridiemCache){const t={hour:"numeric",hourCycle:"h12"};this.meridiemCache=[Ia.utc(2016,11,13,9),Ia.utc(2016,11,13,19)].map(e=>this.extract(e,t,"dayperiod"))}return this.meridiemCache})}eras(t){return me(this,t,zr,()=>{const e={era:t};return this.eraCache[t]||(this.eraCache[t]=[Ia.utc(-40,1,1),Ia.utc(2017,1,1)].map(t=>this.extract(t,e,"era"))),this.eraCache[t]})}extract(t,e,r){const s=this.dtFormatter(t,e).formatToParts().find(t=>t.type.toLowerCase()===r);return s?s.value:null}numberFormatter(t={}){return new fe(this.intl,t.forceSimple||this.fastNumbers,t)}dtFormatter(t,e={}){return new ye(t,this.intl,e)}relFormatter(t={}){return new ve(this.intl,this.isEnglish(),t)}listFormatter(t={}){return function(t,e={}){const r=JSON.stringify([t,e]);let s=ie[r];return s||(s=new Intl.ListFormat(t,e),ie[r]=s),s}(this.intl,t)}isEnglish(){return"en"===this.locale||"en-us"===this.locale.toLowerCase()||pe(this.intl).locale.startsWith("en-us")}getWeekSettings(){return this.weekSettings?this.weekSettings:ar()?function(t){let e=ge.get(t);if(!e){const r=new Intl.Locale(t);e="getWeekInfo"in r?r.getWeekInfo():r.weekInfo,"minimalDays"in e||(e={...be,...e}),ge.set(t,e)}return e}(this.locale):be}getStartOfWeek(){return this.getWeekSettings().firstDay}getMinDaysInFirstWeek(){return this.getWeekSettings().minimalDays}getWeekendDays(){return this.getWeekSettings().weekend}equals(t){return this.locale===t.locale&&this.numberingSystem===t.numberingSystem&&this.outputCalendar===t.outputCalendar}toString(){return`Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`}}let _e=null;class xe extends Xt{static get utcInstance(){return null===_e&&(_e=new xe(0)),_e}static instance(t){return 0===t?xe.utcInstance:new xe(t)}static parseSpecifier(t){if(t){const e=t.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);if(e)return new xe(xr(e[1],e[2]))}return null}constructor(t){super(),this.fixed=t}get type(){return"fixed"}get name(){return 0===this.fixed?"UTC":`UTC${Dr(this.fixed,"narrow")}`}get ianaName(){return 0===this.fixed?"Etc/UTC":`Etc/GMT${Dr(-this.fixed,"narrow")}`}offsetName(){return this.name}formatOffset(t,e){return Dr(this.fixed,e)}get isUniversal(){return!0}offset(){return this.fixed}equals(t){return"fixed"===t.type&&t.fixed===this.fixed}get isValid(){return!0}}class Se extends Xt{constructor(t){super(),this.zoneName=t}get type(){return"invalid"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(){return null}formatOffset(){return""}offset(){return NaN}equals(){return!1}get isValid(){return!1}}function $e(t,e){if(tr(t)||null===t)return e;if(t instanceof Xt)return t;if(function(t){return"string"==typeof t}(t)){const r=t.toLowerCase();return"default"===r?e:"local"===r||"system"===r?ee.instance:"utc"===r||"gmt"===r?xe.utcInstance:xe.parseSpecifier(r)||ne.create(t)}return er(t)?xe.instance(t):"object"==typeof t&&"offset"in t&&"function"==typeof t.offset?t:new Se(t)}const De={arab:"[٠-٩]",arabext:"[۰-۹]",bali:"[᭐-᭙]",beng:"[০-৯]",deva:"[०-९]",fullwide:"[０-９]",gujr:"[૦-૯]",hanidec:"[〇|一|二|三|四|五|六|七|八|九]",khmr:"[០-៩]",knda:"[೦-೯]",laoo:"[໐-໙]",limb:"[᥆-᥏]",mlym:"[൦-൯]",mong:"[᠐-᠙]",mymr:"[၀-၉]",orya:"[୦-୯]",tamldec:"[௦-௯]",telu:"[౦-౯]",thai:"[๐-๙]",tibt:"[༠-༩]",latn:"\\d"},ke={arab:[1632,1641],arabext:[1776,1785],bali:[6992,7001],beng:[2534,2543],deva:[2406,2415],fullwide:[65296,65303],gujr:[2790,2799],khmr:[6112,6121],knda:[3302,3311],laoo:[3792,3801],limb:[6470,6479],mlym:[3430,3439],mong:[6160,6169],mymr:[4160,4169],orya:[2918,2927],tamldec:[3046,3055],telu:[3174,3183],thai:[3664,3673],tibt:[3872,3881]},Ce=De.hanidec.replace(/[\[|\]]/g,"").split("");const Oe=new Map;function Ae({numberingSystem:t},e=""){const r=t||"latn";let s=Oe.get(r);void 0===s&&(s=new Map,Oe.set(r,s));let a=s.get(e);return void 0===a&&(a=new RegExp(`${De[r]}${e}`),s.set(e,a)),a}let Te,Me=()=>Date.now(),Ee="system",Ne=null,Le=null,Ie=null,Pe=60,Ve=null;class Fe{static get now(){return Me}static set now(t){Me=t}static set defaultZone(t){Ee=t}static get defaultZone(){return $e(Ee,ee.instance)}static get defaultLocale(){return Ne}static set defaultLocale(t){Ne=t}static get defaultNumberingSystem(){return Le}static set defaultNumberingSystem(t){Le=t}static get defaultOutputCalendar(){return Ie}static set defaultOutputCalendar(t){Ie=t}static get defaultWeekSettings(){return Ve}static set defaultWeekSettings(t){Ve=or(t)}static get twoDigitCutoffYear(){return Pe}static set twoDigitCutoffYear(t){Pe=t%100}static get throwOnInvalid(){return Te}static set throwOnInvalid(t){Te=t}static resetCaches(){we.resetCache(),ne.resetCache(),Ia.resetCache(),Oe.clear()}}class ze{constructor(t,e){this.reason=t,this.explanation=e}toMessage(){return this.explanation?`${this.reason}: ${this.explanation}`:this.reason}}const He=[0,31,59,90,120,151,181,212,243,273,304,334],je=[0,31,60,91,121,152,182,213,244,274,305,335];function Ue(t,e){return new ze("unit out of range",`you specified ${e} (of type ${typeof e}) as a ${t}, which is invalid`)}function Ze(t,e,r){const s=new Date(Date.UTC(t,e-1,r));t<100&&t>=0&&s.setUTCFullYear(s.getUTCFullYear()-1900);const a=s.getUTCDay();return 0===a?7:a}function We(t,e,r){return r+(gr(t)?je:He)[e-1]}function Re(t,e){const r=gr(t)?je:He,s=r.findIndex(t=>t<e);return{month:s+1,day:e-r[s]}}function qe(t,e){return(t-e+7)%7+1}function Ye(t,e=4,r=1){const{year:s,month:a,day:n}=t,i=We(s,a,n),o=qe(Ze(s,a,n),r);let l,c=Math.floor((i-o+14-e)/7);return c<1?(l=s-1,c=br(l,e,r)):c>br(s,e,r)?(l=s+1,c=1):l=s,{weekYear:l,weekNumber:c,weekday:o,...kr(t)}}function Be(t,e=4,r=1){const{weekYear:s,weekNumber:a,weekday:n}=t,i=qe(Ze(s,1,e),r),o=mr(s);let l,c=7*a+n-i-7+e;c<1?(l=s-1,c+=mr(l)):c>o?(l=s+1,c-=mr(s)):l=s;const{month:d,day:u}=Re(l,c);return{year:l,month:d,day:u,...kr(t)}}function Ge(t){const{year:e,month:r,day:s}=t;return{year:e,ordinal:We(e,r,s),...kr(t)}}function Je(t){const{year:e,ordinal:r}=t,{month:s,day:a}=Re(e,r);return{year:e,month:s,day:a,...kr(t)}}function Qe(t,e){if(!tr(t.localWeekday)||!tr(t.localWeekNumber)||!tr(t.localWeekYear)){if(!tr(t.weekday)||!tr(t.weekNumber)||!tr(t.weekYear))throw new $t("Cannot mix locale-based week fields with ISO-based week fields");return tr(t.localWeekday)||(t.weekday=t.localWeekday),tr(t.localWeekNumber)||(t.weekNumber=t.localWeekNumber),tr(t.localWeekYear)||(t.weekYear=t.localWeekYear),delete t.localWeekday,delete t.localWeekNumber,delete t.localWeekYear,{minDaysInFirstWeek:e.getMinDaysInFirstWeek(),startOfWeek:e.getStartOfWeek()}}return{minDaysInFirstWeek:4,startOfWeek:1}}function Ke(t){const e=rr(t.year),r=lr(t.month,1,12),s=lr(t.day,1,fr(t.year,t.month));return e?r?!s&&Ue("day",t.day):Ue("month",t.month):Ue("year",t.year)}function Xe(t){const{hour:e,minute:r,second:s,millisecond:a}=t,n=lr(e,0,23)||24===e&&0===r&&0===s&&0===a,i=lr(r,0,59),o=lr(s,0,59),l=lr(a,0,999);return n?i?o?!l&&Ue("millisecond",a):Ue("second",s):Ue("minute",r):Ue("hour",e)}function tr(t){return void 0===t}function er(t){return"number"==typeof t}function rr(t){return"number"==typeof t&&t%1==0}function sr(){try{return"undefined"!=typeof Intl&&!!Intl.RelativeTimeFormat}catch(t){return!1}}function ar(){try{return"undefined"!=typeof Intl&&!!Intl.Locale&&("weekInfo"in Intl.Locale.prototype||"getWeekInfo"in Intl.Locale.prototype)}catch(t){return!1}}function nr(t,e,r){if(0!==t.length)return t.reduce((t,s)=>{const a=[e(s),s];return t&&r(t[0],a[0])===t[0]?t:a},null)[1]}function ir(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function or(t){if(null==t)return null;if("object"!=typeof t)throw new kt("Week settings must be an object");if(!lr(t.firstDay,1,7)||!lr(t.minimalDays,1,7)||!Array.isArray(t.weekend)||t.weekend.some(t=>!lr(t,1,7)))throw new kt("Invalid week settings");return{firstDay:t.firstDay,minimalDays:t.minimalDays,weekend:Array.from(t.weekend)}}function lr(t,e,r){return rr(t)&&t>=e&&t<=r}function cr(t,e=2){let r;return r=t<0?"-"+(""+-t).padStart(e,"0"):(""+t).padStart(e,"0"),r}function dr(t){return tr(t)||null===t||""===t?void 0:parseInt(t,10)}function ur(t){return tr(t)||null===t||""===t?void 0:parseFloat(t)}function hr(t){if(!tr(t)&&null!==t&&""!==t){const e=1e3*parseFloat("0."+t);return Math.floor(e)}}function pr(t,e,r="round"){const s=10**e;switch(r){case"expand":return t>0?Math.ceil(t*s)/s:Math.floor(t*s)/s;case"trunc":return Math.trunc(t*s)/s;case"round":return Math.round(t*s)/s;case"floor":return Math.floor(t*s)/s;case"ceil":return Math.ceil(t*s)/s;default:throw new RangeError(`Value rounding ${r} is out of range`)}}function gr(t){return t%4==0&&(t%100!=0||t%400==0)}function mr(t){return gr(t)?366:365}function fr(t,e){const r=function(t,e){return t-e*Math.floor(t/e)}(e-1,12)+1;return 2===r?gr(t+(e-r)/12)?29:28:[31,null,31,30,31,30,31,31,30,31,30,31][r-1]}function yr(t){let e=Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second,t.millisecond);return t.year<100&&t.year>=0&&(e=new Date(e),e.setUTCFullYear(t.year,t.month-1,t.day)),+e}function vr(t,e,r){return-qe(Ze(t,1,e),r)+e-1}function br(t,e=4,r=1){const s=vr(t,e,r),a=vr(t+1,e,r);return(mr(t)-s+a)/7}function wr(t){return t>99?t:t>Fe.twoDigitCutoffYear?1900+t:2e3+t}function _r(t,e,r,s=null){const a=new Date(t),n={hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"};s&&(n.timeZone=s);const i={timeZoneName:e,...n},o=new Intl.DateTimeFormat(r,i).formatToParts(a).find(t=>"timezonename"===t.type.toLowerCase());return o?o.value:null}function xr(t,e){let r=parseInt(t,10);Number.isNaN(r)&&(r=0);const s=parseInt(e,10)||0;return 60*r+(r<0||Object.is(r,-0)?-s:s)}function Sr(t){const e=Number(t);if("boolean"==typeof t||""===t||!Number.isFinite(e))throw new kt(`Invalid unit value ${t}`);return e}function $r(t,e){const r={};for(const s in t)if(ir(t,s)){const a=t[s];if(null==a)continue;r[e(s)]=Sr(a)}return r}function Dr(t,e){const r=Math.trunc(Math.abs(t/60)),s=Math.trunc(Math.abs(t%60)),a=t>=0?"+":"-";switch(e){case"short":return`${a}${cr(r,2)}:${cr(s,2)}`;case"narrow":return`${a}${r}${s>0?`:${s}`:""}`;case"techie":return`${a}${cr(r,2)}${cr(s,2)}`;default:throw new RangeError(`Value format ${e} is out of range for property format`)}}function kr(t){return function(t,e){return e.reduce((e,r)=>(e[r]=t[r],e),{})}(t,["hour","minute","second","millisecond"])}const Cr=["January","February","March","April","May","June","July","August","September","October","November","December"],Or=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],Ar=["J","F","M","A","M","J","J","A","S","O","N","D"];function Tr(t){switch(t){case"narrow":return[...Ar];case"short":return[...Or];case"long":return[...Cr];case"numeric":return["1","2","3","4","5","6","7","8","9","10","11","12"];case"2-digit":return["01","02","03","04","05","06","07","08","09","10","11","12"];default:return null}}const Mr=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],Er=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],Nr=["M","T","W","T","F","S","S"];function Lr(t){switch(t){case"narrow":return[...Nr];case"short":return[...Er];case"long":return[...Mr];case"numeric":return["1","2","3","4","5","6","7"];default:return null}}const Ir=["AM","PM"],Pr=["Before Christ","Anno Domini"],Vr=["BC","AD"],Fr=["B","A"];function zr(t){switch(t){case"narrow":return[...Fr];case"short":return[...Vr];case"long":return[...Pr];default:return null}}function Hr(t,e){let r="";for(const s of t)s.literal?r+=s.val:r+=e(s.val);return r}const jr={D:Mt,DD:Et,DDD:Lt,DDDD:It,t:Pt,tt:Vt,ttt:Ft,tttt:zt,T:Ht,TT:jt,TTT:Ut,TTTT:Zt,f:Wt,ff:qt,fff:Gt,ffff:Qt,F:Rt,FF:Yt,FFF:Jt,FFFF:Kt};class Ur{static create(t,e={}){return new Ur(t,e)}static parseFormat(t){let e=null,r="",s=!1;const a=[];for(let n=0;n<t.length;n++){const i=t.charAt(n);"'"===i?((r.length>0||s)&&a.push({literal:s||/^\s+$/.test(r),val:""===r?"'":r}),e=null,r="",s=!s):s||i===e?r+=i:(r.length>0&&a.push({literal:/^\s+$/.test(r),val:r}),r=i,e=i)}return r.length>0&&a.push({literal:s||/^\s+$/.test(r),val:r}),a}static macroTokenToFormatOpts(t){return jr[t]}constructor(t,e){this.opts=e,this.loc=t,this.systemLoc=null}formatWithSystemDefault(t,e){null===this.systemLoc&&(this.systemLoc=this.loc.redefaultToSystem());return this.systemLoc.dtFormatter(t,{...this.opts,...e}).format()}dtFormatter(t,e={}){return this.loc.dtFormatter(t,{...this.opts,...e})}formatDateTime(t,e){return this.dtFormatter(t,e).format()}formatDateTimeParts(t,e){return this.dtFormatter(t,e).formatToParts()}formatInterval(t,e){return this.dtFormatter(t.start,e).dtf.formatRange(t.start.toJSDate(),t.end.toJSDate())}resolvedOptions(t,e){return this.dtFormatter(t,e).resolvedOptions()}num(t,e=0,r=void 0){if(this.opts.forceSimple)return cr(t,e);const s={...this.opts};return e>0&&(s.padTo=e),r&&(s.signDisplay=r),this.loc.numberFormatter(s).format(t)}formatDateTimeFromString(t,e){const r="en"===this.loc.listingMode(),s=this.loc.outputCalendar&&"gregory"!==this.loc.outputCalendar,a=(e,r)=>this.loc.extract(t,e,r),n=e=>t.isOffsetFixed&&0===t.offset&&e.allowZ?"Z":t.isValid?t.zone.formatOffset(t.ts,e.format):"",i=()=>r?function(t){return Ir[t.hour<12?0:1]}(t):a({hour:"numeric",hourCycle:"h12"},"dayperiod"),o=(e,s)=>r?function(t,e){return Tr(e)[t.month-1]}(t,e):a(s?{month:e}:{month:e,day:"numeric"},"month"),l=(e,s)=>r?function(t,e){return Lr(e)[t.weekday-1]}(t,e):a(s?{weekday:e}:{weekday:e,month:"long",day:"numeric"},"weekday"),c=e=>{const r=Ur.macroTokenToFormatOpts(e);return r?this.formatWithSystemDefault(t,r):e},d=e=>r?function(t,e){return zr(e)[t.year<0?0:1]}(t,e):a({era:e},"era");return Hr(Ur.parseFormat(e),e=>{switch(e){case"S":return this.num(t.millisecond);case"u":case"SSS":return this.num(t.millisecond,3);case"s":return this.num(t.second);case"ss":return this.num(t.second,2);case"uu":return this.num(Math.floor(t.millisecond/10),2);case"uuu":return this.num(Math.floor(t.millisecond/100));case"m":return this.num(t.minute);case"mm":return this.num(t.minute,2);case"h":return this.num(t.hour%12==0?12:t.hour%12);case"hh":return this.num(t.hour%12==0?12:t.hour%12,2);case"H":return this.num(t.hour);case"HH":return this.num(t.hour,2);case"Z":return n({format:"narrow",allowZ:this.opts.allowZ});case"ZZ":return n({format:"short",allowZ:this.opts.allowZ});case"ZZZ":return n({format:"techie",allowZ:this.opts.allowZ});case"ZZZZ":return t.zone.offsetName(t.ts,{format:"short",locale:this.loc.locale});case"ZZZZZ":return t.zone.offsetName(t.ts,{format:"long",locale:this.loc.locale});case"z":return t.zoneName;case"a":return i();case"d":return s?a({day:"numeric"},"day"):this.num(t.day);case"dd":return s?a({day:"2-digit"},"day"):this.num(t.day,2);case"c":case"E":return this.num(t.weekday);case"ccc":return l("short",!0);case"cccc":return l("long",!0);case"ccccc":return l("narrow",!0);case"EEE":return l("short",!1);case"EEEE":return l("long",!1);case"EEEEE":return l("narrow",!1);case"L":return s?a({month:"numeric",day:"numeric"},"month"):this.num(t.month);case"LL":return s?a({month:"2-digit",day:"numeric"},"month"):this.num(t.month,2);case"LLL":return o("short",!0);case"LLLL":return o("long",!0);case"LLLLL":return o("narrow",!0);case"M":return s?a({month:"numeric"},"month"):this.num(t.month);case"MM":return s?a({month:"2-digit"},"month"):this.num(t.month,2);case"MMM":return o("short",!1);case"MMMM":return o("long",!1);case"MMMMM":return o("narrow",!1);case"y":return s?a({year:"numeric"},"year"):this.num(t.year);case"yy":return s?a({year:"2-digit"},"year"):this.num(t.year.toString().slice(-2),2);case"yyyy":return s?a({year:"numeric"},"year"):this.num(t.year,4);case"yyyyyy":return s?a({year:"numeric"},"year"):this.num(t.year,6);case"G":return d("short");case"GG":return d("long");case"GGGGG":return d("narrow");case"kk":return this.num(t.weekYear.toString().slice(-2),2);case"kkkk":return this.num(t.weekYear,4);case"W":return this.num(t.weekNumber);case"WW":return this.num(t.weekNumber,2);case"n":return this.num(t.localWeekNumber);case"nn":return this.num(t.localWeekNumber,2);case"ii":return this.num(t.localWeekYear.toString().slice(-2),2);case"iiii":return this.num(t.localWeekYear,4);case"o":return this.num(t.ordinal);case"ooo":return this.num(t.ordinal,3);case"q":return this.num(t.quarter);case"qq":return this.num(t.quarter,2);case"X":return this.num(Math.floor(t.ts/1e3));case"x":return this.num(t.ts);default:return c(e)}})}formatDurationFromString(t,e){const r="negativeLargestOnly"===this.opts.signMode?-1:1,s=t=>{switch(t[0]){case"S":return"milliseconds";case"s":return"seconds";case"m":return"minutes";case"h":return"hours";case"d":return"days";case"w":return"weeks";case"M":return"months";case"y":return"years";default:return null}},a=Ur.parseFormat(e),n=a.reduce((t,{literal:e,val:r})=>e?t:t.concat(r),[]),i=t.shiftTo(...n.map(s).filter(t=>t));return Hr(a,((t,e)=>a=>{const n=s(a);if(n){const s=e.isNegativeDuration&&n!==e.largestUnit?r:1;let i;return i="negativeLargestOnly"===this.opts.signMode&&n!==e.largestUnit?"never":"all"===this.opts.signMode?"always":"auto",this.num(t.get(n)*s,a.length,i)}return a})(i,{isNegativeDuration:i<0,largestUnit:Object.keys(i.values)[0]}))}}const Zr=/[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;function Wr(...t){const e=t.reduce((t,e)=>t+e.source,"");return RegExp(`^${e}$`)}function Rr(...t){return e=>t.reduce(([t,r,s],a)=>{const[n,i,o]=a(e,s);return[{...t,...n},i||r,o]},[{},null,1]).slice(0,2)}function qr(t,...e){if(null==t)return[null,null];for(const[r,s]of e){const e=r.exec(t);if(e)return s(e)}return[null,null]}function Yr(...t){return(e,r)=>{const s={};let a;for(a=0;a<t.length;a++)s[t[a]]=dr(e[r+a]);return[s,null,r+a]}}const Br=/(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/,Gr=/(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/,Jr=RegExp(`${Gr.source}${`(?:${Br.source}?(?:\\[(${Zr.source})\\])?)?`}`),Qr=RegExp(`(?:[Tt]${Jr.source})?`),Kr=Yr("weekYear","weekNumber","weekDay"),Xr=Yr("year","ordinal"),ts=RegExp(`${Gr.source} ?(?:${Br.source}|(${Zr.source}))?`),es=RegExp(`(?: ${ts.source})?`);function rs(t,e,r){const s=t[e];return tr(s)?r:dr(s)}function ss(t,e){return[{hours:rs(t,e,0),minutes:rs(t,e+1,0),seconds:rs(t,e+2,0),milliseconds:hr(t[e+3])},null,e+4]}function as(t,e){const r=!t[e]&&!t[e+1],s=xr(t[e+1],t[e+2]);return[{},r?null:xe.instance(s),e+3]}function ns(t,e){return[{},t[e]?ne.create(t[e]):null,e+1]}const is=RegExp(`^T?${Gr.source}$`),os=/^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;function ls(t){const[e,r,s,a,n,i,o,l,c]=t,d="-"===e[0],u=l&&"-"===l[0],h=(t,e=!1)=>void 0!==t&&(e||t&&d)?-t:t;return[{years:h(ur(r)),months:h(ur(s)),weeks:h(ur(a)),days:h(ur(n)),hours:h(ur(i)),minutes:h(ur(o)),seconds:h(ur(l),"-0"===l),milliseconds:h(hr(c),u)}]}const cs={GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function ds(t,e,r,s,a,n,i){const o={year:2===e.length?wr(dr(e)):dr(e),month:Or.indexOf(r)+1,day:dr(s),hour:dr(a),minute:dr(n)};return i&&(o.second=dr(i)),t&&(o.weekday=t.length>3?Mr.indexOf(t)+1:Er.indexOf(t)+1),o}const us=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;function hs(t){const[,e,r,s,a,n,i,o,l,c,d,u]=t,h=ds(e,a,s,r,n,i,o);let p;return p=l?cs[l]:c?0:xr(d,u),[h,new xe(p)]}const ps=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,gs=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,ms=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;function fs(t){const[,e,r,s,a,n,i,o]=t;return[ds(e,a,s,r,n,i,o),xe.utcInstance]}function ys(t){const[,e,r,s,a,n,i,o]=t;return[ds(e,o,r,s,a,n,i),xe.utcInstance]}const vs=Wr(/([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,Qr),bs=Wr(/(\d{4})-?W(\d\d)(?:-?(\d))?/,Qr),ws=Wr(/(\d{4})-?(\d{3})/,Qr),_s=Wr(Jr),xs=Rr(function(t,e){return[{year:rs(t,e),month:rs(t,e+1,1),day:rs(t,e+2,1)},null,e+3]},ss,as,ns),Ss=Rr(Kr,ss,as,ns),$s=Rr(Xr,ss,as,ns),Ds=Rr(ss,as,ns);const ks=Rr(ss);const Cs=Wr(/(\d{4})-(\d\d)-(\d\d)/,es),Os=Wr(ts),As=Rr(ss,as,ns);const Ts="Invalid Duration",Ms={weeks:{days:7,hours:168,minutes:10080,seconds:604800,milliseconds:6048e5},days:{hours:24,minutes:1440,seconds:86400,milliseconds:864e5},hours:{minutes:60,seconds:3600,milliseconds:36e5},minutes:{seconds:60,milliseconds:6e4},seconds:{milliseconds:1e3}},Es={years:{quarters:4,months:12,weeks:52,days:365,hours:8760,minutes:525600,seconds:31536e3,milliseconds:31536e6},quarters:{months:3,weeks:13,days:91,hours:2184,minutes:131040,seconds:7862400,milliseconds:78624e5},months:{weeks:4,days:30,hours:720,minutes:43200,seconds:2592e3,milliseconds:2592e6},...Ms},Ns=365.2425,Ls=30.436875,Is={years:{quarters:4,months:12,weeks:52.1775,days:Ns,hours:8765.82,minutes:525949.2,seconds:525949.2*60,milliseconds:525949.2*60*1e3},quarters:{months:3,weeks:13.044375,days:91.310625,hours:2191.455,minutes:131487.3,seconds:525949.2*60/4,milliseconds:7889237999.999999},months:{weeks:4.3481250000000005,days:Ls,hours:730.485,minutes:43829.1,seconds:2629746,milliseconds:2629746e3},...Ms},Ps=["years","quarters","months","weeks","days","hours","minutes","seconds","milliseconds"],Vs=Ps.slice(0).reverse();function Fs(t,e,r=!1){const s={values:r?e.values:{...t.values,...e.values||{}},loc:t.loc.clone(e.loc),conversionAccuracy:e.conversionAccuracy||t.conversionAccuracy,matrix:e.matrix||t.matrix};return new Us(s)}function zs(t,e){let r=e.milliseconds??0;for(const s of Vs.slice(1))e[s]&&(r+=e[s]*t[s].milliseconds);return r}function Hs(t,e){const r=zs(t,e)<0?-1:1;Ps.reduceRight((s,a)=>{if(tr(e[a]))return s;if(s){const n=e[s]*r,i=t[a][s],o=Math.floor(n/i);e[a]+=o*r,e[s]-=o*i*r}return a},null),Ps.reduce((r,s)=>{if(tr(e[s]))return r;if(r){const a=e[r]%1;e[r]-=a,e[s]+=a*t[r][s]}return s},null)}function js(t){const e={};for(const[r,s]of Object.entries(t))0!==s&&(e[r]=s);return e}class Us{constructor(t){const e="longterm"===t.conversionAccuracy||!1;let r=e?Is:Es;t.matrix&&(r=t.matrix),this.values=t.values,this.loc=t.loc||we.create(),this.conversionAccuracy=e?"longterm":"casual",this.invalid=t.invalid||null,this.matrix=r,this.isLuxonDuration=!0}static fromMillis(t,e){return Us.fromObject({milliseconds:t},e)}static fromObject(t,e={}){if(null==t||"object"!=typeof t)throw new kt("Duration.fromObject: argument expected to be an object, got "+(null===t?"null":typeof t));return new Us({values:$r(t,Us.normalizeUnit),loc:we.fromObject(e),conversionAccuracy:e.conversionAccuracy,matrix:e.matrix})}static fromDurationLike(t){if(er(t))return Us.fromMillis(t);if(Us.isDuration(t))return t;if("object"==typeof t)return Us.fromObject(t);throw new kt(`Unknown duration argument ${t} of type ${typeof t}`)}static fromISO(t,e){const[r]=function(t){return qr(t,[os,ls])}(t);return r?Us.fromObject(r,e):Us.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static fromISOTime(t,e){const[r]=function(t){return qr(t,[is,ks])}(t);return r?Us.fromObject(r,e):Us.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static invalid(t,e=null){if(!t)throw new kt("need to specify a reason the Duration is invalid");const r=t instanceof ze?t:new ze(t,e);if(Fe.throwOnInvalid)throw new St(r);return new Us({invalid:r})}static normalizeUnit(t){const e={year:"years",years:"years",quarter:"quarters",quarters:"quarters",month:"months",months:"months",week:"weeks",weeks:"weeks",day:"days",days:"days",hour:"hours",hours:"hours",minute:"minutes",minutes:"minutes",second:"seconds",seconds:"seconds",millisecond:"milliseconds",milliseconds:"milliseconds"}[t?t.toLowerCase():t];if(!e)throw new Dt(t);return e}static isDuration(t){return t&&t.isLuxonDuration||!1}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}toFormat(t,e={}){const r={...e,floor:!1!==e.round&&!1!==e.floor};return this.isValid?Ur.create(this.loc,r).formatDurationFromString(this,t):Ts}toHuman(t={}){if(!this.isValid)return Ts;const e=!1!==t.showZeros,r=Ps.map(r=>{const s=this.values[r];return tr(s)||0===s&&!e?null:this.loc.numberFormatter({style:"unit",unitDisplay:"long",...t,unit:r.slice(0,-1)}).format(s)}).filter(t=>t);return this.loc.listFormatter({type:"conjunction",style:t.listStyle||"narrow",...t}).format(r)}toObject(){return this.isValid?{...this.values}:{}}toISO(){if(!this.isValid)return null;let t="P";return 0!==this.years&&(t+=this.years+"Y"),0===this.months&&0===this.quarters||(t+=this.months+3*this.quarters+"M"),0!==this.weeks&&(t+=this.weeks+"W"),0!==this.days&&(t+=this.days+"D"),0===this.hours&&0===this.minutes&&0===this.seconds&&0===this.milliseconds||(t+="T"),0!==this.hours&&(t+=this.hours+"H"),0!==this.minutes&&(t+=this.minutes+"M"),0===this.seconds&&0===this.milliseconds||(t+=pr(this.seconds+this.milliseconds/1e3,3)+"S"),"P"===t&&(t+="T0S"),t}toISOTime(t={}){if(!this.isValid)return null;const e=this.toMillis();if(e<0||e>=864e5)return null;t={suppressMilliseconds:!1,suppressSeconds:!1,includePrefix:!1,format:"extended",...t,includeOffset:!1};return Ia.fromMillis(e,{zone:"UTC"}).toISOTime(t)}toJSON(){return this.toISO()}toString(){return this.toISO()}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Duration { values: ${JSON.stringify(this.values)} }`:`Duration { Invalid, reason: ${this.invalidReason} }`}toMillis(){return this.isValid?zs(this.matrix,this.values):NaN}valueOf(){return this.toMillis()}plus(t){if(!this.isValid)return this;const e=Us.fromDurationLike(t),r={};for(const t of Ps)(ir(e.values,t)||ir(this.values,t))&&(r[t]=e.get(t)+this.get(t));return Fs(this,{values:r},!0)}minus(t){if(!this.isValid)return this;const e=Us.fromDurationLike(t);return this.plus(e.negate())}mapUnits(t){if(!this.isValid)return this;const e={};for(const r of Object.keys(this.values))e[r]=Sr(t(this.values[r],r));return Fs(this,{values:e},!0)}get(t){return this[Us.normalizeUnit(t)]}set(t){if(!this.isValid)return this;return Fs(this,{values:{...this.values,...$r(t,Us.normalizeUnit)}})}reconfigure({locale:t,numberingSystem:e,conversionAccuracy:r,matrix:s}={}){return Fs(this,{loc:this.loc.clone({locale:t,numberingSystem:e}),matrix:s,conversionAccuracy:r})}as(t){return this.isValid?this.shiftTo(t).get(t):NaN}normalize(){if(!this.isValid)return this;const t=this.toObject();return Hs(this.matrix,t),Fs(this,{values:t},!0)}rescale(){if(!this.isValid)return this;return Fs(this,{values:js(this.normalize().shiftToAll().toObject())},!0)}shiftTo(...t){if(!this.isValid)return this;if(0===t.length)return this;t=t.map(t=>Us.normalizeUnit(t));const e={},r={},s=this.toObject();let a;for(const n of Ps)if(t.indexOf(n)>=0){a=n;let t=0;for(const e in r)t+=this.matrix[e][n]*r[e],r[e]=0;er(s[n])&&(t+=s[n]);const i=Math.trunc(t);e[n]=i,r[n]=(1e3*t-1e3*i)/1e3}else er(s[n])&&(r[n]=s[n]);for(const t in r)0!==r[t]&&(e[a]+=t===a?r[t]:r[t]/this.matrix[a][t]);return Hs(this.matrix,e),Fs(this,{values:e},!0)}shiftToAll(){return this.isValid?this.shiftTo("years","months","weeks","days","hours","minutes","seconds","milliseconds"):this}negate(){if(!this.isValid)return this;const t={};for(const e of Object.keys(this.values))t[e]=0===this.values[e]?0:-this.values[e];return Fs(this,{values:t},!0)}removeZeros(){if(!this.isValid)return this;return Fs(this,{values:js(this.values)},!0)}get years(){return this.isValid?this.values.years||0:NaN}get quarters(){return this.isValid?this.values.quarters||0:NaN}get months(){return this.isValid?this.values.months||0:NaN}get weeks(){return this.isValid?this.values.weeks||0:NaN}get days(){return this.isValid?this.values.days||0:NaN}get hours(){return this.isValid?this.values.hours||0:NaN}get minutes(){return this.isValid?this.values.minutes||0:NaN}get seconds(){return this.isValid?this.values.seconds||0:NaN}get milliseconds(){return this.isValid?this.values.milliseconds||0:NaN}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}equals(t){if(!this.isValid||!t.isValid)return!1;if(!this.loc.equals(t.loc))return!1;function e(t,e){return void 0===t||0===t?void 0===e||0===e:t===e}for(const r of Ps)if(!e(this.values[r],t.values[r]))return!1;return!0}}const Zs="Invalid Interval";class Ws{constructor(t){this.s=t.start,this.e=t.end,this.invalid=t.invalid||null,this.isLuxonInterval=!0}static invalid(t,e=null){if(!t)throw new kt("need to specify a reason the Interval is invalid");const r=t instanceof ze?t:new ze(t,e);if(Fe.throwOnInvalid)throw new xt(r);return new Ws({invalid:r})}static fromDateTimes(t,e){const r=Pa(t),s=Pa(e),a=function(t,e){return t&&t.isValid?e&&e.isValid?e<t?Ws.invalid("end before start",`The end of an interval must be after its start, but you had start=${t.toISO()} and end=${e.toISO()}`):null:Ws.invalid("missing or invalid end"):Ws.invalid("missing or invalid start")}(r,s);return null==a?new Ws({start:r,end:s}):a}static after(t,e){const r=Us.fromDurationLike(e),s=Pa(t);return Ws.fromDateTimes(s,s.plus(r))}static before(t,e){const r=Us.fromDurationLike(e),s=Pa(t);return Ws.fromDateTimes(s.minus(r),s)}static fromISO(t,e){const[r,s]=(t||"").split("/",2);if(r&&s){let t,a,n,i;try{t=Ia.fromISO(r,e),a=t.isValid}catch(s){a=!1}try{n=Ia.fromISO(s,e),i=n.isValid}catch(s){i=!1}if(a&&i)return Ws.fromDateTimes(t,n);if(a){const r=Us.fromISO(s,e);if(r.isValid)return Ws.after(t,r)}else if(i){const t=Us.fromISO(r,e);if(t.isValid)return Ws.before(n,t)}}return Ws.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static isInterval(t){return t&&t.isLuxonInterval||!1}get start(){return this.isValid?this.s:null}get end(){return this.isValid?this.e:null}get lastDateTime(){return this.isValid&&this.e?this.e.minus(1):null}get isValid(){return null===this.invalidReason}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}length(t="milliseconds"){return this.isValid?this.toDuration(t).get(t):NaN}count(t="milliseconds",e){if(!this.isValid)return NaN;const r=this.start.startOf(t,e);let s;return s=e?.useLocaleWeeks?this.end.reconfigure({locale:r.locale}):this.end,s=s.startOf(t,e),Math.floor(s.diff(r,t).get(t))+(s.valueOf()!==this.end.valueOf())}hasSame(t){return!!this.isValid&&(this.isEmpty()||this.e.minus(1).hasSame(this.s,t))}isEmpty(){return this.s.valueOf()===this.e.valueOf()}isAfter(t){return!!this.isValid&&this.s>t}isBefore(t){return!!this.isValid&&this.e<=t}contains(t){return!!this.isValid&&(this.s<=t&&this.e>t)}set({start:t,end:e}={}){return this.isValid?Ws.fromDateTimes(t||this.s,e||this.e):this}splitAt(...t){if(!this.isValid)return[];const e=t.map(Pa).filter(t=>this.contains(t)).sort((t,e)=>t.toMillis()-e.toMillis()),r=[];let{s:s}=this,a=0;for(;s<this.e;){const t=e[a]||this.e,n=+t>+this.e?this.e:t;r.push(Ws.fromDateTimes(s,n)),s=n,a+=1}return r}splitBy(t){const e=Us.fromDurationLike(t);if(!this.isValid||!e.isValid||0===e.as("milliseconds"))return[];let r,{s:s}=this,a=1;const n=[];for(;s<this.e;){const t=this.start.plus(e.mapUnits(t=>t*a));r=+t>+this.e?this.e:t,n.push(Ws.fromDateTimes(s,r)),s=r,a+=1}return n}divideEqually(t){return this.isValid?this.splitBy(this.length()/t).slice(0,t):[]}overlaps(t){return this.e>t.s&&this.s<t.e}abutsStart(t){return!!this.isValid&&+this.e===+t.s}abutsEnd(t){return!!this.isValid&&+t.e===+this.s}engulfs(t){return!!this.isValid&&(this.s<=t.s&&this.e>=t.e)}equals(t){return!(!this.isValid||!t.isValid)&&(this.s.equals(t.s)&&this.e.equals(t.e))}intersection(t){if(!this.isValid)return this;const e=this.s>t.s?this.s:t.s,r=this.e<t.e?this.e:t.e;return e>=r?null:Ws.fromDateTimes(e,r)}union(t){if(!this.isValid)return this;const e=this.s<t.s?this.s:t.s,r=this.e>t.e?this.e:t.e;return Ws.fromDateTimes(e,r)}static merge(t){const[e,r]=t.sort((t,e)=>t.s-e.s).reduce(([t,e],r)=>e?e.overlaps(r)||e.abutsStart(r)?[t,e.union(r)]:[t.concat([e]),r]:[t,r],[[],null]);return r&&e.push(r),e}static xor(t){let e=null,r=0;const s=[],a=t.map(t=>[{time:t.s,type:"s"},{time:t.e,type:"e"}]),n=Array.prototype.concat(...a).sort((t,e)=>t.time-e.time);for(const t of n)r+="s"===t.type?1:-1,1===r?e=t.time:(e&&+e!==+t.time&&s.push(Ws.fromDateTimes(e,t.time)),e=null);return Ws.merge(s)}difference(...t){return Ws.xor([this].concat(t)).map(t=>this.intersection(t)).filter(t=>t&&!t.isEmpty())}toString(){return this.isValid?`[${this.s.toISO()} – ${this.e.toISO()})`:Zs}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`:`Interval { Invalid, reason: ${this.invalidReason} }`}toLocaleString(t=Mt,e={}){return this.isValid?Ur.create(this.s.loc.clone(e),t).formatInterval(this):Zs}toISO(t){return this.isValid?`${this.s.toISO(t)}/${this.e.toISO(t)}`:Zs}toISODate(){return this.isValid?`${this.s.toISODate()}/${this.e.toISODate()}`:Zs}toISOTime(t){return this.isValid?`${this.s.toISOTime(t)}/${this.e.toISOTime(t)}`:Zs}toFormat(t,{separator:e=" – "}={}){return this.isValid?`${this.s.toFormat(t)}${e}${this.e.toFormat(t)}`:Zs}toDuration(t,e){return this.isValid?this.e.diff(this.s,t,e):Us.invalid(this.invalidReason)}mapEndpoints(t){return Ws.fromDateTimes(t(this.s),t(this.e))}}class Rs{static hasDST(t=Fe.defaultZone){const e=Ia.now().setZone(t).set({month:12});return!t.isUniversal&&e.offset!==e.set({month:6}).offset}static isValidIANAZone(t){return ne.isValidZone(t)}static normalizeZone(t){return $e(t,Fe.defaultZone)}static getStartOfWeek({locale:t=null,locObj:e=null}={}){return(e||we.create(t)).getStartOfWeek()}static getMinimumDaysInFirstWeek({locale:t=null,locObj:e=null}={}){return(e||we.create(t)).getMinDaysInFirstWeek()}static getWeekendWeekdays({locale:t=null,locObj:e=null}={}){return(e||we.create(t)).getWeekendDays().slice()}static months(t="long",{locale:e=null,numberingSystem:r=null,locObj:s=null,outputCalendar:a="gregory"}={}){return(s||we.create(e,r,a)).months(t)}static monthsFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:s=null,outputCalendar:a="gregory"}={}){return(s||we.create(e,r,a)).months(t,!0)}static weekdays(t="long",{locale:e=null,numberingSystem:r=null,locObj:s=null}={}){return(s||we.create(e,r,null)).weekdays(t)}static weekdaysFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:s=null}={}){return(s||we.create(e,r,null)).weekdays(t,!0)}static meridiems({locale:t=null}={}){return we.create(t).meridiems()}static eras(t="short",{locale:e=null}={}){return we.create(e,null,"gregory").eras(t)}static features(){return{relative:sr(),localeWeek:ar()}}}function qs(t,e){const r=t=>t.toUTC(0,{keepLocalTime:!0}).startOf("day").valueOf(),s=r(e)-r(t);return Math.floor(Us.fromMillis(s).as("days"))}function Ys(t,e,r,s){let[a,n,i,o]=function(t,e,r){const s=[["years",(t,e)=>e.year-t.year],["quarters",(t,e)=>e.quarter-t.quarter+4*(e.year-t.year)],["months",(t,e)=>e.month-t.month+12*(e.year-t.year)],["weeks",(t,e)=>{const r=qs(t,e);return(r-r%7)/7}],["days",qs]],a={},n=t;let i,o;for(const[l,c]of s)r.indexOf(l)>=0&&(i=l,a[l]=c(t,e),o=n.plus(a),o>e?(a[l]--,(t=n.plus(a))>e&&(o=t,a[l]--,t=n.plus(a))):t=o);return[t,a,o,i]}(t,e,r);const l=e-a,c=r.filter(t=>["hours","minutes","seconds","milliseconds"].indexOf(t)>=0);0===c.length&&(i<e&&(i=a.plus({[o]:1})),i!==a&&(n[o]=(n[o]||0)+l/(i-a)));const d=Us.fromObject(n,s);return c.length>0?Us.fromMillis(l,s).shiftTo(...c).plus(d):d}function Bs(t,e=t=>t){return{regex:t,deser:([t])=>e(function(t){let e=parseInt(t,10);if(isNaN(e)){e="";for(let r=0;r<t.length;r++){const s=t.charCodeAt(r);if(-1!==t[r].search(De.hanidec))e+=Ce.indexOf(t[r]);else for(const t in ke){const[r,a]=ke[t];s>=r&&s<=a&&(e+=s-r)}}return parseInt(e,10)}return e}(t))}}const Gs=`[ ${String.fromCharCode(160)}]`,Js=new RegExp(Gs,"g");function Qs(t){return t.replace(/\./g,"\\.?").replace(Js,Gs)}function Ks(t){return t.replace(/\./g,"").replace(Js," ").toLowerCase()}function Xs(t,e){return null===t?null:{regex:RegExp(t.map(Qs).join("|")),deser:([r])=>t.findIndex(t=>Ks(r)===Ks(t))+e}}function ta(t,e){return{regex:t,deser:([,t,e])=>xr(t,e),groups:e}}function ea(t){return{regex:t,deser:([t])=>t}}const ra={year:{"2-digit":"yy",numeric:"yyyyy"},month:{numeric:"M","2-digit":"MM",short:"MMM",long:"MMMM"},day:{numeric:"d","2-digit":"dd"},weekday:{short:"EEE",long:"EEEE"},dayperiod:"a",dayPeriod:"a",hour12:{numeric:"h","2-digit":"hh"},hour24:{numeric:"H","2-digit":"HH"},minute:{numeric:"m","2-digit":"mm"},second:{numeric:"s","2-digit":"ss"},timeZoneName:{long:"ZZZZZ",short:"ZZZ"}};let sa=null;function aa(t,e){return Array.prototype.concat(...t.map(t=>function(t,e){if(t.literal)return t;const r=oa(Ur.macroTokenToFormatOpts(t.val),e);return null==r||r.includes(void 0)?t:r}(t,e)))}class na{constructor(t,e){if(this.locale=t,this.format=e,this.tokens=aa(Ur.parseFormat(e),t),this.units=this.tokens.map(e=>function(t,e){const r=Ae(e),s=Ae(e,"{2}"),a=Ae(e,"{3}"),n=Ae(e,"{4}"),i=Ae(e,"{6}"),o=Ae(e,"{1,2}"),l=Ae(e,"{1,3}"),c=Ae(e,"{1,6}"),d=Ae(e,"{1,9}"),u=Ae(e,"{2,4}"),h=Ae(e,"{4,6}"),p=t=>{return{regex:RegExp((e=t.val,e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"))),deser:([t])=>t,literal:!0};var e},g=(g=>{if(t.literal)return p(g);switch(g.val){case"G":return Xs(e.eras("short"),0);case"GG":return Xs(e.eras("long"),0);case"y":return Bs(c);case"yy":case"kk":return Bs(u,wr);case"yyyy":case"kkkk":return Bs(n);case"yyyyy":return Bs(h);case"yyyyyy":return Bs(i);case"M":case"L":case"d":case"H":case"h":case"m":case"q":case"s":case"W":return Bs(o);case"MM":case"LL":case"dd":case"HH":case"hh":case"mm":case"qq":case"ss":case"WW":return Bs(s);case"MMM":return Xs(e.months("short",!0),1);case"MMMM":return Xs(e.months("long",!0),1);case"LLL":return Xs(e.months("short",!1),1);case"LLLL":return Xs(e.months("long",!1),1);case"o":case"S":return Bs(l);case"ooo":case"SSS":return Bs(a);case"u":return ea(d);case"uu":return ea(o);case"uuu":case"E":case"c":return Bs(r);case"a":return Xs(e.meridiems(),0);case"EEE":return Xs(e.weekdays("short",!1),1);case"EEEE":return Xs(e.weekdays("long",!1),1);case"ccc":return Xs(e.weekdays("short",!0),1);case"cccc":return Xs(e.weekdays("long",!0),1);case"Z":case"ZZ":return ta(new RegExp(`([+-]${o.source})(?::(${s.source}))?`),2);case"ZZZ":return ta(new RegExp(`([+-]${o.source})(${s.source})?`),2);case"z":return ea(/[a-z_+-/]{1,256}?/i);case" ":return ea(/[^\S\n\r]/);default:return p(g)}})(t)||{invalidReason:"missing Intl.DateTimeFormat.formatToParts support"};return g.token=t,g}(e,t)),this.disqualifyingUnit=this.units.find(t=>t.invalidReason),!this.disqualifyingUnit){const[t,e]=function(t){const e=t.map(t=>t.regex).reduce((t,e)=>`${t}(${e.source})`,"");return[`^${e}$`,t]}(this.units);this.regex=RegExp(t,"i"),this.handlers=e}}explainFromTokens(t){if(this.isValid){const[e,r]=function(t,e,r){const s=t.match(e);if(s){const t={};let e=1;for(const a in r)if(ir(r,a)){const n=r[a],i=n.groups?n.groups+1:1;!n.literal&&n.token&&(t[n.token.val[0]]=n.deser(s.slice(e,e+i))),e+=i}return[s,t]}return[s,{}]}(t,this.regex,this.handlers),[s,a,n]=r?function(t){let e,r=null;tr(t.z)||(r=ne.create(t.z)),tr(t.Z)||(r||(r=new xe(t.Z)),e=t.Z),tr(t.q)||(t.M=3*(t.q-1)+1),tr(t.h)||(t.h<12&&1===t.a?t.h+=12:12===t.h&&0===t.a&&(t.h=0)),0===t.G&&t.y&&(t.y=-t.y),tr(t.u)||(t.S=hr(t.u));const s=Object.keys(t).reduce((e,r)=>{const s=(t=>{switch(t){case"S":return"millisecond";case"s":return"second";case"m":return"minute";case"h":case"H":return"hour";case"d":return"day";case"o":return"ordinal";case"L":case"M":return"month";case"y":return"year";case"E":case"c":return"weekday";case"W":return"weekNumber";case"k":return"weekYear";case"q":return"quarter";default:return null}})(r);return s&&(e[s]=t[r]),e},{});return[s,r,e]}(r):[null,null,void 0];if(ir(r,"a")&&ir(r,"H"))throw new $t("Can't include meridiem when specifying 24-hour format");return{input:t,tokens:this.tokens,regex:this.regex,rawMatches:e,matches:r,result:s,zone:a,specificOffset:n}}return{input:t,tokens:this.tokens,invalidReason:this.invalidReason}}get isValid(){return!this.disqualifyingUnit}get invalidReason(){return this.disqualifyingUnit?this.disqualifyingUnit.invalidReason:null}}function ia(t,e,r){return new na(t,r).explainFromTokens(e)}function oa(t,e){if(!t)return null;const r=Ur.create(e,t).dtFormatter((sa||(sa=Ia.fromMillis(1555555555555)),sa)),s=r.formatToParts(),a=r.resolvedOptions();return s.map(e=>function(t,e,r){const{type:s,value:a}=t;if("literal"===s){const t=/^\s+$/.test(a);return{literal:!t,val:t?" ":a}}const n=e[s];let i=s;"hour"===s&&(i=null!=e.hour12?e.hour12?"hour12":"hour24":null!=e.hourCycle?"h11"===e.hourCycle||"h12"===e.hourCycle?"hour12":"hour24":r.hour12?"hour12":"hour24");let o=ra[i];if("object"==typeof o&&(o=o[n]),o)return{literal:!1,val:o}}(e,t,a))}const la="Invalid DateTime",ca=864e13;function da(t){return new ze("unsupported zone",`the zone "${t.name}" is not supported`)}function ua(t){return null===t.weekData&&(t.weekData=Ye(t.c)),t.weekData}function ha(t){return null===t.localWeekData&&(t.localWeekData=Ye(t.c,t.loc.getMinDaysInFirstWeek(),t.loc.getStartOfWeek())),t.localWeekData}function pa(t,e){const r={ts:t.ts,zone:t.zone,c:t.c,o:t.o,loc:t.loc,invalid:t.invalid};return new Ia({...r,...e,old:r})}function ga(t,e,r){let s=t-60*e*1e3;const a=r.offset(s);if(e===a)return[s,e];s-=60*(a-e)*1e3;const n=r.offset(s);return a===n?[s,a]:[t-60*Math.min(a,n)*1e3,Math.max(a,n)]}function ma(t,e){const r=new Date(t+=60*e*1e3);return{year:r.getUTCFullYear(),month:r.getUTCMonth()+1,day:r.getUTCDate(),hour:r.getUTCHours(),minute:r.getUTCMinutes(),second:r.getUTCSeconds(),millisecond:r.getUTCMilliseconds()}}function fa(t,e,r){return ga(yr(t),e,r)}function ya(t,e){const r=t.o,s=t.c.year+Math.trunc(e.years),a=t.c.month+Math.trunc(e.months)+3*Math.trunc(e.quarters),n={...t.c,year:s,month:a,day:Math.min(t.c.day,fr(s,a))+Math.trunc(e.days)+7*Math.trunc(e.weeks)},i=Us.fromObject({years:e.years-Math.trunc(e.years),quarters:e.quarters-Math.trunc(e.quarters),months:e.months-Math.trunc(e.months),weeks:e.weeks-Math.trunc(e.weeks),days:e.days-Math.trunc(e.days),hours:e.hours,minutes:e.minutes,seconds:e.seconds,milliseconds:e.milliseconds}).as("milliseconds"),o=yr(n);let[l,c]=ga(o,r,t.zone);return 0!==i&&(l+=i,c=t.zone.offset(l)),{ts:l,o:c}}function va(t,e,r,s,a,n){const{setZone:i,zone:o}=r;if(t&&0!==Object.keys(t).length||e){const s=e||o,a=Ia.fromObject(t,{...r,zone:s,specificOffset:n});return i?a:a.setZone(o)}return Ia.invalid(new ze("unparsable",`the input "${a}" can't be parsed as ${s}`))}function ba(t,e,r=!0){return t.isValid?Ur.create(we.create("en-US"),{allowZ:r,forceSimple:!0}).formatDateTimeFromString(t,e):null}function wa(t,e,r){const s=t.c.year>9999||t.c.year<0;let a="";if(s&&t.c.year>=0&&(a+="+"),a+=cr(t.c.year,s?6:4),"year"===r)return a;if(e){if(a+="-",a+=cr(t.c.month),"month"===r)return a;a+="-"}else if(a+=cr(t.c.month),"month"===r)return a;return a+=cr(t.c.day),a}function _a(t,e,r,s,a,n,i){let o=!r||0!==t.c.millisecond||0!==t.c.second,l="";switch(i){case"day":case"month":case"year":break;default:if(l+=cr(t.c.hour),"hour"===i)break;if(e){if(l+=":",l+=cr(t.c.minute),"minute"===i)break;o&&(l+=":",l+=cr(t.c.second))}else{if(l+=cr(t.c.minute),"minute"===i)break;o&&(l+=cr(t.c.second))}if("second"===i)break;!o||s&&0===t.c.millisecond||(l+=".",l+=cr(t.c.millisecond,3))}return a&&(t.isOffsetFixed&&0===t.offset&&!n?l+="Z":t.o<0?(l+="-",l+=cr(Math.trunc(-t.o/60)),l+=":",l+=cr(Math.trunc(-t.o%60))):(l+="+",l+=cr(Math.trunc(t.o/60)),l+=":",l+=cr(Math.trunc(t.o%60)))),n&&(l+="["+t.zone.ianaName+"]"),l}const xa={month:1,day:1,hour:0,minute:0,second:0,millisecond:0},Sa={weekNumber:1,weekday:1,hour:0,minute:0,second:0,millisecond:0},$a={ordinal:1,hour:0,minute:0,second:0,millisecond:0},Da=["year","month","day","hour","minute","second","millisecond"],ka=["weekYear","weekNumber","weekday","hour","minute","second","millisecond"],Ca=["year","ordinal","hour","minute","second","millisecond"];function Oa(t){const e={year:"year",years:"year",month:"month",months:"month",day:"day",days:"day",hour:"hour",hours:"hour",minute:"minute",minutes:"minute",quarter:"quarter",quarters:"quarter",second:"second",seconds:"second",millisecond:"millisecond",milliseconds:"millisecond",weekday:"weekday",weekdays:"weekday",weeknumber:"weekNumber",weeksnumber:"weekNumber",weeknumbers:"weekNumber",weekyear:"weekYear",weekyears:"weekYear",ordinal:"ordinal"}[t.toLowerCase()];if(!e)throw new Dt(t);return e}function Aa(t){switch(t.toLowerCase()){case"localweekday":case"localweekdays":return"localWeekday";case"localweeknumber":case"localweeknumbers":return"localWeekNumber";case"localweekyear":case"localweekyears":return"localWeekYear";default:return Oa(t)}}function Ta(t,e){const r=$e(e.zone,Fe.defaultZone);if(!r.isValid)return Ia.invalid(da(r));const s=we.fromObject(e);let a,n;if(tr(t.year))a=Fe.now();else{for(const e of Da)tr(t[e])&&(t[e]=xa[e]);const e=Ke(t)||Xe(t);if(e)return Ia.invalid(e);const s=function(t){if(void 0===Na&&(Na=Fe.now()),"iana"!==t.type)return t.offset(Na);const e=t.name;let r=La.get(e);return void 0===r&&(r=t.offset(Na),La.set(e,r)),r}(r);[a,n]=fa(t,s,r)}return new Ia({ts:a,zone:r,loc:s,o:n})}function Ma(t,e,r){const s=!!tr(r.round)||r.round,a=tr(r.rounding)?"trunc":r.rounding,n=(t,n)=>{t=pr(t,s||r.calendary?0:2,r.calendary?"round":a);return e.loc.clone(r).relFormatter(r).format(t,n)},i=s=>r.calendary?e.hasSame(t,s)?0:e.startOf(s).diff(t.startOf(s),s).get(s):e.diff(t,s).get(s);if(r.unit)return n(i(r.unit),r.unit);for(const t of r.units){const e=i(t);if(Math.abs(e)>=1)return n(e,t)}return n(t>e?-0:0,r.units[r.units.length-1])}function Ea(t){let e,r={};return t.length>0&&"object"==typeof t[t.length-1]?(r=t[t.length-1],e=Array.from(t).slice(0,t.length-1)):e=Array.from(t),[r,e]}let Na;const La=new Map;class Ia{constructor(t){const e=t.zone||Fe.defaultZone;let r=t.invalid||(Number.isNaN(t.ts)?new ze("invalid input"):null)||(e.isValid?null:da(e));this.ts=tr(t.ts)?Fe.now():t.ts;let s=null,a=null;if(!r){if(t.old&&t.old.ts===this.ts&&t.old.zone.equals(e))[s,a]=[t.old.c,t.old.o];else{const n=er(t.o)&&!t.old?t.o:e.offset(this.ts);s=ma(this.ts,n),r=Number.isNaN(s.year)?new ze("invalid input"):null,s=r?null:s,a=r?null:n}}this._zone=e,this.loc=t.loc||we.create(),this.invalid=r,this.weekData=null,this.localWeekData=null,this.c=s,this.o=a,this.isLuxonDateTime=!0}static now(){return new Ia({})}static local(){const[t,e]=Ea(arguments),[r,s,a,n,i,o,l]=e;return Ta({year:r,month:s,day:a,hour:n,minute:i,second:o,millisecond:l},t)}static utc(){const[t,e]=Ea(arguments),[r,s,a,n,i,o,l]=e;return t.zone=xe.utcInstance,Ta({year:r,month:s,day:a,hour:n,minute:i,second:o,millisecond:l},t)}static fromJSDate(t,e={}){const r=function(t){return"[object Date]"===Object.prototype.toString.call(t)}(t)?t.valueOf():NaN;if(Number.isNaN(r))return Ia.invalid("invalid input");const s=$e(e.zone,Fe.defaultZone);return s.isValid?new Ia({ts:r,zone:s,loc:we.fromObject(e)}):Ia.invalid(da(s))}static fromMillis(t,e={}){if(er(t))return t<-ca||t>ca?Ia.invalid("Timestamp out of range"):new Ia({ts:t,zone:$e(e.zone,Fe.defaultZone),loc:we.fromObject(e)});throw new kt(`fromMillis requires a numerical input, but received a ${typeof t} with value ${t}`)}static fromSeconds(t,e={}){if(er(t))return new Ia({ts:1e3*t,zone:$e(e.zone,Fe.defaultZone),loc:we.fromObject(e)});throw new kt("fromSeconds requires a numerical input")}static fromObject(t,e={}){t=t||{};const r=$e(e.zone,Fe.defaultZone);if(!r.isValid)return Ia.invalid(da(r));const s=we.fromObject(e),a=$r(t,Aa),{minDaysInFirstWeek:n,startOfWeek:i}=Qe(a,s),o=Fe.now(),l=tr(e.specificOffset)?r.offset(o):e.specificOffset,c=!tr(a.ordinal),d=!tr(a.year),u=!tr(a.month)||!tr(a.day),h=d||u,p=a.weekYear||a.weekNumber;if((h||c)&&p)throw new $t("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(u&&c)throw new $t("Can't mix ordinal dates with month/day");const g=p||a.weekday&&!h;let m,f,y=ma(o,l);g?(m=ka,f=Sa,y=Ye(y,n,i)):c?(m=Ca,f=$a,y=Ge(y)):(m=Da,f=xa);let v=!1;for(const t of m){tr(a[t])?a[t]=v?f[t]:y[t]:v=!0}const b=g?function(t,e=4,r=1){const s=rr(t.weekYear),a=lr(t.weekNumber,1,br(t.weekYear,e,r)),n=lr(t.weekday,1,7);return s?a?!n&&Ue("weekday",t.weekday):Ue("week",t.weekNumber):Ue("weekYear",t.weekYear)}(a,n,i):c?function(t){const e=rr(t.year),r=lr(t.ordinal,1,mr(t.year));return e?!r&&Ue("ordinal",t.ordinal):Ue("year",t.year)}(a):Ke(a),w=b||Xe(a);if(w)return Ia.invalid(w);const _=g?Be(a,n,i):c?Je(a):a,[x,S]=fa(_,l,r),$=new Ia({ts:x,zone:r,o:S,loc:s});return a.weekday&&h&&t.weekday!==$.weekday?Ia.invalid("mismatched weekday",`you can't specify both a weekday of ${a.weekday} and a date of ${$.toISO()}`):$.isValid?$:Ia.invalid($.invalid)}static fromISO(t,e={}){const[r,s]=function(t){return qr(t,[vs,xs],[bs,Ss],[ws,$s],[_s,Ds])}(t);return va(r,s,e,"ISO 8601",t)}static fromRFC2822(t,e={}){const[r,s]=function(t){return qr(function(t){return t.replace(/\([^()]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").trim()}(t),[us,hs])}(t);return va(r,s,e,"RFC 2822",t)}static fromHTTP(t,e={}){const[r,s]=function(t){return qr(t,[ps,fs],[gs,fs],[ms,ys])}(t);return va(r,s,e,"HTTP",e)}static fromFormat(t,e,r={}){if(tr(t)||tr(e))throw new kt("fromFormat requires an input string and a format");const{locale:s=null,numberingSystem:a=null}=r,n=we.fromOpts({locale:s,numberingSystem:a,defaultToEN:!0}),[i,o,l,c]=function(t,e,r){const{result:s,zone:a,specificOffset:n,invalidReason:i}=ia(t,e,r);return[s,a,n,i]}(n,t,e);return c?Ia.invalid(c):va(i,o,r,`format ${e}`,t,l)}static fromString(t,e,r={}){return Ia.fromFormat(t,e,r)}static fromSQL(t,e={}){const[r,s]=function(t){return qr(t,[Cs,xs],[Os,As])}(t);return va(r,s,e,"SQL",t)}static invalid(t,e=null){if(!t)throw new kt("need to specify a reason the DateTime is invalid");const r=t instanceof ze?t:new ze(t,e);if(Fe.throwOnInvalid)throw new _t(r);return new Ia({invalid:r})}static isDateTime(t){return t&&t.isLuxonDateTime||!1}static parseFormatForOpts(t,e={}){const r=oa(t,we.fromObject(e));return r?r.map(t=>t?t.val:null).join(""):null}static expandFormat(t,e={}){return aa(Ur.parseFormat(t),we.fromObject(e)).map(t=>t.val).join("")}static resetCache(){Na=void 0,La.clear()}get(t){return this[t]}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}get outputCalendar(){return this.isValid?this.loc.outputCalendar:null}get zone(){return this._zone}get zoneName(){return this.isValid?this.zone.name:null}get year(){return this.isValid?this.c.year:NaN}get quarter(){return this.isValid?Math.ceil(this.c.month/3):NaN}get month(){return this.isValid?this.c.month:NaN}get day(){return this.isValid?this.c.day:NaN}get hour(){return this.isValid?this.c.hour:NaN}get minute(){return this.isValid?this.c.minute:NaN}get second(){return this.isValid?this.c.second:NaN}get millisecond(){return this.isValid?this.c.millisecond:NaN}get weekYear(){return this.isValid?ua(this).weekYear:NaN}get weekNumber(){return this.isValid?ua(this).weekNumber:NaN}get weekday(){return this.isValid?ua(this).weekday:NaN}get isWeekend(){return this.isValid&&this.loc.getWeekendDays().includes(this.weekday)}get localWeekday(){return this.isValid?ha(this).weekday:NaN}get localWeekNumber(){return this.isValid?ha(this).weekNumber:NaN}get localWeekYear(){return this.isValid?ha(this).weekYear:NaN}get ordinal(){return this.isValid?Ge(this.c).ordinal:NaN}get monthShort(){return this.isValid?Rs.months("short",{locObj:this.loc})[this.month-1]:null}get monthLong(){return this.isValid?Rs.months("long",{locObj:this.loc})[this.month-1]:null}get weekdayShort(){return this.isValid?Rs.weekdays("short",{locObj:this.loc})[this.weekday-1]:null}get weekdayLong(){return this.isValid?Rs.weekdays("long",{locObj:this.loc})[this.weekday-1]:null}get offset(){return this.isValid?+this.o:NaN}get offsetNameShort(){return this.isValid?this.zone.offsetName(this.ts,{format:"short",locale:this.locale}):null}get offsetNameLong(){return this.isValid?this.zone.offsetName(this.ts,{format:"long",locale:this.locale}):null}get isOffsetFixed(){return this.isValid?this.zone.isUniversal:null}get isInDST(){return!this.isOffsetFixed&&(this.offset>this.set({month:1,day:1}).offset||this.offset>this.set({month:5}).offset)}getPossibleOffsets(){if(!this.isValid||this.isOffsetFixed)return[this];const t=864e5,e=6e4,r=yr(this.c),s=this.zone.offset(r-t),a=this.zone.offset(r+t),n=this.zone.offset(r-s*e),i=this.zone.offset(r-a*e);if(n===i)return[this];const o=r-n*e,l=r-i*e,c=ma(o,n),d=ma(l,i);return c.hour===d.hour&&c.minute===d.minute&&c.second===d.second&&c.millisecond===d.millisecond?[pa(this,{ts:o}),pa(this,{ts:l})]:[this]}get isInLeapYear(){return gr(this.year)}get daysInMonth(){return fr(this.year,this.month)}get daysInYear(){return this.isValid?mr(this.year):NaN}get weeksInWeekYear(){return this.isValid?br(this.weekYear):NaN}get weeksInLocalWeekYear(){return this.isValid?br(this.localWeekYear,this.loc.getMinDaysInFirstWeek(),this.loc.getStartOfWeek()):NaN}resolvedLocaleOptions(t={}){const{locale:e,numberingSystem:r,calendar:s}=Ur.create(this.loc.clone(t),t).resolvedOptions(this);return{locale:e,numberingSystem:r,outputCalendar:s}}toUTC(t=0,e={}){return this.setZone(xe.instance(t),e)}toLocal(){return this.setZone(Fe.defaultZone)}setZone(t,{keepLocalTime:e=!1,keepCalendarTime:r=!1}={}){if((t=$e(t,Fe.defaultZone)).equals(this.zone))return this;if(t.isValid){let s=this.ts;if(e||r){const e=t.offset(this.ts),r=this.toObject();[s]=fa(r,e,t)}return pa(this,{ts:s,zone:t})}return Ia.invalid(da(t))}reconfigure({locale:t,numberingSystem:e,outputCalendar:r}={}){return pa(this,{loc:this.loc.clone({locale:t,numberingSystem:e,outputCalendar:r})})}setLocale(t){return this.reconfigure({locale:t})}set(t){if(!this.isValid)return this;const e=$r(t,Aa),{minDaysInFirstWeek:r,startOfWeek:s}=Qe(e,this.loc),a=!tr(e.weekYear)||!tr(e.weekNumber)||!tr(e.weekday),n=!tr(e.ordinal),i=!tr(e.year),o=!tr(e.month)||!tr(e.day),l=i||o,c=e.weekYear||e.weekNumber;if((l||n)&&c)throw new $t("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(o&&n)throw new $t("Can't mix ordinal dates with month/day");let d;a?d=Be({...Ye(this.c,r,s),...e},r,s):tr(e.ordinal)?(d={...this.toObject(),...e},tr(e.day)&&(d.day=Math.min(fr(d.year,d.month),d.day))):d=Je({...Ge(this.c),...e});const[u,h]=fa(d,this.o,this.zone);return pa(this,{ts:u,o:h})}plus(t){if(!this.isValid)return this;return pa(this,ya(this,Us.fromDurationLike(t)))}minus(t){if(!this.isValid)return this;return pa(this,ya(this,Us.fromDurationLike(t).negate()))}startOf(t,{useLocaleWeeks:e=!1}={}){if(!this.isValid)return this;const r={},s=Us.normalizeUnit(t);switch(s){case"years":r.month=1;case"quarters":case"months":r.day=1;case"weeks":case"days":r.hour=0;case"hours":r.minute=0;case"minutes":r.second=0;case"seconds":r.millisecond=0}if("weeks"===s)if(e){const t=this.loc.getStartOfWeek(),{weekday:e}=this;e<t&&(r.weekNumber=this.weekNumber-1),r.weekday=t}else r.weekday=1;if("quarters"===s){const t=Math.ceil(this.month/3);r.month=3*(t-1)+1}return this.set(r)}endOf(t,e){return this.isValid?this.plus({[t]:1}).startOf(t,e).minus(1):this}toFormat(t,e={}){return this.isValid?Ur.create(this.loc.redefaultToEN(e)).formatDateTimeFromString(this,t):la}toLocaleString(t=Mt,e={}){return this.isValid?Ur.create(this.loc.clone(e),t).formatDateTime(this):la}toLocaleParts(t={}){return this.isValid?Ur.create(this.loc.clone(t),t).formatDateTimeParts(this):[]}toISO({format:t="extended",suppressSeconds:e=!1,suppressMilliseconds:r=!1,includeOffset:s=!0,extendedZone:a=!1,precision:n="milliseconds"}={}){if(!this.isValid)return null;const i="extended"===t;let o=wa(this,i,n=Oa(n));return Da.indexOf(n)>=3&&(o+="T"),o+=_a(this,i,e,r,s,a,n),o}toISODate({format:t="extended",precision:e="day"}={}){return this.isValid?wa(this,"extended"===t,Oa(e)):null}toISOWeekDate(){return ba(this,"kkkk-'W'WW-c")}toISOTime({suppressMilliseconds:t=!1,suppressSeconds:e=!1,includeOffset:r=!0,includePrefix:s=!1,extendedZone:a=!1,format:n="extended",precision:i="milliseconds"}={}){if(!this.isValid)return null;return i=Oa(i),(s&&Da.indexOf(i)>=3?"T":"")+_a(this,"extended"===n,e,t,r,a,i)}toRFC2822(){return ba(this,"EEE, dd LLL yyyy HH:mm:ss ZZZ",!1)}toHTTP(){return ba(this.toUTC(),"EEE, dd LLL yyyy HH:mm:ss 'GMT'")}toSQLDate(){return this.isValid?wa(this,!0):null}toSQLTime({includeOffset:t=!0,includeZone:e=!1,includeOffsetSpace:r=!0}={}){let s="HH:mm:ss.SSS";return(e||t)&&(r&&(s+=" "),e?s+="z":t&&(s+="ZZ")),ba(this,s,!0)}toSQL(t={}){return this.isValid?`${this.toSQLDate()} ${this.toSQLTime(t)}`:null}toString(){return this.isValid?this.toISO():la}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`:`DateTime { Invalid, reason: ${this.invalidReason} }`}valueOf(){return this.toMillis()}toMillis(){return this.isValid?this.ts:NaN}toSeconds(){return this.isValid?this.ts/1e3:NaN}toUnixInteger(){return this.isValid?Math.floor(this.ts/1e3):NaN}toJSON(){return this.toISO()}toBSON(){return this.toJSDate()}toObject(t={}){if(!this.isValid)return{};const e={...this.c};return t.includeConfig&&(e.outputCalendar=this.outputCalendar,e.numberingSystem=this.loc.numberingSystem,e.locale=this.loc.locale),e}toJSDate(){return new Date(this.isValid?this.ts:NaN)}diff(t,e="milliseconds",r={}){if(!this.isValid||!t.isValid)return Us.invalid("created by diffing an invalid DateTime");const s={locale:this.locale,numberingSystem:this.numberingSystem,...r},a=(o=e,Array.isArray(o)?o:[o]).map(Us.normalizeUnit),n=t.valueOf()>this.valueOf(),i=Ys(n?this:t,n?t:this,a,s);var o;return n?i.negate():i}diffNow(t="milliseconds",e={}){return this.diff(Ia.now(),t,e)}until(t){return this.isValid?Ws.fromDateTimes(this,t):this}hasSame(t,e,r){if(!this.isValid)return!1;const s=t.valueOf(),a=this.setZone(t.zone,{keepLocalTime:!0});return a.startOf(e,r)<=s&&s<=a.endOf(e,r)}equals(t){return this.isValid&&t.isValid&&this.valueOf()===t.valueOf()&&this.zone.equals(t.zone)&&this.loc.equals(t.loc)}toRelative(t={}){if(!this.isValid)return null;const e=t.base||Ia.fromObject({},{zone:this.zone}),r=t.padding?this<e?-t.padding:t.padding:0;let s=["years","months","days","hours","minutes","seconds"],a=t.unit;return Array.isArray(t.unit)&&(s=t.unit,a=void 0),Ma(e,this.plus(r),{...t,numeric:"always",units:s,unit:a})}toRelativeCalendar(t={}){return this.isValid?Ma(t.base||Ia.fromObject({},{zone:this.zone}),this,{...t,numeric:"auto",units:["years","months","days"],calendary:!0}):null}static min(...t){if(!t.every(Ia.isDateTime))throw new kt("min requires all arguments be DateTimes");return nr(t,t=>t.valueOf(),Math.min)}static max(...t){if(!t.every(Ia.isDateTime))throw new kt("max requires all arguments be DateTimes");return nr(t,t=>t.valueOf(),Math.max)}static fromFormatExplain(t,e,r={}){const{locale:s=null,numberingSystem:a=null}=r;return ia(we.fromOpts({locale:s,numberingSystem:a,defaultToEN:!0}),t,e)}static fromStringExplain(t,e,r={}){return Ia.fromFormatExplain(t,e,r)}static buildFormatParser(t,e={}){const{locale:r=null,numberingSystem:s=null}=e,a=we.fromOpts({locale:r,numberingSystem:s,defaultToEN:!0});return new na(a,t)}static fromFormatParser(t,e,r={}){if(tr(t)||tr(e))throw new kt("fromFormatParser requires an input string and a format parser");const{locale:s=null,numberingSystem:a=null}=r,n=we.fromOpts({locale:s,numberingSystem:a,defaultToEN:!0});if(!n.equals(e.locale))throw new kt(`fromFormatParser called with a locale of ${n}, but the format parser was created for ${e.locale}`);const{result:i,zone:o,specificOffset:l,invalidReason:c}=e.explainFromTokens(t);return c?Ia.invalid(c):va(i,o,r,`format ${e.format}`,t,l)}static get DATE_SHORT(){return Mt}static get DATE_MED(){return Et}static get DATE_MED_WITH_WEEKDAY(){return Nt}static get DATE_FULL(){return Lt}static get DATE_HUGE(){return It}static get TIME_SIMPLE(){return Pt}static get TIME_WITH_SECONDS(){return Vt}static get TIME_WITH_SHORT_OFFSET(){return Ft}static get TIME_WITH_LONG_OFFSET(){return zt}static get TIME_24_SIMPLE(){return Ht}static get TIME_24_WITH_SECONDS(){return jt}static get TIME_24_WITH_SHORT_OFFSET(){return Ut}static get TIME_24_WITH_LONG_OFFSET(){return Zt}static get DATETIME_SHORT(){return Wt}static get DATETIME_SHORT_WITH_SECONDS(){return Rt}static get DATETIME_MED(){return qt}static get DATETIME_MED_WITH_SECONDS(){return Yt}static get DATETIME_MED_WITH_WEEKDAY(){return Bt}static get DATETIME_FULL(){return Gt}static get DATETIME_FULL_WITH_SECONDS(){return Jt}static get DATETIME_HUGE(){return Qt}static get DATETIME_HUGE_WITH_SECONDS(){return Kt}}function Pa(t){if(Ia.isDateTime(t))return t;if(t&&t.valueOf&&er(t.valueOf()))return Ia.fromJSDate(t);if(t&&"object"==typeof t)return Ia.fromObject(t);throw new kt(`Unknown datetime argument: ${t}, of type ${typeof t}`)}const Va=o`
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
`;class Fa{static normalizeStage(t){const e=t.toLowerCase();return"veg"===e?"vegetative":"mom"===e?"mother":e}static getPlantStageColor(t){const e=this.normalizeStage(t);return this.stageColors[e]??"#757575"}static getPlantStageIcon(t){const e=this.normalizeStage(t);return this.stageIcons[e]??bt}static getPlantStage(t){const e=t?.attributes??{},r=new Date;return e.cure_start?"cure":e.dry_start?"dry":e.mom_start?"mother":e.clone_start?"clone":e.flower_start&&new Date(e.flower_start)<=r?"flower":e.veg_start&&new Date(e.veg_start)<=r?"vegetative":"seedling"}static createGridLayout(t,e,r){const s=Array.from({length:e},()=>Array.from({length:r},()=>null));return t.forEach(t=>{const a=(t.attributes?.row??1)-1,n=(t.attributes?.col??1)-1;a>=0&&a<e&&n>=0&&n<r&&(s[a][n]=t)}),{rows:e,cols:r,grid:s}}static calculateEffectiveRows(t){const{name:e,plants:r,plants_per_row:s}=t;if("dry"===e||"cure"===e||"mother"===e||"clone"===e){if(0===r.length)return 1;const t=Math.max(...r.map(t=>t.attributes?.row||1)),e=r.filter(e=>(e.attributes?.row||1)===t).length;return e>=s?t+1:t}return s}static parseDateTimeLocal(t){if(t)try{const e=16===t.length?t+":00":t,r=new Date(e);if(isNaN(r.getTime()))return;const s=r.getFullYear(),a=String(r.getMonth()+1).padStart(2,"0"),n=String(r.getDate()).padStart(2,"0"),i=String(r.getHours()).padStart(2,"0"),o=String(r.getMinutes()).padStart(2,"0");return`${s}-${a}-${n}T${i}:${o}:${String(r.getSeconds()).padStart(2,"0")}`}catch{return}}static formatDateForBackend(t){if(t)try{const e=t.split("T");if(e.length>0&&e[0].match(/^\d{4}-\d{2}-\d{2}$/))return e[0];const r=new Date(t);if(isNaN(r.getTime()))return;const s=r.getFullYear(),a=String(r.getMonth()+1).padStart(2,"0");return`${s}-${a}-${String(r.getDate()).padStart(2,"0")}`}catch{return}}static getCurrentDateTime(){const t=new Date,e=t=>t.toString().padStart(2,"0");return`${t.getFullYear()}-${e(t.getMonth()+1)}-${e(t.getDate())}T${e(t.getHours())}:${e(t.getMinutes())}:00`}static toDateTimeLocal(t){if(!t)return"";try{const e=new Date(t);if(isNaN(e.getTime()))return"";const r=t=>t.toString().padStart(2,"0"),s=e.getFullYear(),a=r(e.getMonth()+1),n=r(e.getDate()),i=r(e.getHours());return`${s}-${a}-${n}T${i}:${r(e.getMinutes())}`}catch{return""}}static getDominantStage(t){if(!t||0===t.length)return null;const e=["cure","dry","flower","vegetative","clone","mother","seedling"];let r=null,s=0;const a={};for(const e of t){const t=this.normalizeStage(e.state||this.getPlantStage(e));a[t]||(a[t]=[]),a[t].push(e)}for(const t of e)if(a[t]&&a[t].length>0){r=t;const e=`${"vegetative"===t?"veg":t}_days`,n=a[t].map(t=>{const r=t.attributes[e];return"number"==typeof r?r:0});s=Math.max(...n);break}return r?{stage:r,days:s}:null}}Fa.stageColors={mother:"#E91E63",clone:"#FF5722",seedling:"#4CAF50",vegetative:"#8BC34A",flower:"#FF9800",dry:"#795548",cure:"#9C27B0"},Fa.stageIcons={mother:bt,clone:bt,seedling:bt,vegetative:bt,flower:ft,dry:yt,cure:gt};class za{constructor(t){this.hass=t}getGrowspaceDevices(){if(!this.hass)return[];const t=Object.values(this.hass.states),e=t.filter(t=>t.entity_id.startsWith("sensor.")&&void 0!==t.attributes?.growspace_id&&void 0!==t.attributes?.rows&&void 0!==t.attributes?.plants_per_row&&void 0===t.attributes?.row&&void 0===t.attributes?.col),r=new Map;return e.forEach(t=>{const e=t.attributes.growspace_id;r.set(e,[])}),t.forEach(t=>{if(void 0!==t.attributes?.row&&void 0!==t.attributes?.col){const e=this.getGrowspaceId(t);r.has(e)||r.set(e,[]),r.get(e).push(t)}}),Array.from(r.entries()).map(([t,r])=>{const s=e.find(e=>e.attributes?.growspace_id===t),a=s?.attributes?.friendly_name||`Growspace ${t}`,n=s?.attributes?.type??(a.toLowerCase().includes("dry")?"dry":a.toLowerCase().includes("cure")?"cure":"normal");return i={device_id:t,overview_entity_id:s?.entity_id,name:a,plants:r,rows:s?.attributes?.rows??3,plants_per_row:s?.attributes?.plants_per_row??3,type:n},{...i,type:i.type??"normal"};var i})}getGrowspaceId(t){return t.attributes?.growspace_id||"unknown"}getStrainLibrary(){const t=Object.values(this.hass.states).find(t=>void 0!==t.attributes?.strains&&null!==t.attributes?.strains),e=t?.attributes?.strains;return e?Array.isArray(e)?e.map(t=>({strain:t,phenotype:"",key:`${t}|default`})):"object"==typeof e?Object.keys(e).map(t=>{const e=t.split("|");return{strain:e[0],phenotype:e.length>1&&"default"!==e[1]?e[1]:"",key:t}}).sort((t,e)=>t.strain.localeCompare(e.strain)):[]:[]}async addPlant(t){console.log("[DataService:addPlant] Sending payload:",t);try{"mother"!==t.growspace_id&&"mother_overview"!==t.growspace_id||(t.mother_start=(new Date).toISOString().split("T")[0]),"clone"!==t.growspace_id&&"clone_overview"!==t.growspace_id||(t.clone_start=(new Date).toISOString().split("T")[0]);const e=await this.hass.callService("growspace_manager","add_plant",t);return console.log("[DataService:addPlant] Response:",e),e}catch(t){throw console.error("[DataService:addPlant] Error:",t),t}}async updatePlant(t){console.log("[DataService:updatePlant] Sending payload:",t);try{const e=await this.hass.callService("growspace_manager","update_plant",t);return console.log("[DataService:updatePlant] Response:",e),e}catch(t){throw console.error("[DataService:updatePlant] Error:",t),t}}async removePlant(t){console.log("[DataService:removePlant] Removing plant_id:",t);try{const e=await this.hass.callService("growspace_manager","remove_plant",{plant_id:t});return console.log("[DataService:removePlant] Response:",e),e}catch(t){throw console.error("[DataService:removePlant] Error:",t),t}}async harvestPlant(t,e="dry"){console.log("[DataService:harvestPlant] Harvesting plant:",t,"→ target:",e);try{const r=(e||"").toLowerCase(),s={plant_id:t};r.includes("dry")?s.target_growspace_id="dry_overview":r.includes("cure")?s.target_growspace_id="cure_overview":r.includes("mother")?s.target_growspace_id="mother_overview":r.includes("clone")?s.target_growspace_id="clone_overview":r&&(s.target_growspace_name=e);const a=await this.hass.callService("growspace_manager","harvest_plant",s);return console.log("[DataService:harvestPlant] Response:",a),a}catch(t){throw console.error("[DataService:harvestPlant] Error:",t),t}}async takeClone(t,e="clone"){console.log("[DataService:takeClone] Cloning plant:",t,"→ target:",e);try{const r=(e||"").toLowerCase(),s={plant_id:t};r.includes("dry")?s.target_growspace_id="dry_overview":r.includes("cure")?s.target_growspace_id="cure_overview":r.includes("mother")?s.target_growspace_id="mother_overview":r.includes("clone")?s.target_growspace_id="clone_overview":r&&(s.target_growspace_name=e);const a=await this.hass.callService("growspace_manager","takeClone",s);return console.log("[DataService:takeClone] Response:",a),a}catch(t){throw console.error("[DataService:takeClone] Error:",t),t}}async swapPlants(t,e){console.log(`[DataService:swapPlants] Swapping plants: ${t} and ${e}`);try{const r=await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e});return console.log("[DataService:swapPlants] Response:",r),r}catch(t){throw console.error("[DataService:swapPlants] Error:",t),t}}async addStrain(t,e){console.log("[DataService:addStrain] Adding strain:",t,e);try{const r=await this.hass.callService("growspace_manager","add_strain",{strain:t,phenotype:e});return console.log("[DataService:addStrain] Response:",r),r}catch(t){throw console.error("[DataService:addStrain] Error:",t),t}}async removeStrain(t,e){console.log("[DataService:removeStrain] Removing strain:",t,e);try{const r=await this.hass.callService("growspace_manager","remove_strain",{strain:t,phenotype:e});return console.log("[DataService:removeStrain] Response:",r),r}catch(t){throw console.error("[DataService:removeStrain] Error:",t),t}}async importStrainLibrary(t){console.log("[DataService:importStrainLibrary] Importing strains:",t);try{const e=await this.hass.callService("growspace_manager","import_strain_library",{strains:t});return console.log("[DataService:importStrainLibrary] Response:",e),e}catch(t){throw console.error("[DataService:importStrainLibrary] Error:",t),t}}async clearStrainLibrary(){console.log("[DataService:clearStrainLibrary] Clearing library");try{const t=await this.hass.callService("growspace_manager","clear_strain_library");return console.log("[DataService:clearStrainLibrary] Response:",t),t}catch(t){throw console.error("[DataService:clearStrainLibrary] Error:",t),t}}}class Ha{static renderAddPlantDialog(t,e,r){if(!t?.open)return Z``;const s=[...new Set(e.map(t=>t.strain))].sort();return Z`
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
               ${Ha.renderMD3SelectInput("Strain *",t.strain||"",s,r.onStrainChange)}
               ${Ha.renderMD3TextInput("Phenotype",t.phenotype||"",r.onPhenotypeChange)}
               <div style="display:flex; gap:16px;">
                 ${Ha.renderMD3NumberInput("Row",t.row+1,t=>r.onRowChange(t))}
                 ${Ha.renderMD3NumberInput("Col",t.col+1,t=>r.onColChange(t))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${Ha.renderMD3DateInput("Vegetative Start",t.veg_start||"",r.onVegStartChange)}
               ${Ha.renderMD3DateInput("Flower Start",t.flower_start||"",r.onFlowerStartChange)}
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
    `}static renderPlantOverviewDialog(t,e,r){if(!t?.open)return Z``;const{plant:s,editedAttributes:a}=t,n=s.attributes?.plant_id||s.entity_id.replace("sensor.",""),i=Fa.getPlantStageColor(s.state),o=Fa.getPlantStageIcon(s.state),l=(t,e)=>{a[t]="number"==typeof e?e.toString():e,r.onAttributeChange(t,a[t])};return Z`
      <ha-dialog
        open
        @closed=${r.onClose}
        hideActions
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="glass-dialog-container" style="--stage-color: ${i}">

          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${o}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
               <h2 class="dialog-title">${a.strain||"Unknown Strain"}</h2>
               <div class="dialog-subtitle">${s.state} Stage • ${a.phenotype||"No Phenotype"}</div>
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
               ${Ha.renderMD3TextInput("Strain Name",a.strain||"",t=>r.onAttributeChange("strain",t))}
               ${Ha.renderMD3TextInput("Phenotype",a.phenotype||"",t=>r.onAttributeChange("phenotype",t))}
               <div style="display:flex; gap:16px;">
                 ${Ha.renderMD3NumberInput("Row",a.row||1,t=>r.onAttributeChange("row",parseInt(t)))}
                 ${Ha.renderMD3NumberInput("Col",a.col||1,t=>r.onAttributeChange("col",parseInt(t)))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${"mother"===a.stage?Ha.renderMD3DateInput("Mother Start",a.mother_start??"",t=>l("mother_start",t)):R}
               ${"clone"===a.stage?Ha.renderMD3DateInput("Clone Start",a.clone_start??"",t=>l("clone_start",t)):R}
               ${"veg"===a.stage||"flower"===a.stage?Ha.renderMD3DateInput("Vegetative Start",a.veg_start??"",t=>l("veg_start",t)):R}
               ${"flower"===a.stage?Ha.renderMD3DateInput("Flower Start",a.flower_start??"",t=>l("flower_start",t)):R}
               ${"dry"===a.stage||"cure"===a.stage?Ha.renderMD3DateInput("Dry Start",a.dry_start??"",t=>l("dry_start",t)):R}
               ${"cure"===a.stage?Ha.renderMD3DateInput("Cure Start",a.cure_start??"",t=>l("cure_start",t)):R}
             </div>

             <!-- STATS CARD -->
             ${Ha.renderPlantStatsMD3(s)}

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
             ${"mother"===s.state.toLowerCase()?Z`
                <div class="take-clone-container" style="display:contents;" data-plant-id="${s.entity_id}">
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
                    @click=${t=>{const e=t.currentTarget.previousElementSibling,a=e?parseInt(e.value,10):1;r.onTakeClone(s,a)}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"}"></path></svg>
                    Take Clone
                  </button>
                </div>
             `:R}

             ${"flower"===s.state.toLowerCase()?Z`
               <button class="md3-button primary" @click=${()=>r.onHarvest(s)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ft}"></path></svg>
                 Harvest
               </button>
             `:R}

             ${"dry"===s.state.toLowerCase()?Z`
               <button class="md3-button primary" @click=${()=>r.onFinishDrying(s)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${gt}"></path></svg>
                 Finish Drying
               </button>
             `:R}

             ${"clone"===s.state.toLowerCase()?Z`
               <div style="display:contents;">
                  <select class="md3-input" style="width: auto; height: 40px; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 0 16px;" id="clone-target-select">
                    <option value="">Move to...</option>
                    ${Object.entries(e).map(([t,e])=>Z`<option value="${t}">${e}</option>`)}
                  </select>
                  <button class="md3-button primary"
                    @click=${t=>{const e=t.currentTarget.previousElementSibling;e.value?r.onMoveClone(s,e.value):alert("Select a growspace")}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"}"></path></svg>
                    Move
                  </button>
               </div>
             `:R}
          </div>

        </div>
      </ha-dialog>
    `}static renderStrainLibraryDialog(t,e){if(!t?.open)return Z``;const r={},s=(t.searchQuery||"").toLowerCase();t.strains.forEach(t=>{const e=t.strain;(!s||e.toLowerCase().includes(s)||t.phenotype&&t.phenotype.toLowerCase().includes(s))&&(r[e]||(r[e]=[]),r[e].push(t))});const a=Object.keys(r).sort();return Z`
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
            ${a.length>0?Z`
              <table class="strain-table">
                ${a.map(s=>{const a=t.expandedStrains?.includes(s),n=r[s];return n.filter(t=>t.phenotype).length,Z`
                    <tr class="strain-row" @click=${()=>e.onToggleExpand(s)}>
                      <td class="strain-cell expand-icon">
                        <svg style="width:24px;height:24px;fill:currentColor;"
                             class="rotate-icon ${a?"expanded":""}"
                             viewBox="0 0 24 24">
                          <path d="${"M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"}"></path>
                        </svg>
                      </td>
                      <td class="strain-cell content">
                        ${s}
                        <span class="badge">${n.length} Var.</span>
                      </td>
                    </tr>
                    ${a?Z`
                      <tr class="pheno-row">
                        <td colspan="3" class="pheno-list">
                           ${n.map(t=>Z`
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
            `:Z`
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
    `}static renderMD3TextInput(t,e,r){return Z`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="text"
          class="md3-input"
          .value=${e}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderMD3SelectInput(t,e,r,s){return Z`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <select
          class="md3-input"
          .value=${e}
          @change=${t=>s(t.target.value)}
        >
          <option value="">Select...</option>
          ${r.map(t=>Z`<option value="${t}" ?selected=${t===e}>${t}</option>`)}
        </select>
      </div>
    `}static renderMD3NumberInput(t,e,r){return Z`
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
    `}static renderMD3DateInput(t,e,r){const s=Fa.toDateTimeLocal(e);return Z`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="datetime-local"
          class="md3-input"
          .value=${s}
          @input=${t=>r(t.target.value)}
        />
      </div>
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
    `}static renderDateTimeInput(t,e,r,s){return Z`
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
          @input=${t=>s(t.target.value)}
        />
      </div>
    `}static renderPlantStatsMD3(t){return t.attributes?.veg_days||t.attributes?.flower_days||t.attributes?.dry_days||t.attributes?.cure_days?Z`
      <div class="detail-card">
        <h3>Current Progress</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
           ${t.attributes?.veg_days?Z`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-veg);">${t.attributes.veg_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Veg Days</span>
             </div>
           `:""}
           ${t.attributes?.flower_days?Z`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-flower);">${t.attributes.flower_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Flower Days</span>
             </div>
           `:""}
           ${t.attributes?.dry_days?Z`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-dry);">${t.attributes.dry_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Drying Days</span>
             </div>
           `:""}
           ${t.attributes?.cure_days?Z`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-cure);">${t.attributes.cure_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Curing Days</span>
             </div>
           `:""}
        </div>
      </div>
    `:Z``}static renderPlantStats(t){return this.renderPlantStatsMD3(t)}}let ja=class extends ot{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._strainLibraryDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1,this._handleTakeClone=t=>{const e=t.attributes?.plant_id||t.entity_id.replace("sensor.","");this.hass.callService("growspace_manager","take_clone",{mother_plant_id:e}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})},this.clonePlant=(t,e)=>{const r=t.attributes?.plant_id||t.entity_id.replace("sensor.",""),s=e;this.hass.callService("growspace_manager","take_clone",{mother_plant_id:r,num_clones:s}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})}}firstUpdated(){this.dataService=new za(this.hass),this.initializeSelectedDevice()}initializeSelectedDevice(){const t=this.dataService.getGrowspaceDevices();if(t.length&&!this.selectedDevice){if(this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);if(e)return void(this.selectedDevice=e.device_id)}this.selectedDevice=t[0].device_id}}static async getConfigElement(){await Promise.resolve().then(function(){return Za});return document.createElement("growspace-manager-card-editor")}static getStubConfig(){return{default_growspace:"4x4",compact:!0}}setConfig(t){if(!t)throw new Error("Invalid configuration");this._config=t}getCardSize(){return 4}_handleDeviceChange(t){const e=t.target;this.selectedDevice=e.value}_handlePlantClick(t){this._plantOverviewDialog={open:!0,plant:t,editedAttributes:{...t.attributes}}}getHaDateTimeString(){const t=this.hass.config.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone;return Ia.now().setZone(t).toFormat("yyyy-LL-dd'T'HH:mm")}_openAddPlantDialog(t,e){const r=this.getHaDateTimeString(),s=this.dataService.getStrainLibrary(),a=s.length>0?s[0].strain:"",n=s.length>0?s[0].phenotype:"";this._addPlantDialog={open:!0,row:t,col:e,strain:a,phenotype:n,veg_start:r,flower_start:r}}async _confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const{row:t,col:e,strain:r,phenotype:s,veg_start:a,flower_start:n}=this._addPlantDialog;try{const i={growspace_id:this.selectedDevice,row:t+1,col:e+1,strain:r,phenotype:s,veg_start:Fa.formatDateForBackend(a)??Fa.formatDateForBackend(Fa.getCurrentDateTime()),flower_start:Fa.formatDateForBackend(n)??Fa.formatDateForBackend(Fa.getCurrentDateTime())};console.log("Adding plant to growspace:",this.selectedDevice,i),console.log("Adding plant:",i),await this.dataService.addPlant(i),this._addPlantDialog=null}catch(t){console.error("Error adding plant:",t)}}async _updatePlant(){if(!this._plantOverviewDialog)return;const{plant:t,editedAttributes:e}=this._plantOverviewDialog,r={plant_id:t.attributes?.plant_id||t.entity_id.replace("sensor.","")},s=["seedling_start","mother_start","clone_start","veg_start","flower_start","dry_start","cure_start"];["strain","phenotype","row","col",...s].forEach(t=>{if(void 0!==e[t]&&null!==e[t])if(s.includes(t)){const s=Fa.formatDateForBackend(String(e[t]));s&&(r[t]=s)}else r[t]=e[t]});try{await this.dataService.updatePlant(r),this._plantOverviewDialog=null}catch(t){console.error("Error updating plant:",t)}}async _handleDeletePlant(t){if(confirm("Are you sure you want to delete this plant?"))try{await this.dataService.removePlant(t),this._plantOverviewDialog=null}catch(t){console.error("Error deleting plant:",t)}}async _movePlantToNextStage(t){if(!this._plantOverviewDialog?.plant)return void console.error("No plant found in overview dialog");const e=this._plantOverviewDialog.plant,r=e.attributes?.stage;let s="";const a=new Set(["mother","flower","dry","cure"]);if(r&&a.has(r)){"flower"===r?s="dry":"dry"===r?s="cure":"mother"===r?s="clone":(console.error("Unknown stage, cannot move plant",s),s="error");try{const t=e.attributes?.plant_id||e.entity_id.replace("sensor.","");await this.dataService.harvestPlant(t,s),this._plantOverviewDialog=null}catch(t){console.error("Error moving plant to next stage:",t)}}else alert("Plant must be in mother or flower or dry or cure stage to move. stage is "+r)}async _harvestPlant(t){await this._movePlantToNextStage(t)}async _finishDryingPlant(t){await this._movePlantToNextStage(t)}_openStrainLibraryDialog(){const t=this.dataService.getStrainLibrary();this._strainLibraryDialog={open:!0,newStrain:"",newPhenotype:"",strains:t,searchQuery:"",isAddFormOpen:!1,expandedStrains:[],confirmClearAll:!1}}_toggleStrainExpansion(t){if(!this._strainLibraryDialog)return;const e=this._strainLibraryDialog.expandedStrains||[],r=e.includes(t);this._strainLibraryDialog.expandedStrains=r?e.filter(e=>e!==t):[...e,t],this.requestUpdate()}_setStrainSearchQuery(t){this._strainLibraryDialog&&(this._strainLibraryDialog.searchQuery=t,this.requestUpdate())}_toggleAddStrainForm(){this._strainLibraryDialog&&(this._strainLibraryDialog.isAddFormOpen=!this._strainLibraryDialog.isAddFormOpen,this.requestUpdate())}_promptClearAll(){this._strainLibraryDialog&&(this._strainLibraryDialog.confirmClearAll=!0,this.requestUpdate())}_cancelClearAll(){this._strainLibraryDialog&&(this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate())}async _addStrain(){if(!this._strainLibraryDialog?.newStrain)return;const t=this._strainLibraryDialog.newStrain,e=this._strainLibraryDialog.newPhenotype;try{await this.dataService.addStrain(t,e);const r=`${t}|${e||"default"}`,s={strain:t,phenotype:e,key:r};this._strainLibraryDialog.strains.some(t=>t.key===r)||this._strainLibraryDialog.strains.push(s),this._strainLibraryDialog.newStrain="",this._strainLibraryDialog.newPhenotype="",this._strainLibraryDialog.isAddFormOpen=!1,this.requestUpdate()}catch(t){console.error("Error adding strain:",t)}}async _removeStrain(t){if(this._strainLibraryDialog)try{const e=t.split("|"),r=e[0],s=e.length>1&&"default"!==e[1]?e[1]:void 0;await this.dataService.removeStrain(r,s),this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e.key!==t),this.requestUpdate()}catch(t){console.error("Error removing strain:",t)}}async _clearStrains(){await this.dataService.clearStrainLibrary(),this._strainLibraryDialog&&(this._strainLibraryDialog.strains=[],this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate())}updateGrid(){this.dataService=new za(this.hass),this.requestUpdate()}_handleDragStart(t,e){this._draggedPlant=e,t.dataTransfer?.setData("text/plain",JSON.stringify({id:e.entity_id}));t.target.classList.add("dragging")}_handleDragEnd(t){t.target.classList.remove("dragging")}_handleDragOver(t){t.preventDefault()}async _handleDrop(t,e,r,s){if(t.preventDefault(),!this._draggedPlant||!this.selectedDevice)return;const a=this._draggedPlant;this._draggedPlant=null;try{if(s){const t=a.attributes.plant_id||a.entity_id.replace("sensor.",""),e=s.attributes.plant_id||s.entity_id.replace("sensor.","");await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e}),this.updateGrid()}else await this._movePlant(a,e,r)}catch(t){console.error("Error during drag-and-drop:",t)}}async _movePlant(t,e,r){try{const s=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.dataService.updatePlant({plant_id:s,row:e,col:r})}catch(t){console.error("Error moving plant:",t)}}_moveClonePlant(t,e){this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Moved clone ${t.attributes.friendly_name} to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})}render(){if(!this.hass)return Z`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;this.dataService=new za(this.hass);const t=this.dataService.getGrowspaceDevices();if(!t.length)return Z`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;if(!this._defaultApplied&&this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);e&&(this.selectedDevice=e.device_id),this._defaultApplied=!0}this.selectedDevice&&t.find(t=>t.device_id===this.selectedDevice)||(this.selectedDevice=t[0].device_id);const e=t.find(t=>t.device_id===this.selectedDevice);if(!e)return Z`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;const r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;r&&Object.entries(r).forEach(([t,e])=>{});const s=Fa.calculateEffectiveRows(e),{grid:a}=Fa.createGridLayout(e.plants,s,e.plants_per_row),n=e.plants_per_row>6;return Z`
      <ha-card class=${n?"wide-growspace":""}>
        ${this._isCompactView?"":this.renderGrowspaceHeader(e)}
        ${this.renderHeader(t)}
        ${this.renderGrid(a,s,e.plants_per_row)}
      </ha-card>
      
      ${this.renderDialogs()}
    `}renderGrowspaceHeader(t){const e=Fa.getDominantStage(t.plants),r=e?Fa.getPlantStageColor(e.stage):"var(--plant-border-color-default)",s=e?Fa.getPlantStageIcon(e.stage):bt;let a=33,n=150,i=243;if(r.startsWith("#")){const t=r.substring(1);6===t.length&&(a=parseInt(t.substring(0,2),16),n=parseInt(t.substring(2,4),16),i=parseInt(t.substring(4,6),16))}const o=`${a}, ${n}, ${i}`;let l=t.name.toLowerCase().replace(/\s+/g,"_");t.overview_entity_id&&(l=t.overview_entity_id.replace("sensor.",""));const c=`binary_sensor.${l}_optimal_conditions`,d=this.hass.states[c],u=`binary_sensor.${l}_light_schedule_correct`,h=this.hass.states[u],p=(t,e)=>t?.attributes?.[e],g=p(d,"temperature"),m=p(d,"humidity"),f=p(d,"vpd"),y=p(d,"co2"),v=!0===d?.attributes?.is_lights_on,b=h?.attributes?.time_in_current_state;let w=0;if(h?.attributes?.expected_schedule){const t=h.attributes.expected_schedule.split("/");if(2===t.length){const e=parseFloat(t[0]);if(b){const[t,r]=b.split(":").map(Number),s=t+r/60;e>0&&(w=v?Math.min(s/e*100,100):0)}}}let _="";if(b){const[t,e]=b.split(":");_=`${t}h ${e}m`}return Z`
      <div class="growspace-header-card" style="--stage-color: ${r}; --stage-color-rgb: ${o}">
         <div class="gs-header-top">
            <div class="gs-title-group">
               <div class="gs-icon-box">
                  <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                     <path d="${s}"></path>
                  </svg>
               </div>
               <div>
                  <h3 class="gs-title">${t.name}</h3>
                  <div class="gs-subtitle">
                     ${e?`${e.days} Days in ${e.stage}`:"Empty / No Active Plants"}
                  </div>
               </div>
            </div>

            ${h?Z`
              <div style="text-align: right; min-width: 120px;">
                 <div style="font-size: 0.9rem; font-weight: 500;">
                    Light: ${v?"ON":"OFF"}
                 </div>
                 <div style="font-size: 0.8rem; opacity: 0.7;">
                    ${_}
                 </div>
                 ${v?Z`
                 <div class="light-status-bar">
                    <div class="light-progress" style="width: ${w}%"></div>
                 </div>`:""}
              </div>
            `:""}
         </div>

         <div class="gs-stats-grid">
            ${void 0!==g?Z`
               <div class="gs-stat-item">
                  <span class="gs-stat-value">${g}°C</span>
                  <span class="gs-stat-label">Temp</span>
               </div>
            `:""}
            ${void 0!==m?Z`
               <div class="gs-stat-item">
                  <span class="gs-stat-value">${m}%</span>
                  <span class="gs-stat-label">Hum</span>
               </div>
            `:""}
            ${void 0!==f?Z`
               <div class="gs-stat-item">
                  <span class="gs-stat-value">${f} kPa</span>
                  <span class="gs-stat-label">VPD</span>
               </div>
            `:""}
            ${void 0!==y?Z`
               <div class="gs-stat-item">
                  <span class="gs-stat-value">${y} ppm</span>
                  <span class="gs-stat-label">CO2</span>
               </div>
            `:""}
         </div>
      </div>
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
              <path d="${"M4,2H6V4C6,5.44 6.68,6.61 7.88,7.78C8.74,8.61 9.89,9.41 11.09,10.2L9.26,11.39C8.27,10.72 7.31,10 6.5,9.21C5.07,7.82 4,6.1 4,4V2M18,2H20V4C20,6.1 18.93,7.82 17.5,9.21C16.09,10.59 14.29,11.73 12.54,12.84C10.79,13.96 9.09,15.05 7.88,16.22C6.68,17.39 6,18.56 6,20V22H4V20C4,17.9 5.07,16.18 6.5,14.79C7.91,13.41 9.71,12.27 11.46,11.16C13.21,10.04 14.91,8.95 16.12,7.78C17.32,6.61 18,5.44 18,4V2M14.74,12.61C15.73,13.28 16.69,14 17.5,14.79C18.93,16.18 20,17.9 20,20V22H18V20C18,18.56 17.32,17.39 16.12,16.22C15.26,15.39 14.11,14.59 12.91,13.8L14.74,12.61M7,3H17V4L16.94,4.5H7.06L7,4V3M7.68,6H16.32C16.08,6.34 15.8,6.69 15.42,7.06L14.91,7.5H9.07L8.58,7.06C8.2,6.69 7.92,6.34 7.68,6M9.09,16.5H14.93L15.42,16.94C15.8,17.31 16.08,17.66 16.32,18H7.68C7.92,17.66 8.2,17.31 8.58,16.94L9.09,16.5M7.06,19.5H16.94L17,20V21H7V20L7.06,19.5Z"}"></path>
            </svg>
            Strains
          </button>
        </div>
      </div>
    `}renderGrid(t,e,r){return Z`
      <div class="grid ${this._isCompactView?"compact":""}" 
           style="grid-template-columns: repeat(${r}, 1fr); grid-template-rows: repeat(${e}, 1fr);">
        ${t.flat().map((t,e)=>{const s=Math.floor(e/r)+1,a=e%r+1;return t?this.renderPlantSlot(t,s,a):this.renderEmptySlot(s,a)})}
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
            <path d="${vt}"></path>
          </svg>
        </div>
        <div class="plant-name">Add Plant</div>
        <div class="plant-stage">Empty Slot</div>
      </div>
    `}renderPlantSlot(t,e,r){const s=Fa.getPlantStageColor(t.state),a=Fa.getPlantStageIcon(t.state);return Z`
      <div 
        class="plant" 
        style="grid-row: ${e}; grid-column: ${r}; --stage-color: ${s}"
        draggable="true"
        @dragstart=${e=>this._handleDragStart(e,t)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${s=>this._handleDrop(s,e,r,t)}
        @click=${()=>this._handlePlantClick(t)}
      >
        <div class="plant-header">
          <svg class="plant-icon" viewBox="0 0 24 24">
            <path d="${a}"></path>
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
    `}renderPlantDays(t){const e=[{days:t.attributes?.seedling_days,icon:bt,title:"Days in Seedling",stage:"seedling"},{days:t.attributes?.mother_days,icon:bt,title:"Days in Mother",stage:"mother"},{days:t.attributes?.clone_days,icon:bt,title:"Days in Clone",stage:"clone"},{days:t.attributes?.veg_days,icon:bt,title:"Days in Vegetative",stage:"vegetative"},{days:t.attributes?.flower_days,icon:ft,title:"Days in Flower",stage:"flower"},{days:t.attributes?.dry_days,icon:yt,title:"Days in Dry",stage:"dry"},{days:t.attributes?.cure_days,icon:gt,title:"Days in Cure",stage:"cure"}].filter(t=>t.days);return e.length?Z`
      <div class="plant-days">
        ${e.map(({days:t,icon:e,title:r,stage:s})=>{const a=Fa.getPlantStageColor(s);return Z`
            <span title="${r}" style="color: ${a}">
              <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${e}"></path>
              </svg>
              ${t}d
            </span>
          `})}
      </div>
    `:Z``}renderDialogs(){const t=this.dataService?.getStrainLibrary()||[],e={},r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;return r&&Object.entries(r).forEach(([t,r])=>{e[t]=r}),Z`
      ${Ha.renderAddPlantDialog(this._addPlantDialog,t,{onClose:()=>this._addPlantDialog=null,onConfirm:()=>this._confirmAddPlant(),onStrainChange:e=>{if(this._addPlantDialog){this._addPlantDialog.strain=e;const r=t.find(t=>t.strain===e);r&&r.phenotype?this._addPlantDialog.phenotype=r.phenotype:this._addPlantDialog.phenotype="",this.requestUpdate()}},onPhenotypeChange:t=>{this._addPlantDialog&&(this._addPlantDialog.phenotype=t)},onVegStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.veg_start=t)},onFlowerStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.flower_start=t)},onRowChange:t=>{if(this._addPlantDialog){const e=parseInt(t);!isNaN(e)&&e>0&&(this._addPlantDialog.row=e-1,this.requestUpdate())}},onColChange:t=>{if(this._addPlantDialog){const e=parseInt(t);!isNaN(e)&&e>0&&(this._addPlantDialog.col=e-1,this.requestUpdate())}}})}

      ${Ha.renderPlantOverviewDialog(this._plantOverviewDialog,e,{onClose:()=>this._plantOverviewDialog=null,onUpdate:()=>{this._updatePlant()},onDelete:t=>{this._handleDeletePlant(t)},onHarvest:t=>{this._harvestPlant(t)},onClone:(t,e)=>{this.clonePlant(t,e)},onTakeClone:(t,e)=>{this.clonePlant(t,e)},onMoveClone:(t,e)=>{this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Clone ${t.attributes.friendly_name} moved to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})},onFinishDrying:t=>{this._finishDryingPlant(t)},_harvestPlant:this._harvestPlant.bind(this),_finishDryingPlant:this._finishDryingPlant.bind(this),onAttributeChange:(t,e)=>{this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes[t]=e)}})}

      ${Ha.renderStrainLibraryDialog(this._strainLibraryDialog,{onClose:()=>this._strainLibraryDialog=null,onAddStrain:()=>this._addStrain(),onRemoveStrain:t=>this._removeStrain(t),onClearAll:()=>this._clearStrains(),onNewStrainChange:t=>{this._strainLibraryDialog&&(this._strainLibraryDialog.newStrain=t)},onNewPhenotypeChange:t=>{this._strainLibraryDialog&&(this._strainLibraryDialog.newPhenotype=t)},onEnterKey:t=>{"Enter"===t.key&&this._addStrain()},onToggleExpand:t=>this._toggleStrainExpansion(t),onSearch:t=>this._setStrainSearchQuery(t),onToggleAddForm:()=>this._toggleAddStrainForm(),onPromptClear:()=>this._promptClearAll(),onCancelClear:()=>this._cancelClearAll()})}
    `}};ja.styles=[Va,o`
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

      /* Growspace Header Styles */
      .growspace-header-card {
        background: rgba(var(--stage-color-rgb, 33, 150, 243), 0.1);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(var(--stage-color-rgb, 33, 150, 243), 0.2);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-md);
        margin-bottom: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
        color: #fff;
        position: relative;
        overflow: hidden;
      }

      .growspace-header-card::before {
         content: '';
         position: absolute;
         top:0; left:0; right:0; height: 4px;
         background: var(--stage-color, #2196f3);
         opacity: 0.8;
      }

      .gs-header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--spacing-sm);
      }

      .gs-title-group {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
      }

      .gs-icon-box {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(var(--stage-color-rgb, 33, 150, 243), 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--stage-color, #fff);
      }

      .gs-title {
        font-size: 1.5rem;
        font-weight: 500;
        margin: 0;
      }

      .gs-subtitle {
        font-size: 0.9rem;
        color: rgba(255,255,255,0.7);
      }

      .gs-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: var(--spacing-sm);
        margin-top: var(--spacing-sm);
      }

      .gs-stat-item {
        background: rgba(255,255,255,0.05);
        border-radius: 8px;
        padding: 8px;
        text-align: center;
        border: 1px solid rgba(255,255,255,0.05);
      }

      .gs-stat-value {
        font-size: 1.1rem;
        font-weight: bold;
        display: block;
      }

      .gs-stat-label {
        font-size: 0.75rem;
        color: rgba(255,255,255,0.6);
        text-transform: uppercase;
      }

      .light-status-bar {
         width: 100%;
         height: 6px;
         background: rgba(255,255,255,0.1);
         border-radius: 3px;
         overflow: hidden;
         margin-top: 4px;
      }

      .light-progress {
         height: 100%;
         background: var(--growspace-card-accent); /* Green or yellow? usually yellow for light */
         transition: width 0.5s ease;
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
    `],t([pt(),e("design:type",Object)],ja.prototype,"_addPlantDialog",void 0),t([pt(),e("design:type",Object)],ja.prototype,"_defaultApplied",void 0),t([pt(),e("design:type",Object)],ja.prototype,"_plantOverviewDialog",void 0),t([pt(),e("design:type",Object)],ja.prototype,"_strainLibraryDialog",void 0),t([pt(),e("design:type",Object)],ja.prototype,"selectedDevice",void 0),t([pt(),e("design:type",Object)],ja.prototype,"_draggedPlant",void 0),t([pt(),e("design:type",Boolean)],ja.prototype,"_isCompactView",void 0),t([ht({attribute:!1}),e("design:type",Object)],ja.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],ja.prototype,"_config",void 0),ja=t([ct("growspace-manager-card")],ja);let Ua=class extends ot{constructor(){super(...arguments),this._growspaceOptions=[]}setConfig(t){this._config=t,this._loadGrowspaces()}updated(t){t.has("hass")&&this.hass&&(this._loadGrowspaces(),this._subscribeToSensorUpdates())}disconnectedCallback(){super.disconnectedCallback(),this._unsubStateChanged&&(this._unsubStateChanged(),this._unsubStateChanged=void 0)}_subscribeToSensorUpdates(){this.hass&&!this._unsubStateChanged&&(this._unsubStateChanged=this.hass.connection.subscribeEvents(t=>{const e=t.data.new_state;"sensor.growspaces_list"===e?.entity_id&&(Array.isArray(e.attributes?.growspaces)?this._growspaceOptions=e.attributes.growspaces:this._growspaceOptions=[])},"state_changed"))}_loadGrowspaces(){if(!this.hass)return;const t=this.hass.states["sensor.growspaces_list"];if(t&&t.attributes?.growspaces){const e=t.attributes.growspaces;this._growspaceOptions=Object.values(e)}else this._growspaceOptions=[]}render(){return this._config?Z`
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
    `:Z``}_valueChanged(t,e){if(!this._config)return;const r={...this._config,[t]:e};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:r},bubbles:!0,composed:!0}))}};Ua.styles=o`
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
  `,t([ht({attribute:!1}),e("design:type",Object)],Ua.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],Ua.prototype,"_config",void 0),t([pt(),e("design:type",Array)],Ua.prototype,"_growspaceOptions",void 0),Ua=t([ct("growspace-manager-card-editor")],Ua);var Za=Object.freeze({__proto__:null,get GrowspaceManagerCardEditor(){return Ua}});export{ja as GrowspaceManagerCard};
