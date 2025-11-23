function t(t,e,r,i){var a,s=arguments.length,n=s<3?e:null===i?i=Object.getOwnPropertyDescriptor(e,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,r,i);else for(var o=t.length-1;o>=0;o--)(a=t[o])&&(n=(s<3?a(n):s>3?a(e,r,n):a(e,r))||n);return s>3&&n&&Object.defineProperty(e,r,n),n}function e(t,e){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(t,e)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const r=globalThis,i=r.ShadowRoot&&(void 0===r.ShadyCSS||r.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,a=Symbol(),s=new WeakMap;class n{constructor(t,e,r){if(this._$cssResult$=!0,r!==a)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const r=void 0!==e&&1===e.length;r&&(t=s.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),r&&s.set(e,t))}return t}toString(){return this.cssText}}const o=(t,...e)=>{const r=1===t.length?t[0]:e.reduce((e,r,i)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+t[i+1],t[0]);return new n(r,t,a)},l=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const r of t.cssRules)e+=r.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,a))(e)})(t):t,{is:c,defineProperty:d,getOwnPropertyDescriptor:u,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:g}=Object,m=globalThis,f=m.trustedTypes,v=f?f.emptyScript:"",y=m.reactiveElementPolyfillSupport,b=(t,e)=>t,w={toAttribute(t,e){switch(e){case Boolean:t=t?v:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let r=t;switch(e){case Boolean:r=null!==t;break;case Number:r=null===t?null:Number(t);break;case Object:case Array:try{r=JSON.parse(t)}catch(t){r=null}}return r}},x=(t,e)=>!c(t,e),_={attribute:!0,type:String,converter:w,reflect:!1,useDefault:!1,hasChanged:x};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;class $ extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=_){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const r=Symbol(),i=this.getPropertyDescriptor(t,r,e);void 0!==i&&d(this.prototype,t,i)}}static getPropertyDescriptor(t,e,r){const{get:i,set:a}=u(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:i,set(e){const s=i?.call(this);a?.call(this,e),this.requestUpdate(t,s,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??_}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const t=g(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const t=this.properties,e=[...h(t),...p(t)];for(const r of e)this.createProperty(r,t[r])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,r]of e)this.elementProperties.set(t,r)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const r=this._$Eu(t,e);void 0!==r&&this._$Eh.set(r,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const r=new Set(t.flat(1/0).reverse());for(const t of r)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const r=e.attribute;return!1===r?void 0:"string"==typeof r?r:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const r of e.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(i)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of e){const e=document.createElement("style"),a=r.litNonce;void 0!==a&&e.setAttribute("nonce",a),e.textContent=i.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,r){this._$AK(t,r)}_$ET(t,e){const r=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,r);if(void 0!==i&&!0===r.reflect){const a=(void 0!==r.converter?.toAttribute?r.converter:w).toAttribute(e,r.type);this._$Em=t,null==a?this.removeAttribute(i):this.setAttribute(i,a),this._$Em=null}}_$AK(t,e){const r=this.constructor,i=r._$Eh.get(t);if(void 0!==i&&this._$Em!==i){const t=r.getPropertyOptions(i),a="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:w;this._$Em=i;const s=a.fromAttribute(e,t.type);this[i]=s??this._$Ej?.get(i)??s,this._$Em=null}}requestUpdate(t,e,r){if(void 0!==t){const i=this.constructor,a=this[t];if(r??=i.getPropertyOptions(t),!((r.hasChanged??x)(a,e)||r.useDefault&&r.reflect&&a===this._$Ej?.get(t)&&!this.hasAttribute(i._$Eu(t,r))))return;this.C(t,e,r)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:r,reflect:i,wrapped:a},s){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,s??e??this[t]),!0!==a||void 0!==s)||(this._$AL.has(t)||(this.hasUpdated||r||(e=void 0),this._$AL.set(t,e)),!0===i&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,r]of t){const{wrapped:t}=r,i=this[e];!0!==t||this._$AL.has(e)||void 0===i||this.C(e,void 0,r,i)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[b("elementProperties")]=new Map,$[b("finalized")]=new Map,y?.({ReactiveElement:$}),(m.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const S=globalThis,C=S.trustedTypes,D=C?C.createPolicy("lit-html",{createHTML:t=>t}):void 0,k="$lit$",T=`lit$${Math.random().toFixed(9).slice(2)}$`,A="?"+T,M=`<${A}>`,E=document,O=()=>E.createComment(""),L=t=>null===t||"object"!=typeof t&&"function"!=typeof t,N=Array.isArray,I="[ \t\n\f\r]",V=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,P=/-->/g,z=/>/g,H=RegExp(`>|${I}(?:([^\\s"'>=/]+)(${I}*=${I}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),F=/'/g,j=/"/g,G=/^(?:script|style|textarea|title)$/i,R=(t=>(e,...r)=>({_$litType$:t,strings:e,values:r}))(1),U=Symbol.for("lit-noChange"),Z=Symbol.for("lit-nothing"),W=new WeakMap,B=E.createTreeWalker(E,129);function q(t,e){if(!N(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==D?D.createHTML(e):e}const Y=(t,e)=>{const r=t.length-1,i=[];let a,s=2===e?"<svg>":3===e?"<math>":"",n=V;for(let e=0;e<r;e++){const r=t[e];let o,l,c=-1,d=0;for(;d<r.length&&(n.lastIndex=d,l=n.exec(r),null!==l);)d=n.lastIndex,n===V?"!--"===l[1]?n=P:void 0!==l[1]?n=z:void 0!==l[2]?(G.test(l[2])&&(a=RegExp("</"+l[2],"g")),n=H):void 0!==l[3]&&(n=H):n===H?">"===l[0]?(n=a??V,c=-1):void 0===l[1]?c=-2:(c=n.lastIndex-l[2].length,o=l[1],n=void 0===l[3]?H:'"'===l[3]?j:F):n===j||n===F?n=H:n===P||n===z?n=V:(n=H,a=void 0);const u=n===H&&t[e+1].startsWith("/>")?" ":"";s+=n===V?r+M:c>=0?(i.push(o),r.slice(0,c)+k+r.slice(c)+T+u):r+T+(-2===c?e:u)}return[q(t,s+(t[r]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),i]};class J{constructor({strings:t,_$litType$:e},r){let i;this.parts=[];let a=0,s=0;const n=t.length-1,o=this.parts,[l,c]=Y(t,e);if(this.el=J.createElement(l,r),B.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(i=B.nextNode())&&o.length<n;){if(1===i.nodeType){if(i.hasAttributes())for(const t of i.getAttributeNames())if(t.endsWith(k)){const e=c[s++],r=i.getAttribute(t).split(T),n=/([.?@])?(.*)/.exec(e);o.push({type:1,index:a,name:n[2],strings:r,ctor:"."===n[1]?et:"?"===n[1]?rt:"@"===n[1]?it:tt}),i.removeAttribute(t)}else t.startsWith(T)&&(o.push({type:6,index:a}),i.removeAttribute(t));if(G.test(i.tagName)){const t=i.textContent.split(T),e=t.length-1;if(e>0){i.textContent=C?C.emptyScript:"";for(let r=0;r<e;r++)i.append(t[r],O()),B.nextNode(),o.push({type:2,index:++a});i.append(t[e],O())}}}else if(8===i.nodeType)if(i.data===A)o.push({type:2,index:a});else{let t=-1;for(;-1!==(t=i.data.indexOf(T,t+1));)o.push({type:7,index:a}),t+=T.length-1}a++}}static createElement(t,e){const r=E.createElement("template");return r.innerHTML=t,r}}function Q(t,e,r=t,i){if(e===U)return e;let a=void 0!==i?r._$Co?.[i]:r._$Cl;const s=L(e)?void 0:e._$litDirective$;return a?.constructor!==s&&(a?._$AO?.(!1),void 0===s?a=void 0:(a=new s(t),a._$AT(t,r,i)),void 0!==i?(r._$Co??=[])[i]=a:r._$Cl=a),void 0!==a&&(e=Q(t,a._$AS(t,e.values),a,i)),e}class K{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:r}=this._$AD,i=(t?.creationScope??E).importNode(e,!0);B.currentNode=i;let a=B.nextNode(),s=0,n=0,o=r[0];for(;void 0!==o;){if(s===o.index){let e;2===o.type?e=new X(a,a.nextSibling,this,t):1===o.type?e=new o.ctor(a,o.name,o.strings,this,t):6===o.type&&(e=new at(a,this,t)),this._$AV.push(e),o=r[++n]}s!==o?.index&&(a=B.nextNode(),s++)}return B.currentNode=E,i}p(t){let e=0;for(const r of this._$AV)void 0!==r&&(void 0!==r.strings?(r._$AI(t,r,e),e+=r.strings.length-2):r._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,r,i){this.type=2,this._$AH=Z,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=r,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),L(t)?t===Z||null==t||""===t?(this._$AH!==Z&&this._$AR(),this._$AH=Z):t!==this._$AH&&t!==U&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>N(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==Z&&L(this._$AH)?this._$AA.nextSibling.data=t:this.T(E.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:r}=t,i="number"==typeof r?this._$AC(t):(void 0===r.el&&(r.el=J.createElement(q(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===i)this._$AH.p(e);else{const t=new K(i,this),r=t.u(this.options);t.p(e),this.T(r),this._$AH=t}}_$AC(t){let e=W.get(t.strings);return void 0===e&&W.set(t.strings,e=new J(t)),e}k(t){N(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let r,i=0;for(const a of t)i===e.length?e.push(r=new X(this.O(O()),this.O(O()),this,this.options)):r=e[i],r._$AI(a),i++;i<e.length&&(this._$AR(r&&r._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,r,i,a){this.type=1,this._$AH=Z,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=a,r.length>2||""!==r[0]||""!==r[1]?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=Z}_$AI(t,e=this,r,i){const a=this.strings;let s=!1;if(void 0===a)t=Q(this,t,e,0),s=!L(t)||t!==this._$AH&&t!==U,s&&(this._$AH=t);else{const i=t;let n,o;for(t=a[0],n=0;n<a.length-1;n++)o=Q(this,i[r+n],e,n),o===U&&(o=this._$AH[n]),s||=!L(o)||o!==this._$AH[n],o===Z?t=Z:t!==Z&&(t+=(o??"")+a[n+1]),this._$AH[n]=o}s&&!i&&this.j(t)}j(t){t===Z?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===Z?void 0:t}}class rt extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==Z)}}class it extends tt{constructor(t,e,r,i,a){super(t,e,r,i,a),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??Z)===U)return;const r=this._$AH,i=t===Z&&r!==Z||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,a=t!==Z&&(r===Z||i);i&&this.element.removeEventListener(this.name,this,r),a&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class at{constructor(t,e,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const st=S.litHtmlPolyfillSupport;st?.(J,X),(S.litHtmlVersions??=[]).push("3.3.1");const nt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,r)=>{const i=r?.renderBefore??e;let a=i._$litPart$;if(void 0===a){const t=r?.renderBefore??null;i._$litPart$=a=new X(e.insertBefore(O(),t),t,void 0,r??{})}return a._$AI(t),a})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return U}}ot._$litElement$=!0,ot.finalized=!0,nt.litElementHydrateSupport?.({LitElement:ot});const lt=nt.litElementPolyfillSupport;lt?.({LitElement:ot}),(nt.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ct=t=>(e,r)=>{void 0!==r?r.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},dt={attribute:!0,type:String,converter:w,reflect:!1,hasChanged:x},ut=(t=dt,e,r)=>{const{kind:i,metadata:a}=r;let s=globalThis.litPropertyMetadata.get(a);if(void 0===s&&globalThis.litPropertyMetadata.set(a,s=new Map),"setter"===i&&((t=Object.create(t)).wrapped=!0),s.set(r.name,t),"accessor"===i){const{name:i}=r;return{set(r){const a=e.get.call(this);e.set.call(this,r),this.requestUpdate(i,a,t)},init(e){return void 0!==e&&this.C(i,void 0,t,e),e}}}if("setter"===i){const{name:i}=r;return function(r){const a=this[i];e.call(this,r),this.requestUpdate(i,a,t)}}throw Error("Unsupported decorator location: "+i)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ht(t){return(e,r)=>"object"==typeof r?ut(t,e,r):((t,e,r)=>{const i=e.hasOwnProperty(r);return e.constructor.createProperty(r,t),i?Object.getOwnPropertyDescriptor(e,r):void 0})(t,e,r)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pt(t){return ht({...t,state:!0,attribute:!1})}var gt="M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z",mt="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",ft="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",vt="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",yt="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",bt="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",wt="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z",xt="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",_t="M4,2H6V4C6,5.44 6.68,6.61 7.88,7.78C8.74,8.61 9.89,9.41 11.09,10.2L9.26,11.39C8.27,10.72 7.31,10 6.5,9.21C5.07,7.82 4,6.1 4,4V2M18,2H20V4C20,6.1 18.93,7.82 17.5,9.21C16.09,10.59 14.29,11.73 12.54,12.84C10.79,13.96 9.09,15.05 7.88,16.22C6.68,17.39 6,18.56 6,20V22H4V20C4,17.9 5.07,16.18 6.5,14.79C7.91,13.41 9.71,12.27 11.46,11.16C13.21,10.04 14.91,8.95 16.12,7.78C17.32,6.61 18,5.44 18,4V2M14.74,12.61C15.73,13.28 16.69,14 17.5,14.79C18.93,16.18 20,17.9 20,20V22H18V20C18,18.56 17.32,17.39 16.12,16.22C15.26,15.39 14.11,14.59 12.91,13.8L14.74,12.61M7,3H17V4L16.94,4.5H7.06L7,4V3M7.68,6H16.32C16.08,6.34 15.8,6.69 15.42,7.06L14.91,7.5H9.07L8.58,7.06C8.2,6.69 7.92,6.34 7.68,6M9.09,16.5H14.93L15.42,16.94C15.8,17.31 16.08,17.66 16.32,18H7.68C7.92,17.66 8.2,17.31 8.58,16.94L9.09,16.5M7.06,19.5H16.94L17,20V21H7V20L7.06,19.5Z",$t="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",St="M22 9A4.32 4.32 0 0 1 19.78 8.45A3.4 3.4 0 0 0 18 8V7A4.32 4.32 0 0 1 20.22 7.55A3.4 3.4 0 0 0 22 8M22 6A3.4 3.4 0 0 1 20.22 5.55A4.32 4.32 0 0 0 18 5V6A3.4 3.4 0 0 1 19.78 6.45A4.32 4.32 0 0 0 22 7M22 10A3.4 3.4 0 0 1 20.22 9.55A4.32 4.32 0 0 0 18 9V10A3.4 3.4 0 0 1 19.78 10.45A4.32 4.32 0 0 0 22 11M10 12.73A70.39 70.39 0 0 0 17 11V4S10.5 2 7.5 2A5.5 5.5 0 0 0 6.12 12.82L7 19H8A3 3 0 0 0 9.46 21.33A3.15 3.15 0 0 1 11 24H12A4.12 4.12 0 0 0 10.09 20.55C9.39 20 9 19.63 9 19H10M7.5 10A2.5 2.5 0 1 1 10 7.5A2.5 2.5 0 0 1 7.5 10Z",Ct="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z",Dt="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",kt="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",Tt="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z",At="M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z",Mt="M8 13C6.14 13 4.59 14.28 4.14 16H2V18H4.14C4.59 19.72 6.14 21 8 21S11.41 19.72 11.86 18H22V16H11.86C11.41 14.28 9.86 13 8 13M8 19C6.9 19 6 18.1 6 17C6 15.9 6.9 15 8 15S10 15.9 10 17C10 18.1 9.1 19 8 19M19.86 6C19.41 4.28 17.86 3 16 3S12.59 4.28 12.14 6H2V8H12.14C12.59 9.72 14.14 11 16 11S19.41 9.72 19.86 8H22V6H19.86M16 9C14.9 9 14 8.1 14 7C14 5.9 14.9 5 16 5S18 5.9 18 7C18 8.1 17.1 9 16 9Z",Et="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z",Ot="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z",Lt="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z";class Nt extends Error{}class It extends Nt{constructor(t){super(`Invalid DateTime: ${t.toMessage()}`)}}class Vt extends Nt{constructor(t){super(`Invalid Interval: ${t.toMessage()}`)}}class Pt extends Nt{constructor(t){super(`Invalid Duration: ${t.toMessage()}`)}}class zt extends Nt{}class Ht extends Nt{constructor(t){super(`Invalid unit ${t}`)}}class Ft extends Nt{}class jt extends Nt{constructor(){super("Zone is an abstract class")}}const Gt="numeric",Rt="short",Ut="long",Zt={year:Gt,month:Gt,day:Gt},Wt={year:Gt,month:Rt,day:Gt},Bt={year:Gt,month:Rt,day:Gt,weekday:Rt},qt={year:Gt,month:Ut,day:Gt},Yt={year:Gt,month:Ut,day:Gt,weekday:Ut},Jt={hour:Gt,minute:Gt},Qt={hour:Gt,minute:Gt,second:Gt},Kt={hour:Gt,minute:Gt,second:Gt,timeZoneName:Rt},Xt={hour:Gt,minute:Gt,second:Gt,timeZoneName:Ut},te={hour:Gt,minute:Gt,hourCycle:"h23"},ee={hour:Gt,minute:Gt,second:Gt,hourCycle:"h23"},re={hour:Gt,minute:Gt,second:Gt,hourCycle:"h23",timeZoneName:Rt},ie={hour:Gt,minute:Gt,second:Gt,hourCycle:"h23",timeZoneName:Ut},ae={year:Gt,month:Gt,day:Gt,hour:Gt,minute:Gt},se={year:Gt,month:Gt,day:Gt,hour:Gt,minute:Gt,second:Gt},ne={year:Gt,month:Rt,day:Gt,hour:Gt,minute:Gt},oe={year:Gt,month:Rt,day:Gt,hour:Gt,minute:Gt,second:Gt},le={year:Gt,month:Rt,day:Gt,weekday:Rt,hour:Gt,minute:Gt},ce={year:Gt,month:Ut,day:Gt,hour:Gt,minute:Gt,timeZoneName:Rt},de={year:Gt,month:Ut,day:Gt,hour:Gt,minute:Gt,second:Gt,timeZoneName:Rt},ue={year:Gt,month:Ut,day:Gt,weekday:Ut,hour:Gt,minute:Gt,timeZoneName:Ut},he={year:Gt,month:Ut,day:Gt,weekday:Ut,hour:Gt,minute:Gt,second:Gt,timeZoneName:Ut};class pe{get type(){throw new jt}get name(){throw new jt}get ianaName(){return this.name}get isUniversal(){throw new jt}offsetName(t,e){throw new jt}formatOffset(t,e){throw new jt}offset(t){throw new jt}equals(t){throw new jt}get isValid(){throw new jt}}let ge=null;class me extends pe{static get instance(){return null===ge&&(ge=new me),ge}get type(){return"system"}get name(){return(new Intl.DateTimeFormat).resolvedOptions().timeZone}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return Ir(t,e,r)}formatOffset(t,e){return Hr(this.offset(t),e)}offset(t){return-new Date(t).getTimezoneOffset()}equals(t){return"system"===t.type}get isValid(){return!0}}const fe=new Map;const ve={year:0,month:1,day:2,era:3,hour:4,minute:5,second:6};const ye=new Map;class be extends pe{static create(t){let e=ye.get(t);return void 0===e&&ye.set(t,e=new be(t)),e}static resetCache(){ye.clear(),fe.clear()}static isValidSpecifier(t){return this.isValidZone(t)}static isValidZone(t){if(!t)return!1;try{return new Intl.DateTimeFormat("en-US",{timeZone:t}).format(),!0}catch(t){return!1}}constructor(t){super(),this.zoneName=t,this.valid=be.isValidZone(t)}get type(){return"iana"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(t,{format:e,locale:r}){return Ir(t,e,r,this.name)}formatOffset(t,e){return Hr(this.offset(t),e)}offset(t){if(!this.valid)return NaN;const e=new Date(t);if(isNaN(e))return NaN;const r=function(t){let e=fe.get(t);return void 0===e&&(e=new Intl.DateTimeFormat("en-US",{hour12:!1,timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",era:"short"}),fe.set(t,e)),e}(this.name);let[i,a,s,n,o,l,c]=r.formatToParts?function(t,e){const r=t.formatToParts(e),i=[];for(let t=0;t<r.length;t++){const{type:e,value:a}=r[t],s=ve[e];"era"===e?i[s]=a:gr(s)||(i[s]=parseInt(a,10))}return i}(r,e):function(t,e){const r=t.format(e).replace(/\u200E/g,""),i=/(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(r),[,a,s,n,o,l,c,d]=i;return[n,a,s,o,l,c,d]}(r,e);"BC"===n&&(i=1-Math.abs(i));let d=+e;const u=d%1e3;return d-=u>=0?u:1e3+u,(Er({year:i,month:a,day:s,hour:24===o?0:o,minute:l,second:c,millisecond:0})-d)/6e4}equals(t){return"iana"===t.type&&t.name===this.name}get isValid(){return this.valid}}let we={};const xe=new Map;function _e(t,e={}){const r=JSON.stringify([t,e]);let i=xe.get(r);return void 0===i&&(i=new Intl.DateTimeFormat(t,e),xe.set(r,i)),i}const $e=new Map;const Se=new Map;let Ce=null;const De=new Map;function ke(t){let e=De.get(t);return void 0===e&&(e=new Intl.DateTimeFormat(t).resolvedOptions(),De.set(t,e)),e}const Te=new Map;function Ae(t,e,r,i){const a=t.listingMode();return"error"===a?null:"en"===a?r(e):i(e)}class Me{constructor(t,e,r){this.padTo=r.padTo||0,this.floor=r.floor||!1;const{padTo:i,floor:a,...s}=r;if(!e||Object.keys(s).length>0){const e={useGrouping:!1,...r};r.padTo>0&&(e.minimumIntegerDigits=r.padTo),this.inf=function(t,e={}){const r=JSON.stringify([t,e]);let i=$e.get(r);return void 0===i&&(i=new Intl.NumberFormat(t,e),$e.set(r,i)),i}(t,e)}}format(t){if(this.inf){const e=this.floor?Math.floor(t):t;return this.inf.format(e)}return $r(this.floor?Math.floor(t):kr(t,3),this.padTo)}}class Ee{constructor(t,e,r){let i;if(this.opts=r,this.originalZone=void 0,this.opts.timeZone)this.dt=t;else if("fixed"===t.zone.type){const e=t.offset/60*-1,r=e>=0?`Etc/GMT+${e}`:`Etc/GMT${e}`;0!==t.offset&&be.create(r).valid?(i=r,this.dt=t):(i="UTC",this.dt=0===t.offset?t:t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone)}else"system"===t.zone.type?this.dt=t:"iana"===t.zone.type?(this.dt=t,i=t.zone.name):(i="UTC",this.dt=t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone);const a={...this.opts};a.timeZone=a.timeZone||i,this.dtf=_e(e,a)}format(){return this.originalZone?this.formatToParts().map(({value:t})=>t).join(""):this.dtf.format(this.dt.toJSDate())}formatToParts(){const t=this.dtf.formatToParts(this.dt.toJSDate());return this.originalZone?t.map(t=>{if("timeZoneName"===t.type){const e=this.originalZone.offsetName(this.dt.ts,{locale:this.dt.locale,format:this.opts.timeZoneName});return{...t,value:e}}return t}):t}resolvedOptions(){return this.dtf.resolvedOptions()}}class Oe{constructor(t,e,r){this.opts={style:"long",...r},!e&&vr()&&(this.rtf=function(t,e={}){const{base:r,...i}=e,a=JSON.stringify([t,i]);let s=Se.get(a);return void 0===s&&(s=new Intl.RelativeTimeFormat(t,e),Se.set(a,s)),s}(t,r))}format(t,e){return this.rtf?this.rtf.format(t,e):function(t,e,r="always",i=!1){const a={years:["year","yr."],quarters:["quarter","qtr."],months:["month","mo."],weeks:["week","wk."],days:["day","day","days"],hours:["hour","hr."],minutes:["minute","min."],seconds:["second","sec."]},s=-1===["hours","minutes","seconds"].indexOf(t);if("auto"===r&&s){const r="days"===t;switch(e){case 1:return r?"tomorrow":`next ${a[t][0]}`;case-1:return r?"yesterday":`last ${a[t][0]}`;case 0:return r?"today":`this ${a[t][0]}`}}const n=Object.is(e,-0)||e<0,o=Math.abs(e),l=1===o,c=a[t],d=i?l?c[1]:c[2]||c[1]:l?a[t][0]:t;return n?`${o} ${d} ago`:`in ${o} ${d}`}(e,t,this.opts.numeric,"long"!==this.opts.style)}formatToParts(t,e){return this.rtf?this.rtf.formatToParts(t,e):[]}}const Le={firstDay:1,minimalDays:4,weekend:[6,7]};class Ne{static fromOpts(t){return Ne.create(t.locale,t.numberingSystem,t.outputCalendar,t.weekSettings,t.defaultToEN)}static create(t,e,r,i,a=!1){const s=t||Ke.defaultLocale,n=s||(a?"en-US":Ce||(Ce=(new Intl.DateTimeFormat).resolvedOptions().locale,Ce)),o=e||Ke.defaultNumberingSystem,l=r||Ke.defaultOutputCalendar,c=xr(i)||Ke.defaultWeekSettings;return new Ne(n,o,l,c,s)}static resetCache(){Ce=null,xe.clear(),$e.clear(),Se.clear(),De.clear(),Te.clear()}static fromObject({locale:t,numberingSystem:e,outputCalendar:r,weekSettings:i}={}){return Ne.create(t,e,r,i)}constructor(t,e,r,i,a){const[s,n,o]=function(t){const e=t.indexOf("-x-");-1!==e&&(t=t.substring(0,e));const r=t.indexOf("-u-");if(-1===r)return[t];{let e,i;try{e=_e(t).resolvedOptions(),i=t}catch(a){const s=t.substring(0,r);e=_e(s).resolvedOptions(),i=s}const{numberingSystem:a,calendar:s}=e;return[i,a,s]}}(t);this.locale=s,this.numberingSystem=e||n||null,this.outputCalendar=r||o||null,this.weekSettings=i,this.intl=function(t,e,r){return r||e?(t.includes("-u-")||(t+="-u"),r&&(t+=`-ca-${r}`),e&&(t+=`-nu-${e}`),t):t}(this.locale,this.numberingSystem,this.outputCalendar),this.weekdaysCache={format:{},standalone:{}},this.monthsCache={format:{},standalone:{}},this.meridiemCache=null,this.eraCache={},this.specifiedLocale=a,this.fastNumbersCached=null}get fastNumbers(){var t;return null==this.fastNumbersCached&&(this.fastNumbersCached=(!(t=this).numberingSystem||"latn"===t.numberingSystem)&&("latn"===t.numberingSystem||!t.locale||t.locale.startsWith("en")||"latn"===ke(t.locale).numberingSystem)),this.fastNumbersCached}listingMode(){const t=this.isEnglish(),e=!(null!==this.numberingSystem&&"latn"!==this.numberingSystem||null!==this.outputCalendar&&"gregory"!==this.outputCalendar);return t&&e?"en":"intl"}clone(t){return t&&0!==Object.getOwnPropertyNames(t).length?Ne.create(t.locale||this.specifiedLocale,t.numberingSystem||this.numberingSystem,t.outputCalendar||this.outputCalendar,xr(t.weekSettings)||this.weekSettings,t.defaultToEN||!1):this}redefaultToEN(t={}){return this.clone({...t,defaultToEN:!0})}redefaultToSystem(t={}){return this.clone({...t,defaultToEN:!1})}months(t,e=!1){return Ae(this,t,Ur,()=>{const r="ja"===this.intl||this.intl.startsWith("ja-"),i=(e&=!r)?{month:t,day:"numeric"}:{month:t},a=e?"format":"standalone";if(!this.monthsCache[a][t]){const e=r?t=>this.dtFormatter(t,i).format():t=>this.extract(t,i,"month");this.monthsCache[a][t]=function(t){const e=[];for(let r=1;r<=12;r++){const i=Ya.utc(2009,r,1);e.push(t(i))}return e}(e)}return this.monthsCache[a][t]})}weekdays(t,e=!1){return Ae(this,t,qr,()=>{const r=e?{weekday:t,year:"numeric",month:"long",day:"numeric"}:{weekday:t},i=e?"format":"standalone";return this.weekdaysCache[i][t]||(this.weekdaysCache[i][t]=function(t){const e=[];for(let r=1;r<=7;r++){const i=Ya.utc(2016,11,13+r);e.push(t(i))}return e}(t=>this.extract(t,r,"weekday"))),this.weekdaysCache[i][t]})}meridiems(){return Ae(this,void 0,()=>Yr,()=>{if(!this.meridiemCache){const t={hour:"numeric",hourCycle:"h12"};this.meridiemCache=[Ya.utc(2016,11,13,9),Ya.utc(2016,11,13,19)].map(e=>this.extract(e,t,"dayperiod"))}return this.meridiemCache})}eras(t){return Ae(this,t,Xr,()=>{const e={era:t};return this.eraCache[t]||(this.eraCache[t]=[Ya.utc(-40,1,1),Ya.utc(2017,1,1)].map(t=>this.extract(t,e,"era"))),this.eraCache[t]})}extract(t,e,r){const i=this.dtFormatter(t,e).formatToParts().find(t=>t.type.toLowerCase()===r);return i?i.value:null}numberFormatter(t={}){return new Me(this.intl,t.forceSimple||this.fastNumbers,t)}dtFormatter(t,e={}){return new Ee(t,this.intl,e)}relFormatter(t={}){return new Oe(this.intl,this.isEnglish(),t)}listFormatter(t={}){return function(t,e={}){const r=JSON.stringify([t,e]);let i=we[r];return i||(i=new Intl.ListFormat(t,e),we[r]=i),i}(this.intl,t)}isEnglish(){return"en"===this.locale||"en-us"===this.locale.toLowerCase()||ke(this.intl).locale.startsWith("en-us")}getWeekSettings(){return this.weekSettings?this.weekSettings:yr()?function(t){let e=Te.get(t);if(!e){const r=new Intl.Locale(t);e="getWeekInfo"in r?r.getWeekInfo():r.weekInfo,"minimalDays"in e||(e={...Le,...e}),Te.set(t,e)}return e}(this.locale):Le}getStartOfWeek(){return this.getWeekSettings().firstDay}getMinDaysInFirstWeek(){return this.getWeekSettings().minimalDays}getWeekendDays(){return this.getWeekSettings().weekend}equals(t){return this.locale===t.locale&&this.numberingSystem===t.numberingSystem&&this.outputCalendar===t.outputCalendar}toString(){return`Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`}}let Ie=null;class Ve extends pe{static get utcInstance(){return null===Ie&&(Ie=new Ve(0)),Ie}static instance(t){return 0===t?Ve.utcInstance:new Ve(t)}static parseSpecifier(t){if(t){const e=t.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);if(e)return new Ve(Vr(e[1],e[2]))}return null}constructor(t){super(),this.fixed=t}get type(){return"fixed"}get name(){return 0===this.fixed?"UTC":`UTC${Hr(this.fixed,"narrow")}`}get ianaName(){return 0===this.fixed?"Etc/UTC":`Etc/GMT${Hr(-this.fixed,"narrow")}`}offsetName(){return this.name}formatOffset(t,e){return Hr(this.fixed,e)}get isUniversal(){return!0}offset(){return this.fixed}equals(t){return"fixed"===t.type&&t.fixed===this.fixed}get isValid(){return!0}}class Pe extends pe{constructor(t){super(),this.zoneName=t}get type(){return"invalid"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(){return null}formatOffset(){return""}offset(){return NaN}equals(){return!1}get isValid(){return!1}}function ze(t,e){if(gr(t)||null===t)return e;if(t instanceof pe)return t;if(function(t){return"string"==typeof t}(t)){const r=t.toLowerCase();return"default"===r?e:"local"===r||"system"===r?me.instance:"utc"===r||"gmt"===r?Ve.utcInstance:Ve.parseSpecifier(r)||be.create(t)}return mr(t)?Ve.instance(t):"object"==typeof t&&"offset"in t&&"function"==typeof t.offset?t:new Pe(t)}const He={arab:"[٠-٩]",arabext:"[۰-۹]",bali:"[᭐-᭙]",beng:"[০-৯]",deva:"[०-९]",fullwide:"[０-９]",gujr:"[૦-૯]",hanidec:"[〇|一|二|三|四|五|六|七|八|九]",khmr:"[០-៩]",knda:"[೦-೯]",laoo:"[໐-໙]",limb:"[᥆-᥏]",mlym:"[൦-൯]",mong:"[᠐-᠙]",mymr:"[၀-၉]",orya:"[୦-୯]",tamldec:"[௦-௯]",telu:"[౦-౯]",thai:"[๐-๙]",tibt:"[༠-༩]",latn:"\\d"},Fe={arab:[1632,1641],arabext:[1776,1785],bali:[6992,7001],beng:[2534,2543],deva:[2406,2415],fullwide:[65296,65303],gujr:[2790,2799],khmr:[6112,6121],knda:[3302,3311],laoo:[3792,3801],limb:[6470,6479],mlym:[3430,3439],mong:[6160,6169],mymr:[4160,4169],orya:[2918,2927],tamldec:[3046,3055],telu:[3174,3183],thai:[3664,3673],tibt:[3872,3881]},je=He.hanidec.replace(/[\[|\]]/g,"").split("");const Ge=new Map;function Re({numberingSystem:t},e=""){const r=t||"latn";let i=Ge.get(r);void 0===i&&(i=new Map,Ge.set(r,i));let a=i.get(e);return void 0===a&&(a=new RegExp(`${He[r]}${e}`),i.set(e,a)),a}let Ue,Ze=()=>Date.now(),We="system",Be=null,qe=null,Ye=null,Je=60,Qe=null;class Ke{static get now(){return Ze}static set now(t){Ze=t}static set defaultZone(t){We=t}static get defaultZone(){return ze(We,me.instance)}static get defaultLocale(){return Be}static set defaultLocale(t){Be=t}static get defaultNumberingSystem(){return qe}static set defaultNumberingSystem(t){qe=t}static get defaultOutputCalendar(){return Ye}static set defaultOutputCalendar(t){Ye=t}static get defaultWeekSettings(){return Qe}static set defaultWeekSettings(t){Qe=xr(t)}static get twoDigitCutoffYear(){return Je}static set twoDigitCutoffYear(t){Je=t%100}static get throwOnInvalid(){return Ue}static set throwOnInvalid(t){Ue=t}static resetCaches(){Ne.resetCache(),be.resetCache(),Ya.resetCache(),Ge.clear()}}class Xe{constructor(t,e){this.reason=t,this.explanation=e}toMessage(){return this.explanation?`${this.reason}: ${this.explanation}`:this.reason}}const tr=[0,31,59,90,120,151,181,212,243,273,304,334],er=[0,31,60,91,121,152,182,213,244,274,305,335];function rr(t,e){return new Xe("unit out of range",`you specified ${e} (of type ${typeof e}) as a ${t}, which is invalid`)}function ir(t,e,r){const i=new Date(Date.UTC(t,e-1,r));t<100&&t>=0&&i.setUTCFullYear(i.getUTCFullYear()-1900);const a=i.getUTCDay();return 0===a?7:a}function ar(t,e,r){return r+(Tr(t)?er:tr)[e-1]}function sr(t,e){const r=Tr(t)?er:tr,i=r.findIndex(t=>t<e);return{month:i+1,day:e-r[i]}}function nr(t,e){return(t-e+7)%7+1}function or(t,e=4,r=1){const{year:i,month:a,day:s}=t,n=ar(i,a,s),o=nr(ir(i,a,s),r);let l,c=Math.floor((n-o+14-e)/7);return c<1?(l=i-1,c=Lr(l,e,r)):c>Lr(i,e,r)?(l=i+1,c=1):l=i,{weekYear:l,weekNumber:c,weekday:o,...Fr(t)}}function lr(t,e=4,r=1){const{weekYear:i,weekNumber:a,weekday:s}=t,n=nr(ir(i,1,e),r),o=Ar(i);let l,c=7*a+s-n-7+e;c<1?(l=i-1,c+=Ar(l)):c>o?(l=i+1,c-=Ar(i)):l=i;const{month:d,day:u}=sr(l,c);return{year:l,month:d,day:u,...Fr(t)}}function cr(t){const{year:e,month:r,day:i}=t;return{year:e,ordinal:ar(e,r,i),...Fr(t)}}function dr(t){const{year:e,ordinal:r}=t,{month:i,day:a}=sr(e,r);return{year:e,month:i,day:a,...Fr(t)}}function ur(t,e){if(!gr(t.localWeekday)||!gr(t.localWeekNumber)||!gr(t.localWeekYear)){if(!gr(t.weekday)||!gr(t.weekNumber)||!gr(t.weekYear))throw new zt("Cannot mix locale-based week fields with ISO-based week fields");return gr(t.localWeekday)||(t.weekday=t.localWeekday),gr(t.localWeekNumber)||(t.weekNumber=t.localWeekNumber),gr(t.localWeekYear)||(t.weekYear=t.localWeekYear),delete t.localWeekday,delete t.localWeekNumber,delete t.localWeekYear,{minDaysInFirstWeek:e.getMinDaysInFirstWeek(),startOfWeek:e.getStartOfWeek()}}return{minDaysInFirstWeek:4,startOfWeek:1}}function hr(t){const e=fr(t.year),r=_r(t.month,1,12),i=_r(t.day,1,Mr(t.year,t.month));return e?r?!i&&rr("day",t.day):rr("month",t.month):rr("year",t.year)}function pr(t){const{hour:e,minute:r,second:i,millisecond:a}=t,s=_r(e,0,23)||24===e&&0===r&&0===i&&0===a,n=_r(r,0,59),o=_r(i,0,59),l=_r(a,0,999);return s?n?o?!l&&rr("millisecond",a):rr("second",i):rr("minute",r):rr("hour",e)}function gr(t){return void 0===t}function mr(t){return"number"==typeof t}function fr(t){return"number"==typeof t&&t%1==0}function vr(){try{return"undefined"!=typeof Intl&&!!Intl.RelativeTimeFormat}catch(t){return!1}}function yr(){try{return"undefined"!=typeof Intl&&!!Intl.Locale&&("weekInfo"in Intl.Locale.prototype||"getWeekInfo"in Intl.Locale.prototype)}catch(t){return!1}}function br(t,e,r){if(0!==t.length)return t.reduce((t,i)=>{const a=[e(i),i];return t&&r(t[0],a[0])===t[0]?t:a},null)[1]}function wr(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function xr(t){if(null==t)return null;if("object"!=typeof t)throw new Ft("Week settings must be an object");if(!_r(t.firstDay,1,7)||!_r(t.minimalDays,1,7)||!Array.isArray(t.weekend)||t.weekend.some(t=>!_r(t,1,7)))throw new Ft("Invalid week settings");return{firstDay:t.firstDay,minimalDays:t.minimalDays,weekend:Array.from(t.weekend)}}function _r(t,e,r){return fr(t)&&t>=e&&t<=r}function $r(t,e=2){let r;return r=t<0?"-"+(""+-t).padStart(e,"0"):(""+t).padStart(e,"0"),r}function Sr(t){return gr(t)||null===t||""===t?void 0:parseInt(t,10)}function Cr(t){return gr(t)||null===t||""===t?void 0:parseFloat(t)}function Dr(t){if(!gr(t)&&null!==t&&""!==t){const e=1e3*parseFloat("0."+t);return Math.floor(e)}}function kr(t,e,r="round"){const i=10**e;switch(r){case"expand":return t>0?Math.ceil(t*i)/i:Math.floor(t*i)/i;case"trunc":return Math.trunc(t*i)/i;case"round":return Math.round(t*i)/i;case"floor":return Math.floor(t*i)/i;case"ceil":return Math.ceil(t*i)/i;default:throw new RangeError(`Value rounding ${r} is out of range`)}}function Tr(t){return t%4==0&&(t%100!=0||t%400==0)}function Ar(t){return Tr(t)?366:365}function Mr(t,e){const r=function(t,e){return t-e*Math.floor(t/e)}(e-1,12)+1;return 2===r?Tr(t+(e-r)/12)?29:28:[31,null,31,30,31,30,31,31,30,31,30,31][r-1]}function Er(t){let e=Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second,t.millisecond);return t.year<100&&t.year>=0&&(e=new Date(e),e.setUTCFullYear(t.year,t.month-1,t.day)),+e}function Or(t,e,r){return-nr(ir(t,1,e),r)+e-1}function Lr(t,e=4,r=1){const i=Or(t,e,r),a=Or(t+1,e,r);return(Ar(t)-i+a)/7}function Nr(t){return t>99?t:t>Ke.twoDigitCutoffYear?1900+t:2e3+t}function Ir(t,e,r,i=null){const a=new Date(t),s={hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"};i&&(s.timeZone=i);const n={timeZoneName:e,...s},o=new Intl.DateTimeFormat(r,n).formatToParts(a).find(t=>"timezonename"===t.type.toLowerCase());return o?o.value:null}function Vr(t,e){let r=parseInt(t,10);Number.isNaN(r)&&(r=0);const i=parseInt(e,10)||0;return 60*r+(r<0||Object.is(r,-0)?-i:i)}function Pr(t){const e=Number(t);if("boolean"==typeof t||""===t||!Number.isFinite(e))throw new Ft(`Invalid unit value ${t}`);return e}function zr(t,e){const r={};for(const i in t)if(wr(t,i)){const a=t[i];if(null==a)continue;r[e(i)]=Pr(a)}return r}function Hr(t,e){const r=Math.trunc(Math.abs(t/60)),i=Math.trunc(Math.abs(t%60)),a=t>=0?"+":"-";switch(e){case"short":return`${a}${$r(r,2)}:${$r(i,2)}`;case"narrow":return`${a}${r}${i>0?`:${i}`:""}`;case"techie":return`${a}${$r(r,2)}${$r(i,2)}`;default:throw new RangeError(`Value format ${e} is out of range for property format`)}}function Fr(t){return function(t,e){return e.reduce((e,r)=>(e[r]=t[r],e),{})}(t,["hour","minute","second","millisecond"])}const jr=["January","February","March","April","May","June","July","August","September","October","November","December"],Gr=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],Rr=["J","F","M","A","M","J","J","A","S","O","N","D"];function Ur(t){switch(t){case"narrow":return[...Rr];case"short":return[...Gr];case"long":return[...jr];case"numeric":return["1","2","3","4","5","6","7","8","9","10","11","12"];case"2-digit":return["01","02","03","04","05","06","07","08","09","10","11","12"];default:return null}}const Zr=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],Wr=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],Br=["M","T","W","T","F","S","S"];function qr(t){switch(t){case"narrow":return[...Br];case"short":return[...Wr];case"long":return[...Zr];case"numeric":return["1","2","3","4","5","6","7"];default:return null}}const Yr=["AM","PM"],Jr=["Before Christ","Anno Domini"],Qr=["BC","AD"],Kr=["B","A"];function Xr(t){switch(t){case"narrow":return[...Kr];case"short":return[...Qr];case"long":return[...Jr];default:return null}}function ti(t,e){let r="";for(const i of t)i.literal?r+=i.val:r+=e(i.val);return r}const ei={D:Zt,DD:Wt,DDD:qt,DDDD:Yt,t:Jt,tt:Qt,ttt:Kt,tttt:Xt,T:te,TT:ee,TTT:re,TTTT:ie,f:ae,ff:ne,fff:ce,ffff:ue,F:se,FF:oe,FFF:de,FFFF:he};class ri{static create(t,e={}){return new ri(t,e)}static parseFormat(t){let e=null,r="",i=!1;const a=[];for(let s=0;s<t.length;s++){const n=t.charAt(s);"'"===n?((r.length>0||i)&&a.push({literal:i||/^\s+$/.test(r),val:""===r?"'":r}),e=null,r="",i=!i):i||n===e?r+=n:(r.length>0&&a.push({literal:/^\s+$/.test(r),val:r}),r=n,e=n)}return r.length>0&&a.push({literal:i||/^\s+$/.test(r),val:r}),a}static macroTokenToFormatOpts(t){return ei[t]}constructor(t,e){this.opts=e,this.loc=t,this.systemLoc=null}formatWithSystemDefault(t,e){null===this.systemLoc&&(this.systemLoc=this.loc.redefaultToSystem());return this.systemLoc.dtFormatter(t,{...this.opts,...e}).format()}dtFormatter(t,e={}){return this.loc.dtFormatter(t,{...this.opts,...e})}formatDateTime(t,e){return this.dtFormatter(t,e).format()}formatDateTimeParts(t,e){return this.dtFormatter(t,e).formatToParts()}formatInterval(t,e){return this.dtFormatter(t.start,e).dtf.formatRange(t.start.toJSDate(),t.end.toJSDate())}resolvedOptions(t,e){return this.dtFormatter(t,e).resolvedOptions()}num(t,e=0,r=void 0){if(this.opts.forceSimple)return $r(t,e);const i={...this.opts};return e>0&&(i.padTo=e),r&&(i.signDisplay=r),this.loc.numberFormatter(i).format(t)}formatDateTimeFromString(t,e){const r="en"===this.loc.listingMode(),i=this.loc.outputCalendar&&"gregory"!==this.loc.outputCalendar,a=(e,r)=>this.loc.extract(t,e,r),s=e=>t.isOffsetFixed&&0===t.offset&&e.allowZ?"Z":t.isValid?t.zone.formatOffset(t.ts,e.format):"",n=()=>r?function(t){return Yr[t.hour<12?0:1]}(t):a({hour:"numeric",hourCycle:"h12"},"dayperiod"),o=(e,i)=>r?function(t,e){return Ur(e)[t.month-1]}(t,e):a(i?{month:e}:{month:e,day:"numeric"},"month"),l=(e,i)=>r?function(t,e){return qr(e)[t.weekday-1]}(t,e):a(i?{weekday:e}:{weekday:e,month:"long",day:"numeric"},"weekday"),c=e=>{const r=ri.macroTokenToFormatOpts(e);return r?this.formatWithSystemDefault(t,r):e},d=e=>r?function(t,e){return Xr(e)[t.year<0?0:1]}(t,e):a({era:e},"era");return ti(ri.parseFormat(e),e=>{switch(e){case"S":return this.num(t.millisecond);case"u":case"SSS":return this.num(t.millisecond,3);case"s":return this.num(t.second);case"ss":return this.num(t.second,2);case"uu":return this.num(Math.floor(t.millisecond/10),2);case"uuu":return this.num(Math.floor(t.millisecond/100));case"m":return this.num(t.minute);case"mm":return this.num(t.minute,2);case"h":return this.num(t.hour%12==0?12:t.hour%12);case"hh":return this.num(t.hour%12==0?12:t.hour%12,2);case"H":return this.num(t.hour);case"HH":return this.num(t.hour,2);case"Z":return s({format:"narrow",allowZ:this.opts.allowZ});case"ZZ":return s({format:"short",allowZ:this.opts.allowZ});case"ZZZ":return s({format:"techie",allowZ:this.opts.allowZ});case"ZZZZ":return t.zone.offsetName(t.ts,{format:"short",locale:this.loc.locale});case"ZZZZZ":return t.zone.offsetName(t.ts,{format:"long",locale:this.loc.locale});case"z":return t.zoneName;case"a":return n();case"d":return i?a({day:"numeric"},"day"):this.num(t.day);case"dd":return i?a({day:"2-digit"},"day"):this.num(t.day,2);case"c":case"E":return this.num(t.weekday);case"ccc":return l("short",!0);case"cccc":return l("long",!0);case"ccccc":return l("narrow",!0);case"EEE":return l("short",!1);case"EEEE":return l("long",!1);case"EEEEE":return l("narrow",!1);case"L":return i?a({month:"numeric",day:"numeric"},"month"):this.num(t.month);case"LL":return i?a({month:"2-digit",day:"numeric"},"month"):this.num(t.month,2);case"LLL":return o("short",!0);case"LLLL":return o("long",!0);case"LLLLL":return o("narrow",!0);case"M":return i?a({month:"numeric"},"month"):this.num(t.month);case"MM":return i?a({month:"2-digit"},"month"):this.num(t.month,2);case"MMM":return o("short",!1);case"MMMM":return o("long",!1);case"MMMMM":return o("narrow",!1);case"y":return i?a({year:"numeric"},"year"):this.num(t.year);case"yy":return i?a({year:"2-digit"},"year"):this.num(t.year.toString().slice(-2),2);case"yyyy":return i?a({year:"numeric"},"year"):this.num(t.year,4);case"yyyyyy":return i?a({year:"numeric"},"year"):this.num(t.year,6);case"G":return d("short");case"GG":return d("long");case"GGGGG":return d("narrow");case"kk":return this.num(t.weekYear.toString().slice(-2),2);case"kkkk":return this.num(t.weekYear,4);case"W":return this.num(t.weekNumber);case"WW":return this.num(t.weekNumber,2);case"n":return this.num(t.localWeekNumber);case"nn":return this.num(t.localWeekNumber,2);case"ii":return this.num(t.localWeekYear.toString().slice(-2),2);case"iiii":return this.num(t.localWeekYear,4);case"o":return this.num(t.ordinal);case"ooo":return this.num(t.ordinal,3);case"q":return this.num(t.quarter);case"qq":return this.num(t.quarter,2);case"X":return this.num(Math.floor(t.ts/1e3));case"x":return this.num(t.ts);default:return c(e)}})}formatDurationFromString(t,e){const r="negativeLargestOnly"===this.opts.signMode?-1:1,i=t=>{switch(t[0]){case"S":return"milliseconds";case"s":return"seconds";case"m":return"minutes";case"h":return"hours";case"d":return"days";case"w":return"weeks";case"M":return"months";case"y":return"years";default:return null}},a=ri.parseFormat(e),s=a.reduce((t,{literal:e,val:r})=>e?t:t.concat(r),[]),n=t.shiftTo(...s.map(i).filter(t=>t));return ti(a,((t,e)=>a=>{const s=i(a);if(s){const i=e.isNegativeDuration&&s!==e.largestUnit?r:1;let n;return n="negativeLargestOnly"===this.opts.signMode&&s!==e.largestUnit?"never":"all"===this.opts.signMode?"always":"auto",this.num(t.get(s)*i,a.length,n)}return a})(n,{isNegativeDuration:n<0,largestUnit:Object.keys(n.values)[0]}))}}const ii=/[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;function ai(...t){const e=t.reduce((t,e)=>t+e.source,"");return RegExp(`^${e}$`)}function si(...t){return e=>t.reduce(([t,r,i],a)=>{const[s,n,o]=a(e,i);return[{...t,...s},n||r,o]},[{},null,1]).slice(0,2)}function ni(t,...e){if(null==t)return[null,null];for(const[r,i]of e){const e=r.exec(t);if(e)return i(e)}return[null,null]}function oi(...t){return(e,r)=>{const i={};let a;for(a=0;a<t.length;a++)i[t[a]]=Sr(e[r+a]);return[i,null,r+a]}}const li=/(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/,ci=/(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/,di=RegExp(`${ci.source}${`(?:${li.source}?(?:\\[(${ii.source})\\])?)?`}`),ui=RegExp(`(?:[Tt]${di.source})?`),hi=oi("weekYear","weekNumber","weekDay"),pi=oi("year","ordinal"),gi=RegExp(`${ci.source} ?(?:${li.source}|(${ii.source}))?`),mi=RegExp(`(?: ${gi.source})?`);function fi(t,e,r){const i=t[e];return gr(i)?r:Sr(i)}function vi(t,e){return[{hours:fi(t,e,0),minutes:fi(t,e+1,0),seconds:fi(t,e+2,0),milliseconds:Dr(t[e+3])},null,e+4]}function yi(t,e){const r=!t[e]&&!t[e+1],i=Vr(t[e+1],t[e+2]);return[{},r?null:Ve.instance(i),e+3]}function bi(t,e){return[{},t[e]?be.create(t[e]):null,e+1]}const wi=RegExp(`^T?${ci.source}$`),xi=/^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;function _i(t){const[e,r,i,a,s,n,o,l,c]=t,d="-"===e[0],u=l&&"-"===l[0],h=(t,e=!1)=>void 0!==t&&(e||t&&d)?-t:t;return[{years:h(Cr(r)),months:h(Cr(i)),weeks:h(Cr(a)),days:h(Cr(s)),hours:h(Cr(n)),minutes:h(Cr(o)),seconds:h(Cr(l),"-0"===l),milliseconds:h(Dr(c),u)}]}const $i={GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function Si(t,e,r,i,a,s,n){const o={year:2===e.length?Nr(Sr(e)):Sr(e),month:Gr.indexOf(r)+1,day:Sr(i),hour:Sr(a),minute:Sr(s)};return n&&(o.second=Sr(n)),t&&(o.weekday=t.length>3?Zr.indexOf(t)+1:Wr.indexOf(t)+1),o}const Ci=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;function Di(t){const[,e,r,i,a,s,n,o,l,c,d,u]=t,h=Si(e,a,i,r,s,n,o);let p;return p=l?$i[l]:c?0:Vr(d,u),[h,new Ve(p)]}const ki=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,Ti=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,Ai=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;function Mi(t){const[,e,r,i,a,s,n,o]=t;return[Si(e,a,i,r,s,n,o),Ve.utcInstance]}function Ei(t){const[,e,r,i,a,s,n,o]=t;return[Si(e,o,r,i,a,s,n),Ve.utcInstance]}const Oi=ai(/([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,ui),Li=ai(/(\d{4})-?W(\d\d)(?:-?(\d))?/,ui),Ni=ai(/(\d{4})-?(\d{3})/,ui),Ii=ai(di),Vi=si(function(t,e){return[{year:fi(t,e),month:fi(t,e+1,1),day:fi(t,e+2,1)},null,e+3]},vi,yi,bi),Pi=si(hi,vi,yi,bi),zi=si(pi,vi,yi,bi),Hi=si(vi,yi,bi);const Fi=si(vi);const ji=ai(/(\d{4})-(\d\d)-(\d\d)/,mi),Gi=ai(gi),Ri=si(vi,yi,bi);const Ui="Invalid Duration",Zi={weeks:{days:7,hours:168,minutes:10080,seconds:604800,milliseconds:6048e5},days:{hours:24,minutes:1440,seconds:86400,milliseconds:864e5},hours:{minutes:60,seconds:3600,milliseconds:36e5},minutes:{seconds:60,milliseconds:6e4},seconds:{milliseconds:1e3}},Wi={years:{quarters:4,months:12,weeks:52,days:365,hours:8760,minutes:525600,seconds:31536e3,milliseconds:31536e6},quarters:{months:3,weeks:13,days:91,hours:2184,minutes:131040,seconds:7862400,milliseconds:78624e5},months:{weeks:4,days:30,hours:720,minutes:43200,seconds:2592e3,milliseconds:2592e6},...Zi},Bi=365.2425,qi=30.436875,Yi={years:{quarters:4,months:12,weeks:52.1775,days:Bi,hours:8765.82,minutes:525949.2,seconds:525949.2*60,milliseconds:525949.2*60*1e3},quarters:{months:3,weeks:13.044375,days:91.310625,hours:2191.455,minutes:131487.3,seconds:525949.2*60/4,milliseconds:7889237999.999999},months:{weeks:4.3481250000000005,days:qi,hours:730.485,minutes:43829.1,seconds:2629746,milliseconds:2629746e3},...Zi},Ji=["years","quarters","months","weeks","days","hours","minutes","seconds","milliseconds"],Qi=Ji.slice(0).reverse();function Ki(t,e,r=!1){const i={values:r?e.values:{...t.values,...e.values||{}},loc:t.loc.clone(e.loc),conversionAccuracy:e.conversionAccuracy||t.conversionAccuracy,matrix:e.matrix||t.matrix};return new ra(i)}function Xi(t,e){let r=e.milliseconds??0;for(const i of Qi.slice(1))e[i]&&(r+=e[i]*t[i].milliseconds);return r}function ta(t,e){const r=Xi(t,e)<0?-1:1;Ji.reduceRight((i,a)=>{if(gr(e[a]))return i;if(i){const s=e[i]*r,n=t[a][i],o=Math.floor(s/n);e[a]+=o*r,e[i]-=o*n*r}return a},null),Ji.reduce((r,i)=>{if(gr(e[i]))return r;if(r){const a=e[r]%1;e[r]-=a,e[i]+=a*t[r][i]}return i},null)}function ea(t){const e={};for(const[r,i]of Object.entries(t))0!==i&&(e[r]=i);return e}class ra{constructor(t){const e="longterm"===t.conversionAccuracy||!1;let r=e?Yi:Wi;t.matrix&&(r=t.matrix),this.values=t.values,this.loc=t.loc||Ne.create(),this.conversionAccuracy=e?"longterm":"casual",this.invalid=t.invalid||null,this.matrix=r,this.isLuxonDuration=!0}static fromMillis(t,e){return ra.fromObject({milliseconds:t},e)}static fromObject(t,e={}){if(null==t||"object"!=typeof t)throw new Ft("Duration.fromObject: argument expected to be an object, got "+(null===t?"null":typeof t));return new ra({values:zr(t,ra.normalizeUnit),loc:Ne.fromObject(e),conversionAccuracy:e.conversionAccuracy,matrix:e.matrix})}static fromDurationLike(t){if(mr(t))return ra.fromMillis(t);if(ra.isDuration(t))return t;if("object"==typeof t)return ra.fromObject(t);throw new Ft(`Unknown duration argument ${t} of type ${typeof t}`)}static fromISO(t,e){const[r]=function(t){return ni(t,[xi,_i])}(t);return r?ra.fromObject(r,e):ra.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static fromISOTime(t,e){const[r]=function(t){return ni(t,[wi,Fi])}(t);return r?ra.fromObject(r,e):ra.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static invalid(t,e=null){if(!t)throw new Ft("need to specify a reason the Duration is invalid");const r=t instanceof Xe?t:new Xe(t,e);if(Ke.throwOnInvalid)throw new Pt(r);return new ra({invalid:r})}static normalizeUnit(t){const e={year:"years",years:"years",quarter:"quarters",quarters:"quarters",month:"months",months:"months",week:"weeks",weeks:"weeks",day:"days",days:"days",hour:"hours",hours:"hours",minute:"minutes",minutes:"minutes",second:"seconds",seconds:"seconds",millisecond:"milliseconds",milliseconds:"milliseconds"}[t?t.toLowerCase():t];if(!e)throw new Ht(t);return e}static isDuration(t){return t&&t.isLuxonDuration||!1}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}toFormat(t,e={}){const r={...e,floor:!1!==e.round&&!1!==e.floor};return this.isValid?ri.create(this.loc,r).formatDurationFromString(this,t):Ui}toHuman(t={}){if(!this.isValid)return Ui;const e=!1!==t.showZeros,r=Ji.map(r=>{const i=this.values[r];return gr(i)||0===i&&!e?null:this.loc.numberFormatter({style:"unit",unitDisplay:"long",...t,unit:r.slice(0,-1)}).format(i)}).filter(t=>t);return this.loc.listFormatter({type:"conjunction",style:t.listStyle||"narrow",...t}).format(r)}toObject(){return this.isValid?{...this.values}:{}}toISO(){if(!this.isValid)return null;let t="P";return 0!==this.years&&(t+=this.years+"Y"),0===this.months&&0===this.quarters||(t+=this.months+3*this.quarters+"M"),0!==this.weeks&&(t+=this.weeks+"W"),0!==this.days&&(t+=this.days+"D"),0===this.hours&&0===this.minutes&&0===this.seconds&&0===this.milliseconds||(t+="T"),0!==this.hours&&(t+=this.hours+"H"),0!==this.minutes&&(t+=this.minutes+"M"),0===this.seconds&&0===this.milliseconds||(t+=kr(this.seconds+this.milliseconds/1e3,3)+"S"),"P"===t&&(t+="T0S"),t}toISOTime(t={}){if(!this.isValid)return null;const e=this.toMillis();if(e<0||e>=864e5)return null;t={suppressMilliseconds:!1,suppressSeconds:!1,includePrefix:!1,format:"extended",...t,includeOffset:!1};return Ya.fromMillis(e,{zone:"UTC"}).toISOTime(t)}toJSON(){return this.toISO()}toString(){return this.toISO()}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Duration { values: ${JSON.stringify(this.values)} }`:`Duration { Invalid, reason: ${this.invalidReason} }`}toMillis(){return this.isValid?Xi(this.matrix,this.values):NaN}valueOf(){return this.toMillis()}plus(t){if(!this.isValid)return this;const e=ra.fromDurationLike(t),r={};for(const t of Ji)(wr(e.values,t)||wr(this.values,t))&&(r[t]=e.get(t)+this.get(t));return Ki(this,{values:r},!0)}minus(t){if(!this.isValid)return this;const e=ra.fromDurationLike(t);return this.plus(e.negate())}mapUnits(t){if(!this.isValid)return this;const e={};for(const r of Object.keys(this.values))e[r]=Pr(t(this.values[r],r));return Ki(this,{values:e},!0)}get(t){return this[ra.normalizeUnit(t)]}set(t){if(!this.isValid)return this;return Ki(this,{values:{...this.values,...zr(t,ra.normalizeUnit)}})}reconfigure({locale:t,numberingSystem:e,conversionAccuracy:r,matrix:i}={}){return Ki(this,{loc:this.loc.clone({locale:t,numberingSystem:e}),matrix:i,conversionAccuracy:r})}as(t){return this.isValid?this.shiftTo(t).get(t):NaN}normalize(){if(!this.isValid)return this;const t=this.toObject();return ta(this.matrix,t),Ki(this,{values:t},!0)}rescale(){if(!this.isValid)return this;return Ki(this,{values:ea(this.normalize().shiftToAll().toObject())},!0)}shiftTo(...t){if(!this.isValid)return this;if(0===t.length)return this;t=t.map(t=>ra.normalizeUnit(t));const e={},r={},i=this.toObject();let a;for(const s of Ji)if(t.indexOf(s)>=0){a=s;let t=0;for(const e in r)t+=this.matrix[e][s]*r[e],r[e]=0;mr(i[s])&&(t+=i[s]);const n=Math.trunc(t);e[s]=n,r[s]=(1e3*t-1e3*n)/1e3}else mr(i[s])&&(r[s]=i[s]);for(const t in r)0!==r[t]&&(e[a]+=t===a?r[t]:r[t]/this.matrix[a][t]);return ta(this.matrix,e),Ki(this,{values:e},!0)}shiftToAll(){return this.isValid?this.shiftTo("years","months","weeks","days","hours","minutes","seconds","milliseconds"):this}negate(){if(!this.isValid)return this;const t={};for(const e of Object.keys(this.values))t[e]=0===this.values[e]?0:-this.values[e];return Ki(this,{values:t},!0)}removeZeros(){if(!this.isValid)return this;return Ki(this,{values:ea(this.values)},!0)}get years(){return this.isValid?this.values.years||0:NaN}get quarters(){return this.isValid?this.values.quarters||0:NaN}get months(){return this.isValid?this.values.months||0:NaN}get weeks(){return this.isValid?this.values.weeks||0:NaN}get days(){return this.isValid?this.values.days||0:NaN}get hours(){return this.isValid?this.values.hours||0:NaN}get minutes(){return this.isValid?this.values.minutes||0:NaN}get seconds(){return this.isValid?this.values.seconds||0:NaN}get milliseconds(){return this.isValid?this.values.milliseconds||0:NaN}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}equals(t){if(!this.isValid||!t.isValid)return!1;if(!this.loc.equals(t.loc))return!1;function e(t,e){return void 0===t||0===t?void 0===e||0===e:t===e}for(const r of Ji)if(!e(this.values[r],t.values[r]))return!1;return!0}}const ia="Invalid Interval";class aa{constructor(t){this.s=t.start,this.e=t.end,this.invalid=t.invalid||null,this.isLuxonInterval=!0}static invalid(t,e=null){if(!t)throw new Ft("need to specify a reason the Interval is invalid");const r=t instanceof Xe?t:new Xe(t,e);if(Ke.throwOnInvalid)throw new Vt(r);return new aa({invalid:r})}static fromDateTimes(t,e){const r=Ja(t),i=Ja(e),a=function(t,e){return t&&t.isValid?e&&e.isValid?e<t?aa.invalid("end before start",`The end of an interval must be after its start, but you had start=${t.toISO()} and end=${e.toISO()}`):null:aa.invalid("missing or invalid end"):aa.invalid("missing or invalid start")}(r,i);return null==a?new aa({start:r,end:i}):a}static after(t,e){const r=ra.fromDurationLike(e),i=Ja(t);return aa.fromDateTimes(i,i.plus(r))}static before(t,e){const r=ra.fromDurationLike(e),i=Ja(t);return aa.fromDateTimes(i.minus(r),i)}static fromISO(t,e){const[r,i]=(t||"").split("/",2);if(r&&i){let t,a,s,n;try{t=Ya.fromISO(r,e),a=t.isValid}catch(i){a=!1}try{s=Ya.fromISO(i,e),n=s.isValid}catch(i){n=!1}if(a&&n)return aa.fromDateTimes(t,s);if(a){const r=ra.fromISO(i,e);if(r.isValid)return aa.after(t,r)}else if(n){const t=ra.fromISO(r,e);if(t.isValid)return aa.before(s,t)}}return aa.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static isInterval(t){return t&&t.isLuxonInterval||!1}get start(){return this.isValid?this.s:null}get end(){return this.isValid?this.e:null}get lastDateTime(){return this.isValid&&this.e?this.e.minus(1):null}get isValid(){return null===this.invalidReason}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}length(t="milliseconds"){return this.isValid?this.toDuration(t).get(t):NaN}count(t="milliseconds",e){if(!this.isValid)return NaN;const r=this.start.startOf(t,e);let i;return i=e?.useLocaleWeeks?this.end.reconfigure({locale:r.locale}):this.end,i=i.startOf(t,e),Math.floor(i.diff(r,t).get(t))+(i.valueOf()!==this.end.valueOf())}hasSame(t){return!!this.isValid&&(this.isEmpty()||this.e.minus(1).hasSame(this.s,t))}isEmpty(){return this.s.valueOf()===this.e.valueOf()}isAfter(t){return!!this.isValid&&this.s>t}isBefore(t){return!!this.isValid&&this.e<=t}contains(t){return!!this.isValid&&(this.s<=t&&this.e>t)}set({start:t,end:e}={}){return this.isValid?aa.fromDateTimes(t||this.s,e||this.e):this}splitAt(...t){if(!this.isValid)return[];const e=t.map(Ja).filter(t=>this.contains(t)).sort((t,e)=>t.toMillis()-e.toMillis()),r=[];let{s:i}=this,a=0;for(;i<this.e;){const t=e[a]||this.e,s=+t>+this.e?this.e:t;r.push(aa.fromDateTimes(i,s)),i=s,a+=1}return r}splitBy(t){const e=ra.fromDurationLike(t);if(!this.isValid||!e.isValid||0===e.as("milliseconds"))return[];let r,{s:i}=this,a=1;const s=[];for(;i<this.e;){const t=this.start.plus(e.mapUnits(t=>t*a));r=+t>+this.e?this.e:t,s.push(aa.fromDateTimes(i,r)),i=r,a+=1}return s}divideEqually(t){return this.isValid?this.splitBy(this.length()/t).slice(0,t):[]}overlaps(t){return this.e>t.s&&this.s<t.e}abutsStart(t){return!!this.isValid&&+this.e===+t.s}abutsEnd(t){return!!this.isValid&&+t.e===+this.s}engulfs(t){return!!this.isValid&&(this.s<=t.s&&this.e>=t.e)}equals(t){return!(!this.isValid||!t.isValid)&&(this.s.equals(t.s)&&this.e.equals(t.e))}intersection(t){if(!this.isValid)return this;const e=this.s>t.s?this.s:t.s,r=this.e<t.e?this.e:t.e;return e>=r?null:aa.fromDateTimes(e,r)}union(t){if(!this.isValid)return this;const e=this.s<t.s?this.s:t.s,r=this.e>t.e?this.e:t.e;return aa.fromDateTimes(e,r)}static merge(t){const[e,r]=t.sort((t,e)=>t.s-e.s).reduce(([t,e],r)=>e?e.overlaps(r)||e.abutsStart(r)?[t,e.union(r)]:[t.concat([e]),r]:[t,r],[[],null]);return r&&e.push(r),e}static xor(t){let e=null,r=0;const i=[],a=t.map(t=>[{time:t.s,type:"s"},{time:t.e,type:"e"}]),s=Array.prototype.concat(...a).sort((t,e)=>t.time-e.time);for(const t of s)r+="s"===t.type?1:-1,1===r?e=t.time:(e&&+e!==+t.time&&i.push(aa.fromDateTimes(e,t.time)),e=null);return aa.merge(i)}difference(...t){return aa.xor([this].concat(t)).map(t=>this.intersection(t)).filter(t=>t&&!t.isEmpty())}toString(){return this.isValid?`[${this.s.toISO()} – ${this.e.toISO()})`:ia}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`:`Interval { Invalid, reason: ${this.invalidReason} }`}toLocaleString(t=Zt,e={}){return this.isValid?ri.create(this.s.loc.clone(e),t).formatInterval(this):ia}toISO(t){return this.isValid?`${this.s.toISO(t)}/${this.e.toISO(t)}`:ia}toISODate(){return this.isValid?`${this.s.toISODate()}/${this.e.toISODate()}`:ia}toISOTime(t){return this.isValid?`${this.s.toISOTime(t)}/${this.e.toISOTime(t)}`:ia}toFormat(t,{separator:e=" – "}={}){return this.isValid?`${this.s.toFormat(t)}${e}${this.e.toFormat(t)}`:ia}toDuration(t,e){return this.isValid?this.e.diff(this.s,t,e):ra.invalid(this.invalidReason)}mapEndpoints(t){return aa.fromDateTimes(t(this.s),t(this.e))}}class sa{static hasDST(t=Ke.defaultZone){const e=Ya.now().setZone(t).set({month:12});return!t.isUniversal&&e.offset!==e.set({month:6}).offset}static isValidIANAZone(t){return be.isValidZone(t)}static normalizeZone(t){return ze(t,Ke.defaultZone)}static getStartOfWeek({locale:t=null,locObj:e=null}={}){return(e||Ne.create(t)).getStartOfWeek()}static getMinimumDaysInFirstWeek({locale:t=null,locObj:e=null}={}){return(e||Ne.create(t)).getMinDaysInFirstWeek()}static getWeekendWeekdays({locale:t=null,locObj:e=null}={}){return(e||Ne.create(t)).getWeekendDays().slice()}static months(t="long",{locale:e=null,numberingSystem:r=null,locObj:i=null,outputCalendar:a="gregory"}={}){return(i||Ne.create(e,r,a)).months(t)}static monthsFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:i=null,outputCalendar:a="gregory"}={}){return(i||Ne.create(e,r,a)).months(t,!0)}static weekdays(t="long",{locale:e=null,numberingSystem:r=null,locObj:i=null}={}){return(i||Ne.create(e,r,null)).weekdays(t)}static weekdaysFormat(t="long",{locale:e=null,numberingSystem:r=null,locObj:i=null}={}){return(i||Ne.create(e,r,null)).weekdays(t,!0)}static meridiems({locale:t=null}={}){return Ne.create(t).meridiems()}static eras(t="short",{locale:e=null}={}){return Ne.create(e,null,"gregory").eras(t)}static features(){return{relative:vr(),localeWeek:yr()}}}function na(t,e){const r=t=>t.toUTC(0,{keepLocalTime:!0}).startOf("day").valueOf(),i=r(e)-r(t);return Math.floor(ra.fromMillis(i).as("days"))}function oa(t,e,r,i){let[a,s,n,o]=function(t,e,r){const i=[["years",(t,e)=>e.year-t.year],["quarters",(t,e)=>e.quarter-t.quarter+4*(e.year-t.year)],["months",(t,e)=>e.month-t.month+12*(e.year-t.year)],["weeks",(t,e)=>{const r=na(t,e);return(r-r%7)/7}],["days",na]],a={},s=t;let n,o;for(const[l,c]of i)r.indexOf(l)>=0&&(n=l,a[l]=c(t,e),o=s.plus(a),o>e?(a[l]--,(t=s.plus(a))>e&&(o=t,a[l]--,t=s.plus(a))):t=o);return[t,a,o,n]}(t,e,r);const l=e-a,c=r.filter(t=>["hours","minutes","seconds","milliseconds"].indexOf(t)>=0);0===c.length&&(n<e&&(n=a.plus({[o]:1})),n!==a&&(s[o]=(s[o]||0)+l/(n-a)));const d=ra.fromObject(s,i);return c.length>0?ra.fromMillis(l,i).shiftTo(...c).plus(d):d}function la(t,e=t=>t){return{regex:t,deser:([t])=>e(function(t){let e=parseInt(t,10);if(isNaN(e)){e="";for(let r=0;r<t.length;r++){const i=t.charCodeAt(r);if(-1!==t[r].search(He.hanidec))e+=je.indexOf(t[r]);else for(const t in Fe){const[r,a]=Fe[t];i>=r&&i<=a&&(e+=i-r)}}return parseInt(e,10)}return e}(t))}}const ca=`[ ${String.fromCharCode(160)}]`,da=new RegExp(ca,"g");function ua(t){return t.replace(/\./g,"\\.?").replace(da,ca)}function ha(t){return t.replace(/\./g,"").replace(da," ").toLowerCase()}function pa(t,e){return null===t?null:{regex:RegExp(t.map(ua).join("|")),deser:([r])=>t.findIndex(t=>ha(r)===ha(t))+e}}function ga(t,e){return{regex:t,deser:([,t,e])=>Vr(t,e),groups:e}}function ma(t){return{regex:t,deser:([t])=>t}}const fa={year:{"2-digit":"yy",numeric:"yyyyy"},month:{numeric:"M","2-digit":"MM",short:"MMM",long:"MMMM"},day:{numeric:"d","2-digit":"dd"},weekday:{short:"EEE",long:"EEEE"},dayperiod:"a",dayPeriod:"a",hour12:{numeric:"h","2-digit":"hh"},hour24:{numeric:"H","2-digit":"HH"},minute:{numeric:"m","2-digit":"mm"},second:{numeric:"s","2-digit":"ss"},timeZoneName:{long:"ZZZZZ",short:"ZZZ"}};let va=null;function ya(t,e){return Array.prototype.concat(...t.map(t=>function(t,e){if(t.literal)return t;const r=xa(ri.macroTokenToFormatOpts(t.val),e);return null==r||r.includes(void 0)?t:r}(t,e)))}class ba{constructor(t,e){if(this.locale=t,this.format=e,this.tokens=ya(ri.parseFormat(e),t),this.units=this.tokens.map(e=>function(t,e){const r=Re(e),i=Re(e,"{2}"),a=Re(e,"{3}"),s=Re(e,"{4}"),n=Re(e,"{6}"),o=Re(e,"{1,2}"),l=Re(e,"{1,3}"),c=Re(e,"{1,6}"),d=Re(e,"{1,9}"),u=Re(e,"{2,4}"),h=Re(e,"{4,6}"),p=t=>{return{regex:RegExp((e=t.val,e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"))),deser:([t])=>t,literal:!0};var e},g=(g=>{if(t.literal)return p(g);switch(g.val){case"G":return pa(e.eras("short"),0);case"GG":return pa(e.eras("long"),0);case"y":return la(c);case"yy":case"kk":return la(u,Nr);case"yyyy":case"kkkk":return la(s);case"yyyyy":return la(h);case"yyyyyy":return la(n);case"M":case"L":case"d":case"H":case"h":case"m":case"q":case"s":case"W":return la(o);case"MM":case"LL":case"dd":case"HH":case"hh":case"mm":case"qq":case"ss":case"WW":return la(i);case"MMM":return pa(e.months("short",!0),1);case"MMMM":return pa(e.months("long",!0),1);case"LLL":return pa(e.months("short",!1),1);case"LLLL":return pa(e.months("long",!1),1);case"o":case"S":return la(l);case"ooo":case"SSS":return la(a);case"u":return ma(d);case"uu":return ma(o);case"uuu":case"E":case"c":return la(r);case"a":return pa(e.meridiems(),0);case"EEE":return pa(e.weekdays("short",!1),1);case"EEEE":return pa(e.weekdays("long",!1),1);case"ccc":return pa(e.weekdays("short",!0),1);case"cccc":return pa(e.weekdays("long",!0),1);case"Z":case"ZZ":return ga(new RegExp(`([+-]${o.source})(?::(${i.source}))?`),2);case"ZZZ":return ga(new RegExp(`([+-]${o.source})(${i.source})?`),2);case"z":return ma(/[a-z_+-/]{1,256}?/i);case" ":return ma(/[^\S\n\r]/);default:return p(g)}})(t)||{invalidReason:"missing Intl.DateTimeFormat.formatToParts support"};return g.token=t,g}(e,t)),this.disqualifyingUnit=this.units.find(t=>t.invalidReason),!this.disqualifyingUnit){const[t,e]=function(t){const e=t.map(t=>t.regex).reduce((t,e)=>`${t}(${e.source})`,"");return[`^${e}$`,t]}(this.units);this.regex=RegExp(t,"i"),this.handlers=e}}explainFromTokens(t){if(this.isValid){const[e,r]=function(t,e,r){const i=t.match(e);if(i){const t={};let e=1;for(const a in r)if(wr(r,a)){const s=r[a],n=s.groups?s.groups+1:1;!s.literal&&s.token&&(t[s.token.val[0]]=s.deser(i.slice(e,e+n))),e+=n}return[i,t]}return[i,{}]}(t,this.regex,this.handlers),[i,a,s]=r?function(t){let e,r=null;gr(t.z)||(r=be.create(t.z)),gr(t.Z)||(r||(r=new Ve(t.Z)),e=t.Z),gr(t.q)||(t.M=3*(t.q-1)+1),gr(t.h)||(t.h<12&&1===t.a?t.h+=12:12===t.h&&0===t.a&&(t.h=0)),0===t.G&&t.y&&(t.y=-t.y),gr(t.u)||(t.S=Dr(t.u));const i=Object.keys(t).reduce((e,r)=>{const i=(t=>{switch(t){case"S":return"millisecond";case"s":return"second";case"m":return"minute";case"h":case"H":return"hour";case"d":return"day";case"o":return"ordinal";case"L":case"M":return"month";case"y":return"year";case"E":case"c":return"weekday";case"W":return"weekNumber";case"k":return"weekYear";case"q":return"quarter";default:return null}})(r);return i&&(e[i]=t[r]),e},{});return[i,r,e]}(r):[null,null,void 0];if(wr(r,"a")&&wr(r,"H"))throw new zt("Can't include meridiem when specifying 24-hour format");return{input:t,tokens:this.tokens,regex:this.regex,rawMatches:e,matches:r,result:i,zone:a,specificOffset:s}}return{input:t,tokens:this.tokens,invalidReason:this.invalidReason}}get isValid(){return!this.disqualifyingUnit}get invalidReason(){return this.disqualifyingUnit?this.disqualifyingUnit.invalidReason:null}}function wa(t,e,r){return new ba(t,r).explainFromTokens(e)}function xa(t,e){if(!t)return null;const r=ri.create(e,t).dtFormatter((va||(va=Ya.fromMillis(1555555555555)),va)),i=r.formatToParts(),a=r.resolvedOptions();return i.map(e=>function(t,e,r){const{type:i,value:a}=t;if("literal"===i){const t=/^\s+$/.test(a);return{literal:!t,val:t?" ":a}}const s=e[i];let n=i;"hour"===i&&(n=null!=e.hour12?e.hour12?"hour12":"hour24":null!=e.hourCycle?"h11"===e.hourCycle||"h12"===e.hourCycle?"hour12":"hour24":r.hour12?"hour12":"hour24");let o=fa[n];if("object"==typeof o&&(o=o[s]),o)return{literal:!1,val:o}}(e,t,a))}const _a="Invalid DateTime",$a=864e13;function Sa(t){return new Xe("unsupported zone",`the zone "${t.name}" is not supported`)}function Ca(t){return null===t.weekData&&(t.weekData=or(t.c)),t.weekData}function Da(t){return null===t.localWeekData&&(t.localWeekData=or(t.c,t.loc.getMinDaysInFirstWeek(),t.loc.getStartOfWeek())),t.localWeekData}function ka(t,e){const r={ts:t.ts,zone:t.zone,c:t.c,o:t.o,loc:t.loc,invalid:t.invalid};return new Ya({...r,...e,old:r})}function Ta(t,e,r){let i=t-60*e*1e3;const a=r.offset(i);if(e===a)return[i,e];i-=60*(a-e)*1e3;const s=r.offset(i);return a===s?[i,a]:[t-60*Math.min(a,s)*1e3,Math.max(a,s)]}function Aa(t,e){const r=new Date(t+=60*e*1e3);return{year:r.getUTCFullYear(),month:r.getUTCMonth()+1,day:r.getUTCDate(),hour:r.getUTCHours(),minute:r.getUTCMinutes(),second:r.getUTCSeconds(),millisecond:r.getUTCMilliseconds()}}function Ma(t,e,r){return Ta(Er(t),e,r)}function Ea(t,e){const r=t.o,i=t.c.year+Math.trunc(e.years),a=t.c.month+Math.trunc(e.months)+3*Math.trunc(e.quarters),s={...t.c,year:i,month:a,day:Math.min(t.c.day,Mr(i,a))+Math.trunc(e.days)+7*Math.trunc(e.weeks)},n=ra.fromObject({years:e.years-Math.trunc(e.years),quarters:e.quarters-Math.trunc(e.quarters),months:e.months-Math.trunc(e.months),weeks:e.weeks-Math.trunc(e.weeks),days:e.days-Math.trunc(e.days),hours:e.hours,minutes:e.minutes,seconds:e.seconds,milliseconds:e.milliseconds}).as("milliseconds"),o=Er(s);let[l,c]=Ta(o,r,t.zone);return 0!==n&&(l+=n,c=t.zone.offset(l)),{ts:l,o:c}}function Oa(t,e,r,i,a,s){const{setZone:n,zone:o}=r;if(t&&0!==Object.keys(t).length||e){const i=e||o,a=Ya.fromObject(t,{...r,zone:i,specificOffset:s});return n?a:a.setZone(o)}return Ya.invalid(new Xe("unparsable",`the input "${a}" can't be parsed as ${i}`))}function La(t,e,r=!0){return t.isValid?ri.create(Ne.create("en-US"),{allowZ:r,forceSimple:!0}).formatDateTimeFromString(t,e):null}function Na(t,e,r){const i=t.c.year>9999||t.c.year<0;let a="";if(i&&t.c.year>=0&&(a+="+"),a+=$r(t.c.year,i?6:4),"year"===r)return a;if(e){if(a+="-",a+=$r(t.c.month),"month"===r)return a;a+="-"}else if(a+=$r(t.c.month),"month"===r)return a;return a+=$r(t.c.day),a}function Ia(t,e,r,i,a,s,n){let o=!r||0!==t.c.millisecond||0!==t.c.second,l="";switch(n){case"day":case"month":case"year":break;default:if(l+=$r(t.c.hour),"hour"===n)break;if(e){if(l+=":",l+=$r(t.c.minute),"minute"===n)break;o&&(l+=":",l+=$r(t.c.second))}else{if(l+=$r(t.c.minute),"minute"===n)break;o&&(l+=$r(t.c.second))}if("second"===n)break;!o||i&&0===t.c.millisecond||(l+=".",l+=$r(t.c.millisecond,3))}return a&&(t.isOffsetFixed&&0===t.offset&&!s?l+="Z":t.o<0?(l+="-",l+=$r(Math.trunc(-t.o/60)),l+=":",l+=$r(Math.trunc(-t.o%60))):(l+="+",l+=$r(Math.trunc(t.o/60)),l+=":",l+=$r(Math.trunc(t.o%60)))),s&&(l+="["+t.zone.ianaName+"]"),l}const Va={month:1,day:1,hour:0,minute:0,second:0,millisecond:0},Pa={weekNumber:1,weekday:1,hour:0,minute:0,second:0,millisecond:0},za={ordinal:1,hour:0,minute:0,second:0,millisecond:0},Ha=["year","month","day","hour","minute","second","millisecond"],Fa=["weekYear","weekNumber","weekday","hour","minute","second","millisecond"],ja=["year","ordinal","hour","minute","second","millisecond"];function Ga(t){const e={year:"year",years:"year",month:"month",months:"month",day:"day",days:"day",hour:"hour",hours:"hour",minute:"minute",minutes:"minute",quarter:"quarter",quarters:"quarter",second:"second",seconds:"second",millisecond:"millisecond",milliseconds:"millisecond",weekday:"weekday",weekdays:"weekday",weeknumber:"weekNumber",weeksnumber:"weekNumber",weeknumbers:"weekNumber",weekyear:"weekYear",weekyears:"weekYear",ordinal:"ordinal"}[t.toLowerCase()];if(!e)throw new Ht(t);return e}function Ra(t){switch(t.toLowerCase()){case"localweekday":case"localweekdays":return"localWeekday";case"localweeknumber":case"localweeknumbers":return"localWeekNumber";case"localweekyear":case"localweekyears":return"localWeekYear";default:return Ga(t)}}function Ua(t,e){const r=ze(e.zone,Ke.defaultZone);if(!r.isValid)return Ya.invalid(Sa(r));const i=Ne.fromObject(e);let a,s;if(gr(t.year))a=Ke.now();else{for(const e of Ha)gr(t[e])&&(t[e]=Va[e]);const e=hr(t)||pr(t);if(e)return Ya.invalid(e);const i=function(t){if(void 0===Ba&&(Ba=Ke.now()),"iana"!==t.type)return t.offset(Ba);const e=t.name;let r=qa.get(e);return void 0===r&&(r=t.offset(Ba),qa.set(e,r)),r}(r);[a,s]=Ma(t,i,r)}return new Ya({ts:a,zone:r,loc:i,o:s})}function Za(t,e,r){const i=!!gr(r.round)||r.round,a=gr(r.rounding)?"trunc":r.rounding,s=(t,s)=>{t=kr(t,i||r.calendary?0:2,r.calendary?"round":a);return e.loc.clone(r).relFormatter(r).format(t,s)},n=i=>r.calendary?e.hasSame(t,i)?0:e.startOf(i).diff(t.startOf(i),i).get(i):e.diff(t,i).get(i);if(r.unit)return s(n(r.unit),r.unit);for(const t of r.units){const e=n(t);if(Math.abs(e)>=1)return s(e,t)}return s(t>e?-0:0,r.units[r.units.length-1])}function Wa(t){let e,r={};return t.length>0&&"object"==typeof t[t.length-1]?(r=t[t.length-1],e=Array.from(t).slice(0,t.length-1)):e=Array.from(t),[r,e]}let Ba;const qa=new Map;class Ya{constructor(t){const e=t.zone||Ke.defaultZone;let r=t.invalid||(Number.isNaN(t.ts)?new Xe("invalid input"):null)||(e.isValid?null:Sa(e));this.ts=gr(t.ts)?Ke.now():t.ts;let i=null,a=null;if(!r){if(t.old&&t.old.ts===this.ts&&t.old.zone.equals(e))[i,a]=[t.old.c,t.old.o];else{const s=mr(t.o)&&!t.old?t.o:e.offset(this.ts);i=Aa(this.ts,s),r=Number.isNaN(i.year)?new Xe("invalid input"):null,i=r?null:i,a=r?null:s}}this._zone=e,this.loc=t.loc||Ne.create(),this.invalid=r,this.weekData=null,this.localWeekData=null,this.c=i,this.o=a,this.isLuxonDateTime=!0}static now(){return new Ya({})}static local(){const[t,e]=Wa(arguments),[r,i,a,s,n,o,l]=e;return Ua({year:r,month:i,day:a,hour:s,minute:n,second:o,millisecond:l},t)}static utc(){const[t,e]=Wa(arguments),[r,i,a,s,n,o,l]=e;return t.zone=Ve.utcInstance,Ua({year:r,month:i,day:a,hour:s,minute:n,second:o,millisecond:l},t)}static fromJSDate(t,e={}){const r=function(t){return"[object Date]"===Object.prototype.toString.call(t)}(t)?t.valueOf():NaN;if(Number.isNaN(r))return Ya.invalid("invalid input");const i=ze(e.zone,Ke.defaultZone);return i.isValid?new Ya({ts:r,zone:i,loc:Ne.fromObject(e)}):Ya.invalid(Sa(i))}static fromMillis(t,e={}){if(mr(t))return t<-$a||t>$a?Ya.invalid("Timestamp out of range"):new Ya({ts:t,zone:ze(e.zone,Ke.defaultZone),loc:Ne.fromObject(e)});throw new Ft(`fromMillis requires a numerical input, but received a ${typeof t} with value ${t}`)}static fromSeconds(t,e={}){if(mr(t))return new Ya({ts:1e3*t,zone:ze(e.zone,Ke.defaultZone),loc:Ne.fromObject(e)});throw new Ft("fromSeconds requires a numerical input")}static fromObject(t,e={}){t=t||{};const r=ze(e.zone,Ke.defaultZone);if(!r.isValid)return Ya.invalid(Sa(r));const i=Ne.fromObject(e),a=zr(t,Ra),{minDaysInFirstWeek:s,startOfWeek:n}=ur(a,i),o=Ke.now(),l=gr(e.specificOffset)?r.offset(o):e.specificOffset,c=!gr(a.ordinal),d=!gr(a.year),u=!gr(a.month)||!gr(a.day),h=d||u,p=a.weekYear||a.weekNumber;if((h||c)&&p)throw new zt("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(u&&c)throw new zt("Can't mix ordinal dates with month/day");const g=p||a.weekday&&!h;let m,f,v=Aa(o,l);g?(m=Fa,f=Pa,v=or(v,s,n)):c?(m=ja,f=za,v=cr(v)):(m=Ha,f=Va);let y=!1;for(const t of m){gr(a[t])?a[t]=y?f[t]:v[t]:y=!0}const b=g?function(t,e=4,r=1){const i=fr(t.weekYear),a=_r(t.weekNumber,1,Lr(t.weekYear,e,r)),s=_r(t.weekday,1,7);return i?a?!s&&rr("weekday",t.weekday):rr("week",t.weekNumber):rr("weekYear",t.weekYear)}(a,s,n):c?function(t){const e=fr(t.year),r=_r(t.ordinal,1,Ar(t.year));return e?!r&&rr("ordinal",t.ordinal):rr("year",t.year)}(a):hr(a),w=b||pr(a);if(w)return Ya.invalid(w);const x=g?lr(a,s,n):c?dr(a):a,[_,$]=Ma(x,l,r),S=new Ya({ts:_,zone:r,o:$,loc:i});return a.weekday&&h&&t.weekday!==S.weekday?Ya.invalid("mismatched weekday",`you can't specify both a weekday of ${a.weekday} and a date of ${S.toISO()}`):S.isValid?S:Ya.invalid(S.invalid)}static fromISO(t,e={}){const[r,i]=function(t){return ni(t,[Oi,Vi],[Li,Pi],[Ni,zi],[Ii,Hi])}(t);return Oa(r,i,e,"ISO 8601",t)}static fromRFC2822(t,e={}){const[r,i]=function(t){return ni(function(t){return t.replace(/\([^()]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").trim()}(t),[Ci,Di])}(t);return Oa(r,i,e,"RFC 2822",t)}static fromHTTP(t,e={}){const[r,i]=function(t){return ni(t,[ki,Mi],[Ti,Mi],[Ai,Ei])}(t);return Oa(r,i,e,"HTTP",e)}static fromFormat(t,e,r={}){if(gr(t)||gr(e))throw new Ft("fromFormat requires an input string and a format");const{locale:i=null,numberingSystem:a=null}=r,s=Ne.fromOpts({locale:i,numberingSystem:a,defaultToEN:!0}),[n,o,l,c]=function(t,e,r){const{result:i,zone:a,specificOffset:s,invalidReason:n}=wa(t,e,r);return[i,a,s,n]}(s,t,e);return c?Ya.invalid(c):Oa(n,o,r,`format ${e}`,t,l)}static fromString(t,e,r={}){return Ya.fromFormat(t,e,r)}static fromSQL(t,e={}){const[r,i]=function(t){return ni(t,[ji,Vi],[Gi,Ri])}(t);return Oa(r,i,e,"SQL",t)}static invalid(t,e=null){if(!t)throw new Ft("need to specify a reason the DateTime is invalid");const r=t instanceof Xe?t:new Xe(t,e);if(Ke.throwOnInvalid)throw new It(r);return new Ya({invalid:r})}static isDateTime(t){return t&&t.isLuxonDateTime||!1}static parseFormatForOpts(t,e={}){const r=xa(t,Ne.fromObject(e));return r?r.map(t=>t?t.val:null).join(""):null}static expandFormat(t,e={}){return ya(ri.parseFormat(t),Ne.fromObject(e)).map(t=>t.val).join("")}static resetCache(){Ba=void 0,qa.clear()}get(t){return this[t]}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}get outputCalendar(){return this.isValid?this.loc.outputCalendar:null}get zone(){return this._zone}get zoneName(){return this.isValid?this.zone.name:null}get year(){return this.isValid?this.c.year:NaN}get quarter(){return this.isValid?Math.ceil(this.c.month/3):NaN}get month(){return this.isValid?this.c.month:NaN}get day(){return this.isValid?this.c.day:NaN}get hour(){return this.isValid?this.c.hour:NaN}get minute(){return this.isValid?this.c.minute:NaN}get second(){return this.isValid?this.c.second:NaN}get millisecond(){return this.isValid?this.c.millisecond:NaN}get weekYear(){return this.isValid?Ca(this).weekYear:NaN}get weekNumber(){return this.isValid?Ca(this).weekNumber:NaN}get weekday(){return this.isValid?Ca(this).weekday:NaN}get isWeekend(){return this.isValid&&this.loc.getWeekendDays().includes(this.weekday)}get localWeekday(){return this.isValid?Da(this).weekday:NaN}get localWeekNumber(){return this.isValid?Da(this).weekNumber:NaN}get localWeekYear(){return this.isValid?Da(this).weekYear:NaN}get ordinal(){return this.isValid?cr(this.c).ordinal:NaN}get monthShort(){return this.isValid?sa.months("short",{locObj:this.loc})[this.month-1]:null}get monthLong(){return this.isValid?sa.months("long",{locObj:this.loc})[this.month-1]:null}get weekdayShort(){return this.isValid?sa.weekdays("short",{locObj:this.loc})[this.weekday-1]:null}get weekdayLong(){return this.isValid?sa.weekdays("long",{locObj:this.loc})[this.weekday-1]:null}get offset(){return this.isValid?+this.o:NaN}get offsetNameShort(){return this.isValid?this.zone.offsetName(this.ts,{format:"short",locale:this.locale}):null}get offsetNameLong(){return this.isValid?this.zone.offsetName(this.ts,{format:"long",locale:this.locale}):null}get isOffsetFixed(){return this.isValid?this.zone.isUniversal:null}get isInDST(){return!this.isOffsetFixed&&(this.offset>this.set({month:1,day:1}).offset||this.offset>this.set({month:5}).offset)}getPossibleOffsets(){if(!this.isValid||this.isOffsetFixed)return[this];const t=864e5,e=6e4,r=Er(this.c),i=this.zone.offset(r-t),a=this.zone.offset(r+t),s=this.zone.offset(r-i*e),n=this.zone.offset(r-a*e);if(s===n)return[this];const o=r-s*e,l=r-n*e,c=Aa(o,s),d=Aa(l,n);return c.hour===d.hour&&c.minute===d.minute&&c.second===d.second&&c.millisecond===d.millisecond?[ka(this,{ts:o}),ka(this,{ts:l})]:[this]}get isInLeapYear(){return Tr(this.year)}get daysInMonth(){return Mr(this.year,this.month)}get daysInYear(){return this.isValid?Ar(this.year):NaN}get weeksInWeekYear(){return this.isValid?Lr(this.weekYear):NaN}get weeksInLocalWeekYear(){return this.isValid?Lr(this.localWeekYear,this.loc.getMinDaysInFirstWeek(),this.loc.getStartOfWeek()):NaN}resolvedLocaleOptions(t={}){const{locale:e,numberingSystem:r,calendar:i}=ri.create(this.loc.clone(t),t).resolvedOptions(this);return{locale:e,numberingSystem:r,outputCalendar:i}}toUTC(t=0,e={}){return this.setZone(Ve.instance(t),e)}toLocal(){return this.setZone(Ke.defaultZone)}setZone(t,{keepLocalTime:e=!1,keepCalendarTime:r=!1}={}){if((t=ze(t,Ke.defaultZone)).equals(this.zone))return this;if(t.isValid){let i=this.ts;if(e||r){const e=t.offset(this.ts),r=this.toObject();[i]=Ma(r,e,t)}return ka(this,{ts:i,zone:t})}return Ya.invalid(Sa(t))}reconfigure({locale:t,numberingSystem:e,outputCalendar:r}={}){return ka(this,{loc:this.loc.clone({locale:t,numberingSystem:e,outputCalendar:r})})}setLocale(t){return this.reconfigure({locale:t})}set(t){if(!this.isValid)return this;const e=zr(t,Ra),{minDaysInFirstWeek:r,startOfWeek:i}=ur(e,this.loc),a=!gr(e.weekYear)||!gr(e.weekNumber)||!gr(e.weekday),s=!gr(e.ordinal),n=!gr(e.year),o=!gr(e.month)||!gr(e.day),l=n||o,c=e.weekYear||e.weekNumber;if((l||s)&&c)throw new zt("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(o&&s)throw new zt("Can't mix ordinal dates with month/day");let d;a?d=lr({...or(this.c,r,i),...e},r,i):gr(e.ordinal)?(d={...this.toObject(),...e},gr(e.day)&&(d.day=Math.min(Mr(d.year,d.month),d.day))):d=dr({...cr(this.c),...e});const[u,h]=Ma(d,this.o,this.zone);return ka(this,{ts:u,o:h})}plus(t){if(!this.isValid)return this;return ka(this,Ea(this,ra.fromDurationLike(t)))}minus(t){if(!this.isValid)return this;return ka(this,Ea(this,ra.fromDurationLike(t).negate()))}startOf(t,{useLocaleWeeks:e=!1}={}){if(!this.isValid)return this;const r={},i=ra.normalizeUnit(t);switch(i){case"years":r.month=1;case"quarters":case"months":r.day=1;case"weeks":case"days":r.hour=0;case"hours":r.minute=0;case"minutes":r.second=0;case"seconds":r.millisecond=0}if("weeks"===i)if(e){const t=this.loc.getStartOfWeek(),{weekday:e}=this;e<t&&(r.weekNumber=this.weekNumber-1),r.weekday=t}else r.weekday=1;if("quarters"===i){const t=Math.ceil(this.month/3);r.month=3*(t-1)+1}return this.set(r)}endOf(t,e){return this.isValid?this.plus({[t]:1}).startOf(t,e).minus(1):this}toFormat(t,e={}){return this.isValid?ri.create(this.loc.redefaultToEN(e)).formatDateTimeFromString(this,t):_a}toLocaleString(t=Zt,e={}){return this.isValid?ri.create(this.loc.clone(e),t).formatDateTime(this):_a}toLocaleParts(t={}){return this.isValid?ri.create(this.loc.clone(t),t).formatDateTimeParts(this):[]}toISO({format:t="extended",suppressSeconds:e=!1,suppressMilliseconds:r=!1,includeOffset:i=!0,extendedZone:a=!1,precision:s="milliseconds"}={}){if(!this.isValid)return null;const n="extended"===t;let o=Na(this,n,s=Ga(s));return Ha.indexOf(s)>=3&&(o+="T"),o+=Ia(this,n,e,r,i,a,s),o}toISODate({format:t="extended",precision:e="day"}={}){return this.isValid?Na(this,"extended"===t,Ga(e)):null}toISOWeekDate(){return La(this,"kkkk-'W'WW-c")}toISOTime({suppressMilliseconds:t=!1,suppressSeconds:e=!1,includeOffset:r=!0,includePrefix:i=!1,extendedZone:a=!1,format:s="extended",precision:n="milliseconds"}={}){if(!this.isValid)return null;return n=Ga(n),(i&&Ha.indexOf(n)>=3?"T":"")+Ia(this,"extended"===s,e,t,r,a,n)}toRFC2822(){return La(this,"EEE, dd LLL yyyy HH:mm:ss ZZZ",!1)}toHTTP(){return La(this.toUTC(),"EEE, dd LLL yyyy HH:mm:ss 'GMT'")}toSQLDate(){return this.isValid?Na(this,!0):null}toSQLTime({includeOffset:t=!0,includeZone:e=!1,includeOffsetSpace:r=!0}={}){let i="HH:mm:ss.SSS";return(e||t)&&(r&&(i+=" "),e?i+="z":t&&(i+="ZZ")),La(this,i,!0)}toSQL(t={}){return this.isValid?`${this.toSQLDate()} ${this.toSQLTime(t)}`:null}toString(){return this.isValid?this.toISO():_a}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`:`DateTime { Invalid, reason: ${this.invalidReason} }`}valueOf(){return this.toMillis()}toMillis(){return this.isValid?this.ts:NaN}toSeconds(){return this.isValid?this.ts/1e3:NaN}toUnixInteger(){return this.isValid?Math.floor(this.ts/1e3):NaN}toJSON(){return this.toISO()}toBSON(){return this.toJSDate()}toObject(t={}){if(!this.isValid)return{};const e={...this.c};return t.includeConfig&&(e.outputCalendar=this.outputCalendar,e.numberingSystem=this.loc.numberingSystem,e.locale=this.loc.locale),e}toJSDate(){return new Date(this.isValid?this.ts:NaN)}diff(t,e="milliseconds",r={}){if(!this.isValid||!t.isValid)return ra.invalid("created by diffing an invalid DateTime");const i={locale:this.locale,numberingSystem:this.numberingSystem,...r},a=(o=e,Array.isArray(o)?o:[o]).map(ra.normalizeUnit),s=t.valueOf()>this.valueOf(),n=oa(s?this:t,s?t:this,a,i);var o;return s?n.negate():n}diffNow(t="milliseconds",e={}){return this.diff(Ya.now(),t,e)}until(t){return this.isValid?aa.fromDateTimes(this,t):this}hasSame(t,e,r){if(!this.isValid)return!1;const i=t.valueOf(),a=this.setZone(t.zone,{keepLocalTime:!0});return a.startOf(e,r)<=i&&i<=a.endOf(e,r)}equals(t){return this.isValid&&t.isValid&&this.valueOf()===t.valueOf()&&this.zone.equals(t.zone)&&this.loc.equals(t.loc)}toRelative(t={}){if(!this.isValid)return null;const e=t.base||Ya.fromObject({},{zone:this.zone}),r=t.padding?this<e?-t.padding:t.padding:0;let i=["years","months","days","hours","minutes","seconds"],a=t.unit;return Array.isArray(t.unit)&&(i=t.unit,a=void 0),Za(e,this.plus(r),{...t,numeric:"always",units:i,unit:a})}toRelativeCalendar(t={}){return this.isValid?Za(t.base||Ya.fromObject({},{zone:this.zone}),this,{...t,numeric:"auto",units:["years","months","days"],calendary:!0}):null}static min(...t){if(!t.every(Ya.isDateTime))throw new Ft("min requires all arguments be DateTimes");return br(t,t=>t.valueOf(),Math.min)}static max(...t){if(!t.every(Ya.isDateTime))throw new Ft("max requires all arguments be DateTimes");return br(t,t=>t.valueOf(),Math.max)}static fromFormatExplain(t,e,r={}){const{locale:i=null,numberingSystem:a=null}=r;return wa(Ne.fromOpts({locale:i,numberingSystem:a,defaultToEN:!0}),t,e)}static fromStringExplain(t,e,r={}){return Ya.fromFormatExplain(t,e,r)}static buildFormatParser(t,e={}){const{locale:r=null,numberingSystem:i=null}=e,a=Ne.fromOpts({locale:r,numberingSystem:i,defaultToEN:!0});return new ba(a,t)}static fromFormatParser(t,e,r={}){if(gr(t)||gr(e))throw new Ft("fromFormatParser requires an input string and a format parser");const{locale:i=null,numberingSystem:a=null}=r,s=Ne.fromOpts({locale:i,numberingSystem:a,defaultToEN:!0});if(!s.equals(e.locale))throw new Ft(`fromFormatParser called with a locale of ${s}, but the format parser was created for ${e.locale}`);const{result:n,zone:o,specificOffset:l,invalidReason:c}=e.explainFromTokens(t);return c?Ya.invalid(c):Oa(n,o,r,`format ${e.format}`,t,l)}static get DATE_SHORT(){return Zt}static get DATE_MED(){return Wt}static get DATE_MED_WITH_WEEKDAY(){return Bt}static get DATE_FULL(){return qt}static get DATE_HUGE(){return Yt}static get TIME_SIMPLE(){return Jt}static get TIME_WITH_SECONDS(){return Qt}static get TIME_WITH_SHORT_OFFSET(){return Kt}static get TIME_WITH_LONG_OFFSET(){return Xt}static get TIME_24_SIMPLE(){return te}static get TIME_24_WITH_SECONDS(){return ee}static get TIME_24_WITH_SHORT_OFFSET(){return re}static get TIME_24_WITH_LONG_OFFSET(){return ie}static get DATETIME_SHORT(){return ae}static get DATETIME_SHORT_WITH_SECONDS(){return se}static get DATETIME_MED(){return ne}static get DATETIME_MED_WITH_SECONDS(){return oe}static get DATETIME_MED_WITH_WEEKDAY(){return le}static get DATETIME_FULL(){return ce}static get DATETIME_FULL_WITH_SECONDS(){return de}static get DATETIME_HUGE(){return ue}static get DATETIME_HUGE_WITH_SECONDS(){return he}}function Ja(t){if(Ya.isDateTime(t))return t;if(t&&t.valueOf&&mr(t.valueOf()))return Ya.fromJSDate(t);if(t&&"object"==typeof t)return Ya.fromObject(t);throw new Ft(`Unknown datetime argument: ${t}, of type ${typeof t}`)}const Qa=o`
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
`;class Ka{static normalizeStage(t){const e=t.toLowerCase();return"veg"===e?"vegetative":"mom"===e?"mother":e}static getPlantStageColor(t){const e=this.normalizeStage(t);return this.stageColors[e]??"#757575"}static getPlantStageIcon(t){const e=this.normalizeStage(t);return this.stageIcons[e]??Tt}static getPlantStage(t){const e=t?.attributes??{},r=new Date;return e.cure_start?"cure":e.dry_start?"dry":e.mom_start?"mother":e.clone_start?"clone":e.flower_start&&new Date(e.flower_start)<=r?"flower":e.veg_start&&new Date(e.veg_start)<=r?"vegetative":"seedling"}static createGridLayout(t,e,r){const i=Array.from({length:e},()=>Array.from({length:r},()=>null));return t.forEach(t=>{const a=(t.attributes?.row??1)-1,s=(t.attributes?.col??1)-1;a>=0&&a<e&&s>=0&&s<r&&(i[a][s]=t)}),{rows:e,cols:r,grid:i}}static calculateEffectiveRows(t){const{name:e,plants:r,plants_per_row:i}=t;if("dry"===e||"cure"===e||"mother"===e||"clone"===e){if(0===r.length)return 1;const t=Math.max(...r.map(t=>t.attributes?.row||1)),e=r.filter(e=>(e.attributes?.row||1)===t).length;return e>=i?t+1:t}return i}static parseDateTimeLocal(t){if(t)try{const e=16===t.length?t+":00":t,r=new Date(e);if(isNaN(r.getTime()))return;const i=r.getFullYear(),a=String(r.getMonth()+1).padStart(2,"0"),s=String(r.getDate()).padStart(2,"0"),n=String(r.getHours()).padStart(2,"0"),o=String(r.getMinutes()).padStart(2,"0");return`${i}-${a}-${s}T${n}:${o}:${String(r.getSeconds()).padStart(2,"0")}`}catch{return}}static formatDateForBackend(t){if(t)try{const e=t.split("T");if(e.length>0&&e[0].match(/^\d{4}-\d{2}-\d{2}$/))return e[0];const r=new Date(t);if(isNaN(r.getTime()))return;const i=r.getFullYear(),a=String(r.getMonth()+1).padStart(2,"0");return`${i}-${a}-${String(r.getDate()).padStart(2,"0")}`}catch{return}}static getCurrentDateTime(){const t=new Date,e=t=>t.toString().padStart(2,"0");return`${t.getFullYear()}-${e(t.getMonth()+1)}-${e(t.getDate())}T${e(t.getHours())}:${e(t.getMinutes())}:00`}static toDateTimeLocal(t){if(!t)return"";try{const e=new Date(t);if(isNaN(e.getTime()))return"";const r=t=>t.toString().padStart(2,"0"),i=e.getFullYear(),a=r(e.getMonth()+1),s=r(e.getDate()),n=r(e.getHours());return`${i}-${a}-${s}T${n}:${r(e.getMinutes())}`}catch{return""}}static getDominantStage(t){if(!t||0===t.length)return null;const e=["cure","dry","flower","vegetative","clone","mother","seedling"];let r=null,i=0;const a={};for(const e of t){const t=this.normalizeStage(e.state||this.getPlantStage(e));a[t]||(a[t]=[]),a[t].push(e)}for(const t of e)if(a[t]&&a[t].length>0){r=t;const e=`${"vegetative"===t?"veg":t}_days`,s=a[t].map(t=>{const r=t.attributes[e];return"number"==typeof r?r:0});i=Math.max(...s);break}return r?{stage:r,days:i}:null}}Ka.stageColors={mother:"#E91E63",clone:"#FF5722",seedling:"#4CAF50",vegetative:"#8BC34A",flower:"#FF9800",dry:"#795548",cure:"#9C27B0"},Ka.stageIcons={mother:Tt,clone:Tt,seedling:Tt,vegetative:Tt,flower:$t,dry:St,cure:gt};class Xa{constructor(t){this.hass=t}getGrowspaceDevices(){if(!this.hass)return[];const t=Object.values(this.hass.states),e=t.filter(t=>t.entity_id.startsWith("sensor.")&&void 0!==t.attributes?.growspace_id&&void 0!==t.attributes?.rows&&void 0!==t.attributes?.plants_per_row&&void 0===t.attributes?.row&&void 0===t.attributes?.col),r=new Map;return e.forEach(t=>{const e=t.attributes.growspace_id;r.set(e,[])}),t.forEach(t=>{if(void 0!==t.attributes?.row&&void 0!==t.attributes?.col){const e=this.getGrowspaceId(t);r.has(e)||r.set(e,[]),r.get(e).push(t)}}),Array.from(r.entries()).map(([t,r])=>{const i=e.find(e=>e.attributes?.growspace_id===t),a=i?.attributes?.friendly_name||`Growspace ${t}`,s=i?.attributes?.type??(a.toLowerCase().includes("dry")?"dry":a.toLowerCase().includes("cure")?"cure":"normal");return n={device_id:t,overview_entity_id:i?.entity_id,name:a,plants:r,rows:i?.attributes?.rows??3,plants_per_row:i?.attributes?.plants_per_row??3,type:s},{...n,type:n.type??"normal"};var n})}getGrowspaceId(t){return t.attributes?.growspace_id||"unknown"}getStrainLibrary(){const t=Object.values(this.hass.states).find(t=>void 0!==t.attributes?.strains&&null!==t.attributes?.strains),e=t?.attributes?.strains;if(!e)return[];if(Array.isArray(e))return e.map(t=>({strain:t,phenotype:"",key:`${t}|default`}));if("object"==typeof e){const t=[];for(const[r,i]of Object.entries(e)){const e=i,a=e.analytics,s=e.meta||{};if(e.phenotypes&&"object"==typeof e.phenotypes){const i=Object.entries(e.phenotypes);if(i.length>0)for(const[e,n]of i){const i=n;let o;i.analytics?o=i.analytics:"number"==typeof i.avg_veg_days&&(o={avg_veg_days:i.avg_veg_days,avg_flower_days:i.avg_flower_days,total_harvests:i.total_harvests}),t.push({strain:r,phenotype:e,key:`${r}|${e}`,analytics:o,strain_analytics:a,image_crop_meta:i.image_crop_meta,breeder:i.breeder||s.breeder,type:i.type||s.type,lineage:i.lineage||s.lineage,sex:i.sex||s.sex,description:i.description||s.description,flowering_days_min:i.flower_days_min||s.flowering_days_min,flowering_days_max:i.flower_days_max||s.flowering_days_max,image:i.image_path||i.image||s.image})}else t.push({strain:r,phenotype:"",key:`${r}|default`,strain_analytics:a,image_crop_meta:e.image_crop_meta,breeder:s.breeder,type:s.type,lineage:s.lineage,sex:s.sex,description:s.description,flowering_days_min:s.flowering_days_min,flowering_days_max:s.flowering_days_max,image:s.image})}else t.push({strain:r,phenotype:"",key:`${r}|default`,strain_analytics:a,image_crop_meta:e.image_crop_meta,breeder:s.breeder,type:s.type,lineage:s.lineage,sex:s.sex,description:s.description,flowering_days_min:s.flowering_days_min,flowering_days_max:s.flowering_days_max,image:s.image})}return t.sort((t,e)=>{const r=t.strain.localeCompare(e.strain);return 0!==r?r:(t.phenotype||"").localeCompare(e.phenotype||"")})}return[]}async getHistory(t,e,r){if(!this.hass)return[];let i=`history/period/${e.toISOString()}?filter_entity_id=${t}`;r&&(i+=`&end_time=${r.toISOString()}`);try{const t=await this.hass.callApi("GET",i);return t&&t.length>0?t[0]:[]}catch(t){return console.error("Error fetching history:",t),[]}}async addPlant(t){console.log("[DataService:addPlant] Sending payload:",t);try{"mother"!==t.growspace_id&&"mother_overview"!==t.growspace_id||(t.mother_start=(new Date).toISOString().split("T")[0]),"clone"!==t.growspace_id&&"clone_overview"!==t.growspace_id||(t.clone_start=(new Date).toISOString().split("T")[0]);const e=await this.hass.callService("growspace_manager","add_plant",t);return console.log("[DataService:addPlant] Response:",e),e}catch(t){throw console.error("[DataService:addPlant] Error:",t),t}}async updatePlant(t){console.log("[DataService:updatePlant] Sending payload:",t);try{const e=await this.hass.callService("growspace_manager","update_plant",t);return console.log("[DataService:updatePlant] Response:",e),e}catch(t){throw console.error("[DataService:updatePlant] Error:",t),t}}async removePlant(t){console.log("[DataService:removePlant] Removing plant_id:",t);try{const e=await this.hass.callService("growspace_manager","remove_plant",{plant_id:t});return console.log("[DataService:removePlant] Response:",e),e}catch(t){throw console.error("[DataService:removePlant] Error:",t),t}}async harvestPlant(t,e="dry"){console.log("[DataService:harvestPlant] Harvesting plant:",t,"→ target:",e);try{const r=(e||"").toLowerCase(),i={plant_id:t};r.includes("dry")?i.target_growspace_id="dry_overview":r.includes("cure")?i.target_growspace_id="cure_overview":r.includes("mother")?i.target_growspace_id="mother_overview":r.includes("clone")?i.target_growspace_id="clone_overview":r&&(i.target_growspace_name=e);const a=await this.hass.callService("growspace_manager","harvest_plant",i);return console.log("[DataService:harvestPlant] Response:",a),a}catch(t){throw console.error("[DataService:harvestPlant] Error:",t),t}}async takeClone(t,e="clone"){console.log("[DataService:takeClone] Cloning plant:",t,"→ target:",e);try{const r=(e||"").toLowerCase(),i={plant_id:t};r.includes("dry")?i.target_growspace_id="dry_overview":r.includes("cure")?i.target_growspace_id="cure_overview":r.includes("mother")?i.target_growspace_id="mother_overview":r.includes("clone")?i.target_growspace_id="clone_overview":r&&(i.target_growspace_name=e);const a=await this.hass.callService("growspace_manager","takeClone",i);return console.log("[DataService:takeClone] Response:",a),a}catch(t){throw console.error("[DataService:takeClone] Error:",t),t}}async swapPlants(t,e){console.log(`[DataService:swapPlants] Swapping plants: ${t} and ${e}`);try{const r=await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e});return console.log("[DataService:swapPlants] Response:",r),r}catch(t){throw console.error("[DataService:swapPlants] Error:",t),t}}async addStrain(t){console.log("[DataService:addStrain] Adding strain:",t);try{const e={...t};t.image&&(t.image.startsWith("data:")?(e.image_base64=t.image,delete e.image):(e.image_path=t.image,delete e.image));const r=await this.hass.callService("growspace_manager","add_strain",e);return console.log("[DataService:addStrain] Response:",r),r}catch(t){throw console.error("[DataService:addStrain] Error:",t),t}}async removeStrain(t,e){console.log("[DataService:removeStrain] Removing strain:",t,e);try{const r=await this.hass.callService("growspace_manager","remove_strain",{strain:t,phenotype:e});return console.log("[DataService:removeStrain] Response:",r),r}catch(t){throw console.error("[DataService:removeStrain] Error:",t),t}}async importStrainLibrary(t){console.log("[DataService:importStrainLibrary] Importing strains:",t);try{const e=await this.hass.callService("growspace_manager","import_strain_library",{strains:t});return console.log("[DataService:importStrainLibrary] Response:",e),e}catch(t){throw console.error("[DataService:importStrainLibrary] Error:",t),t}}async clearStrainLibrary(){console.log("[DataService:clearStrainLibrary] Clearing library");try{const t=await this.hass.callService("growspace_manager","clear_strain_library");return console.log("[DataService:clearStrainLibrary] Response:",t),t}catch(t){throw console.error("[DataService:clearStrainLibrary] Error:",t),t}}async addGrowspace(t){console.log("[DataService:addGrowspace] Adding growspace:",t);try{const e=await this.hass.callService("growspace_manager","add_growspace",t);return console.log("[DataService:addGrowspace] Response:",e),e}catch(t){throw console.error("[DataService:addGrowspace] Error:",t),t}}async configureGrowspaceSensors(t){console.log("[DataService:configureGrowspaceSensors] Configuring sensors:",t);try{const e=await this.hass.callService("growspace_manager","configure_growspace",t);return console.log("[DataService:configureGrowspaceSensors] Response:",e),e}catch(t){throw console.error("[DataService:configureGrowspaceSensors] Error:",t),t}}async configureGlobalSettings(t){console.log("[DataService:configureGlobalSettings] Configuring global settings:",t);try{const e=await this.hass.callService("growspace_manager","configure_global",t);return console.log("[DataService:configureGlobalSettings] Response:",e),e}catch(t){throw console.error("[DataService:configureGlobalSettings] Error:",t),t}}}class ts{static getCropStyle(t,e){return e?`\n      background-image: url('${t}');\n      background-size: ${100*e.scale}%;\n      background-position: ${e.x}% ${e.y}%;\n    `:`background-image: url('${t}')`}static renderAddPlantDialog(t,e,r){if(!t?.open)return R``;const i=[...new Set(e.map(t=>t.strain))].sort();return R`
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
                 <path d="${yt}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${ts.renderMD3SelectInput("Strain *",t.strain||"",i,r.onStrainChange)}
               ${ts.renderMD3TextInput("Phenotype",t.phenotype||"",r.onPhenotypeChange)}
               <div style="display:flex; gap:16px;">
                 ${ts.renderMD3NumberInput("Row",t.row+1,t=>r.onRowChange(t))}
                 ${ts.renderMD3NumberInput("Col",t.col+1,t=>r.onColChange(t))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${ts.renderMD3DateInput("Vegetative Start",t.veg_start||"",r.onVegStartChange)}
               ${ts.renderMD3DateInput("Flower Start",t.flower_start||"",r.onFlowerStartChange)}
             </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${r.onClose}>
              Cancel
            </button>
            <button class="md3-button primary" @click=${r.onConfirm}>
              <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Tt}"></path></svg>
              Add Plant
            </button>
          </div>

        </div>
      </ha-dialog>
    `}static renderPlantOverviewDialog(t,e,r){if(!t?.open)return R``;const{plant:i,editedAttributes:a}=t,s=i.attributes?.plant_id||i.entity_id.replace("sensor.",""),n=Ka.getPlantStageColor(i.state),o=Ka.getPlantStageIcon(i.state),l=(t,e)=>{a[t]="number"==typeof e?e.toString():e,r.onAttributeChange(t,a[t])};return R`
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
               <h2 class="dialog-title">${a.strain||"Unknown Strain"}</h2>
               <div class="dialog-subtitle">${i.state} Stage • ${a.phenotype||"No Phenotype"}</div>
            </div>
            <button class="md3-button text" @click=${r.onClose} style="min-width: auto; padding: 8px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                 <path d="${yt}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY & LOCATION CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${ts.renderMD3TextInput("Strain Name",a.strain||"",t=>r.onAttributeChange("strain",t))}
               ${ts.renderMD3TextInput("Phenotype",a.phenotype||"",t=>r.onAttributeChange("phenotype",t))}
               <div style="display:flex; gap:16px;">
                 ${ts.renderMD3NumberInput("Row",a.row||1,t=>r.onAttributeChange("row",parseInt(t)))}
                 ${ts.renderMD3NumberInput("Col",a.col||1,t=>r.onAttributeChange("col",parseInt(t)))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${"mother"===a.stage?ts.renderMD3DateInput("Mother Start",a.mother_start??"",t=>l("mother_start",t)):Z}
               ${"clone"===a.stage?ts.renderMD3DateInput("Clone Start",a.clone_start??"",t=>l("clone_start",t)):Z}
               ${"veg"===a.stage||"flower"===a.stage?ts.renderMD3DateInput("Vegetative Start",a.veg_start??"",t=>l("veg_start",t)):Z}
               ${"flower"===a.stage?ts.renderMD3DateInput("Flower Start",a.flower_start??"",t=>l("flower_start",t)):Z}
               ${"dry"===a.stage||"cure"===a.stage?ts.renderMD3DateInput("Dry Start",a.dry_start??"",t=>l("dry_start",t)):Z}
               ${"cure"===a.stage?ts.renderMD3DateInput("Cure Start",a.cure_start??"",t=>l("cure_start",t)):Z}
             </div>

             <!-- STATS CARD -->
             ${ts.renderPlantStatsMD3(i)}

          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
             <button class="md3-button danger" @click=${()=>r.onDelete(s)}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${xt}"></path></svg>
               Delete
             </button>

             <button class="md3-button tonal" @click=${r.onUpdate}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mt}"></path></svg>
               Save Changes
             </button>

             <!-- DYNAMIC ACTIONS BASED ON STAGE -->
             ${"mother"===i.state.toLowerCase()?R`
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
                    @click=${t=>{const e=t.currentTarget.previousElementSibling,a=e?parseInt(e.value,10):1;r.onTakeClone(i,a)}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${wt}"></path></svg>
                    Take Clone
                  </button>
                </div>
             `:Z}

             ${"flower"===i.state.toLowerCase()?R`
               <button class="md3-button primary" @click=${()=>r.onHarvest(i)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${$t}"></path></svg>
                 Harvest
               </button>
             `:Z}

             ${"dry"===i.state.toLowerCase()?R`
               <button class="md3-button primary" @click=${()=>r.onFinishDrying(i)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${gt}"></path></svg>
                 Finish Drying
               </button>
             `:Z}

             ${"clone"===i.state.toLowerCase()?R`
               <div style="display:contents;">
                  <select class="md3-input" style="width: auto; height: 40px; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 0 16px;" id="clone-target-select">
                    <option value="">Move to...</option>
                    ${Object.entries(e).map(([t,e])=>R`<option value="${t}">${e}</option>`)}
                  </select>
                  <button class="md3-button primary"
                    @click=${t=>{const e=t.currentTarget.previousElementSibling;e.value?r.onMoveClone(i,e.value):alert("Select a growspace")}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"}"></path></svg>
                    Move
                  </button>
               </div>
             `:Z}
          </div>

        </div>
      </ha-dialog>
    `}static renderStrainLibraryDialog(t,e){return t?.open?R`
      <ha-dialog
        open
        @closed=${e.onClose}
        hideActions
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <style>
          /* STRICT DARK MODE & SHARED STYLES */
          .strain-dialog-container {
             background-color: #1a1a1a; /* Deep Charcoal */
             color: #fff;
             display: flex;
             flex-direction: column;
             height: 85vh;
             width: 90vw;
             max-width: 1200px;
             border-radius: 16px;
             overflow: hidden;
             font-family: 'Roboto', sans-serif;
             --accent-green: #22c55e;
             --card-bg: #2d2d2d;
             --input-bg: #2d2d2d;
             --text-secondary: #9ca3af;
             --border-color: #374151;
          }

          /* SCROLLBAR */
          .strain-dialog-container ::-webkit-scrollbar { width: 8px; }
          .strain-dialog-container ::-webkit-scrollbar-track { background: transparent; }
          .strain-dialog-container ::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
          .strain-dialog-container ::-webkit-scrollbar-thumb:hover { background: #6b7280; }

          /* HEADER */
          .sd-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid var(--border-color);
            background: #1a1a1a;
            z-index: 10;
          }
          .sd-title {
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: #fff;
            margin: 0;
          }
          .sd-close-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: all 0.2s;
          }
          .sd-close-btn:hover {
            background: rgba(255,255,255,0.1);
            color: #fff;
          }

          /* CONTENT AREA */
          .sd-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
            background: #1a1a1a;
          }

          /* FOOTER */
          .sd-footer {
            padding: 16px 24px;
            border-top: 1px solid var(--border-color);
            background: #1a1a1a;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }

          /* BUTTONS */
          .sd-btn {
             display: inline-flex;
             align-items: center;
             justify-content: center;
             gap: 8px;
             padding: 10px 20px;
             border-radius: 8px;
             font-weight: 600;
             font-size: 0.9rem;
             cursor: pointer;
             transition: all 0.2s;
             border: none;
          }
          .sd-btn.primary {
            background: var(--accent-green);
            color: #fff;
          }
          .sd-btn.primary:hover {
            background: #16a34a;
            box-shadow: 0 0 12px rgba(34, 197, 94, 0.4);
          }
          .sd-btn.secondary {
            background: var(--card-bg);
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
          }
          .sd-btn.secondary:hover {
            background: #374151;
            color: #fff;
          }
          .sd-btn.danger {
             background: rgba(220, 38, 38, 0.1);
             color: #ef4444;
             border: 1px solid rgba(220, 38, 38, 0.2);
          }
          .sd-btn.danger:hover {
             background: rgba(220, 38, 38, 0.2);
          }

          /* FORMS */
          .sd-form-group {
            margin-bottom: 20px;
          }
          .sd-label {
            display: block;
            color: var(--text-secondary);
            font-size: 0.85rem;
            margin-bottom: 8px;
            font-weight: 500;
          }
          .sd-input, .sd-textarea, .sd-select {
            width: 100%;
            background: var(--input-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px 16px;
            color: #fff;
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.2s;
            box-sizing: border-box; /* Ensure padding doesn't overflow */
          }
          .sd-input:focus, .sd-textarea:focus, .sd-select:focus {
            border-color: var(--accent-green);
          }
          .sd-textarea {
            resize: vertical;
            min-height: 100px;
          }

          /* GRID & CARDS */
          .sd-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
          }
          .strain-card {
             background: var(--card-bg);
             border-radius: 12px;
             overflow: hidden;
             border: 1px solid var(--border-color);
             transition: all 0.3s ease;
             position: relative;
             display: flex;
             flex-direction: column;
          }
          .strain-card:hover {
             border-color: var(--accent-green);
             transform: translateY(-4px);
             box-shadow: 0 10px 20px rgba(0,0,0,0.3);
          }
          .sc-thumb {
             height: 180px;
             background: #222;
             display: flex;
             align-items: center;
             justify-content: center;
             color: #444;
             position: relative;
          }
          .sc-thumb img {
             width: 100%;
             height: 100%;
             object-fit: cover;
          }
          .sc-content {
             padding: 16px;
             flex: 1;
          }
          .sc-title {
             font-size: 1.1rem;
             font-weight: 700;
             margin: 0 0 4px 0;
             color: #fff;
          }
          .sc-type-row {
             display: flex;
             align-items: center;
             gap: 6px;
             color: var(--accent-green);
             font-size: 0.85rem;
             font-weight: 600;
             margin-bottom: 12px;
          }
          .sc-meta {
             display: flex;
             flex-direction: column;
             gap: 4px;
             font-size: 0.8rem;
             color: var(--text-secondary);
          }
          .sc-actions {
             position: absolute;
             top: 8px;
             right: 8px;
             display: flex;
             gap: 8px;
             opacity: 0;
             transition: opacity 0.2s;
          }
          .strain-card:hover .sc-actions {
             opacity: 1;
          }
          .sc-action-btn {
             background: rgba(0,0,0,0.6);
             border: none;
             border-radius: 50%;
             width: 32px;
             height: 32px;
             display: flex;
             align-items: center;
             justify-content: center;
             color: #fff;
             cursor: pointer;
          }
          .sc-action-btn:hover {
             background: var(--accent-green);
          }

          /* SEARCH BAR */
          .search-bar-container {
             margin-bottom: 24px;
          }
          .search-input-wrapper {
             position: relative;
             margin-bottom: 12px;
          }
          .search-input-wrapper svg {
             position: absolute;
             left: 16px;
             top: 50%;
             transform: translateY(-50%);
             width: 20px;
             height: 20px;
             fill: var(--text-secondary);
          }
          .search-bar-input {
             width: 100%;
             background: var(--card-bg);
             border: 1px solid var(--border-color);
             border-radius: 12px;
             padding: 14px 14px 14px 48px;
             color: #fff;
             font-size: 1rem;
             outline: none;
             box-sizing: border-box;
          }
          .search-bar-input:focus {
             border-color: var(--accent-green);
          }
          .filter-chips {
             display: flex;
             gap: 8px;
             flex-wrap: wrap;
             align-items: center;
          }
          .filter-chip {
             background: #374151;
             padding: 6px 12px;
             border-radius: 20px;
             font-size: 0.8rem;
             color: #fff;
             display: flex;
             align-items: center;
             gap: 6px;
          }
          .clear-link {
             color: var(--accent-green);
             font-size: 0.85rem;
             text-decoration: underline;
             cursor: pointer;
             margin-left: 8px;
          }

          /* EDITOR LAYOUT */
          .editor-layout {
             display: grid;
             grid-template-columns: 1fr 1.5fr;
             gap: 32px;
          }
          @media (max-width: 800px) {
             .editor-layout { grid-template-columns: 1fr; }
          }

          /* TYPE SELECTOR */
          .type-selector-grid {
             display: grid;
             grid-template-columns: 1fr 1fr;
             gap: 12px;
          }
          .type-option {
             background: var(--input-bg);
             border: 1px solid var(--border-color);
             border-radius: 8px;
             padding: 16px;
             cursor: pointer;
             display: flex;
             flex-direction: column;
             align-items: center;
             gap: 8px;
             transition: all 0.2s;
             text-align: center;
          }
          .type-option:hover {
             border-color: #666;
          }
          .type-option.active {
             background: rgba(34, 197, 94, 0.1);
             border-color: var(--accent-green);
             color: #fff;
          }
          .type-option svg {
             width: 28px;
             height: 28px;
             fill: var(--text-secondary);
          }
          .type-option.active svg {
             fill: var(--accent-green);
          }
          .type-label {
             font-size: 0.85rem;
             font-weight: 500;
          }

          /* PHOTO UPLOAD */
          .photo-upload-area {
             border: 2px dashed var(--border-color);
             border-radius: 12px;
             background: rgba(255,255,255,0.02);
             height: 240px;
             display: flex;
             flex-direction: column;
             align-items: center;
             justify-content: center;
             color: var(--text-secondary);
             cursor: pointer;
             transition: all 0.2s;
             margin-bottom: 20px;
             position: relative;
             overflow: hidden;
          }
          .photo-upload-area:hover {
             border-color: var(--accent-green);
             background: rgba(34, 197, 94, 0.05);
          }
          .select-library-btn {
             position: absolute;
             top: 8px;
             left: 8px;
             background: rgba(0,0,0,0.6);
             border: 1px solid rgba(255,255,255,0.2);
             color: #fff;
             padding: 6px 12px;
             border-radius: 20px;
             font-size: 0.75rem;
             display: flex;
             align-items: center;
             gap: 6px;
             z-index: 10;
             cursor: pointer;
          }
          .select-library-btn:hover {
             background: var(--accent-green);
             border-color: var(--accent-green);
          }

          /* Crop Overlay */
          .crop-overlay {
             position: fixed;
             top: 0; left: 0; right: 0; bottom: 0;
             background: rgba(0,0,0,0.9);
             z-index: 1000;
             display: flex;
             flex-direction: column;
             align-items: center;
             justify-content: center;
             padding: 20px;
          }
          .crop-viewport {
             width: 300px;
             height: 300px;
             border: 2px solid var(--accent-green);
             overflow: hidden;
             position: relative;
             cursor: move;
             box-shadow: 0 0 0 100vmax rgba(0,0,0,0.7);
          }
          .crop-controls {
             margin-top: 20px;
             width: 300px;
             display: flex;
             flex-direction: column;
             gap: 12px;
          }
          .crop-slider {
             width: 100%;
             accent-color: var(--accent-green);
          }

        </style>

        <div class="strain-dialog-container">
           ${"browse"===t.view?this.renderStrainBrowseView(t,e):this.renderStrainEditorView(t,e)}
        </div>

        ${t.isCropping?this.renderCropOverlay(t,e):Z}
        ${t.isImageSelectorOpen?this.renderImageSelector(t,e):Z}

      </ha-dialog>
    `:R``}static renderImageSelector(t,e){const r=new Map;return t.strains.forEach(t=>{t.image&&(r.has(t.image)||r.set(t.image,[]),r.get(t.image).push({strain:t.strain,phenotype:t.phenotype||""}))}),R`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 80%; max-width: 800px; height: 80%; max-height: 600px; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color);">
              <div class="sd-header">
                 <h2 class="sd-title">Select from Library</h2>
                 <button class="sd-close-btn" @click=${()=>e.onToggleImageSelector(!1)}>
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${yt}"></path></svg>
                 </button>
              </div>
              <div class="sd-content" style="overflow-y: auto;">
                 <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
                    ${[...r.entries()].map(([t,r])=>R`
                       <div style="aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; position: relative;"
                            @click=${()=>e.onSelectLibraryImage(t)}>
                          <img src="${t}" style="width: 100%; height: 100%; object-fit: cover;" />

                          <!-- Info Overlay -->
                          <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 8px; font-size: 0.75rem; color: white;">
                             ${r.map((t,e)=>R`
                                <div style="${e<r.length-1?"margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);":""}">
                                   <div style="font-weight: 700;">Strain: ${t.strain}</div>
                                   <div style="opacity: 0.9;">Pheno: ${t.phenotype||"N/A"}</div>
                                </div>
                             `)}
                          </div>

                          <div class="image-hover-overlay" style="position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(34, 197, 94, 0.2); opacity: 0; transition: opacity 0.2s; pointer-events: none;"></div>
                       </div>
                    `)}
                 </div>
                 ${0===r.size?R`<p style="text-align: center; color: var(--text-secondary); margin-top: 40px;">No images found in library.</p>`:Z}
              </div>
           </div>
        </div>
     `}static renderCropOverlay(t,e){const r=t.editorState;if(!r.image)return Z;const i=r.image_crop_meta||{x:50,y:50,scale:1};return R`
       <div class="crop-overlay">
          <h3 style="color:white; margin-bottom:20px;">Adjust Image</h3>
          <div class="crop-viewport"
               @wheel=${t=>{t.preventDefault();const r=-.001*t.deltaY,a=Math.min(Math.max(i.scale+r,1),5);e.onEditorChange("image_crop_meta",{...i,scale:a})}}
               @mousedown=${t=>{const r=t.clientX,a=t.clientY,s=i.x,n=i.y,o=t=>{const o=(r-t.clientX)*(.2/i.scale),l=(a-t.clientY)*(.2/i.scale);let c=Math.min(Math.max(s+o,0),100),d=Math.min(Math.max(n+l,0),100);e.onEditorChange("image_crop_meta",{...i,x:c,y:d})},l=()=>{window.removeEventListener("mousemove",o),window.removeEventListener("mouseup",l)};window.addEventListener("mousemove",o),window.addEventListener("mouseup",l)}}
               @dragstart=${t=>t.preventDefault()}>
             <!--
                We are updating the CropMeta which maps to background-position %.
                background-position: 50% 50% is center. 0% 0% is left/top.
             -->
             <div style="width: 100%; height: 100%;
                 background-image: url('${r.image}');
                 background-size: ${100*i.scale}%;
                 background-position: ${i.x}% ${i.y}%;
                 background-repeat: no-repeat;
                 pointer-events: none;">
             </div>
          </div>

          <div class="crop-controls">
             <div style="display:flex; justify-content:space-between; color:#ccc; font-size:0.8rem;">
                <span>Zoom: ${(100*i.scale).toFixed(0)}%</span>
             </div>
             <input type="range" class="crop-slider" min="1" max="5" step="0.1"
                    .value=${i.scale}
                    @input=${t=>e.onEditorChange("image_crop_meta",{...i,scale:parseFloat(t.target.value)})} />

             <div style="display:flex; gap:12px; margin-top:12px;">
                <button class="md3-button tonal" style="flex:1" @click=${()=>e.onToggleCropMode(!1)}>Done</button>
             </div>
             <div style="text-align:center; font-size:0.8rem; color:#888; margin-top:8px;">
                Drag to pan • Scroll to zoom
             </div>
          </div>
       </div>
    `}static renderStrainBrowseView(t,e){const r=(t.searchQuery||"").toLowerCase(),i=t.strains.filter(t=>t.strain.toLowerCase().includes(r)||t.breeder&&t.breeder.toLowerCase().includes(r)||t.phenotype&&t.phenotype.toLowerCase().includes(r));return R`
      <div class="sd-header">
         <h2 class="sd-title">Strain Library</h2>
         <button class="sd-close-btn" @click=${e.onClose}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${yt}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
         <!-- SEARCH & FILTER -->
         <div class="search-bar-container">
            <div class="search-input-wrapper">
               <svg viewBox="0 0 24 24"><path d="${Dt}"></path></svg>
               <input
                  type="text"
                  class="search-bar-input"
                  placeholder="Search Strains by Name, Breeder..."
                  .value=${t.searchQuery||""}
                  @input=${t=>e.onSearch(t.target.value)}
               />
            </div>
            <div class="filter-chips">
               <!-- Placeholder Chips -->
               <div class="filter-chip">
                  <span>Sativa Dom</span>
                  <svg style="width:16px;height:16px;fill:currentColor;cursor:pointer" viewBox="0 0 24 24"><path d="${yt}"></path></svg>
               </div>
               <div class="filter-chip">
                  <span>Under 60 Days</span>
                  <svg style="width:16px;height:16px;fill:currentColor;cursor:pointer" viewBox="0 0 24 24"><path d="${yt}"></path></svg>
               </div>
               <a class="clear-link">Clear All</a>
            </div>
         </div>

         <!-- GRID -->
         <div class="sd-grid">
            ${i.map(t=>this.renderStrainCard(t,e))}
         </div>

         ${0===i.length?R`
            <div style="text-align:center; padding: 40px; color: var(--text-secondary);">
               <svg style="width:48px;height:48px;fill:currentColor; opacity:0.5;" viewBox="0 0 24 24"><path d="${Dt}"></path></svg>
               <p>No strains found matching "${r}"</p>
            </div>
         `:Z}
      </div>

      <div class="sd-footer">
         <button class="sd-btn secondary">
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M11 20H6.5Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20H13V12.85L14.6 14.4L16 13L12 9L8 13L9.4 14.4L11 12.85Z"}"></path></svg>
            Import CSV
         </button>
         <button class="sd-btn primary" @click=${()=>e.onSwitchView("editor")}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${kt}"></path></svg>
            New Strain
         </button>
      </div>
    `}static renderStrainCard(t,e){let r=Ct,i=t.type||"Unknown";const a=(t.type||"").toLowerCase();a.includes("indica")?r=Ot:a.includes("sativa")?r=Lt:a.includes("hybrid")?r=Mt:(a.includes("ruderalis")||a.includes("auto"))&&(r=Ct);const s=t.image?ts.getCropStyle(t.image,t.image_crop_meta):"";return R`
       <div class="strain-card" @click=${()=>e.onSwitchView("editor",t)}>
          <div class="sc-thumb" style="${t.image?s+"; background-repeat: no-repeat; background-position: center; background-size: cover;":""}">
             ${t.image?t.image_crop_meta?R`<div style="width:100%; height:100%; ${s}; background-repeat: no-repeat;"></div>`:R`<img src="${t.image}" alt="${t.strain}" />`:R`<svg style="width:48px;height:48px;opacity:0.2;fill:currentColor;" viewBox="0 0 24 24"><path d="${gt}"></path></svg>`}
             <div class="sc-actions">
                <button class="sc-action-btn" @click=${r=>{r.stopPropagation(),e.onRemoveStrain(t.key)}}>
                   <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${xt}"></path></svg>
                </button>
             </div>
          </div>
          <div class="sc-content">
             <h3 class="sc-title">${t.strain} ${t.phenotype?`(${t.phenotype})`:""}</h3>
             <div class="sc-type-row">
                <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${r}"></path></svg>
                <span>${i}</span>
             </div>
             <div class="sc-meta">
                ${t.flowering_days_min?R`<span>Flowering: ${t.flowering_days_min}-${t.flowering_days_max||"?"} Days</span>`:Z}
                ${t.breeder?R`<span>Breeder: ${t.breeder}</span>`:Z}
             </div>
          </div>
       </div>
     `}static renderStrainEditorView(t,e){const r=t.editorState||{},i=!!r.strain&&t.strains.some(t=>t.strain===r.strain&&t.phenotype===r.phenotype),a=(t,r)=>e.onEditorChange(t,r);return R`
      <div class="sd-header">
         <div style="display:flex; align-items:center; gap:16px;">
            <button class="sd-btn secondary" style="padding: 8px 12px;" @click=${()=>e.onSwitchView("browse")}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"}"></path></svg>
               Back
            </button>
            <h2 class="sd-title">${i?"Edit Strain":"Add New Strain"}</h2>
         </div>
         <button class="sd-close-btn" @click=${e.onClose}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${yt}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
         <div class="editor-layout">
            <!-- LEFT COL: IDENTITY -->
            <div class="editor-col">
               <div class="photo-upload-area"
                    @click=${t=>{const e=t.target;e.closest(".crop-btn")||e.closest(".select-library-btn")||t.currentTarget.querySelector("input")?.click()}}
                    @dragover=${t=>{t.preventDefault(),t.dataTransfer.dropEffect="copy"}}
                    @drop=${t=>{t.preventDefault();const e=t.dataTransfer?.files[0];if(e){const t=new FileReader;t.onload=t=>a("image",t.target?.result),t.readAsDataURL(e)}}}>

                  <button class="select-library-btn" @click=${t=>{t.stopPropagation(),e.onToggleImageSelector(!0)}}>
                      <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Et}"></path></svg>
                      Select from Library
                  </button>

                  ${r.image?R`
                     ${r.image_crop_meta?R`<div style="width:100%; height:100%; border-radius:10px; ${ts.getCropStyle(r.image,r.image_crop_meta)}; background-repeat: no-repeat;"></div>`:R`<img src="${r.image}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" />`}

                     <div style="position:absolute; bottom:8px; right:8px; display:flex; gap:8px;">
                         <button class="crop-btn"
                                 style="background:rgba(0,0,0,0.6); border:none; padding:6px; border-radius:50%; cursor:pointer; color:white;"
                                 @click=${t=>{t.stopPropagation(),e.onToggleCropMode(!0)}}
                                 title="Crop Image">
                            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${wt}"></path></svg>
                         </button>
                         <div style="background:rgba(0,0,0,0.6); padding:6px; border-radius:50%; pointer-events:none;">
                            <svg style="width:18px;height:18px;fill:white;" viewBox="0 0 24 24"><path d="${"M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"}"></path></svg>
                         </div>
                     </div>
                  `:R`
                     <svg style="width:48px;height:48px;fill:currentColor;margin-bottom:16px;" viewBox="0 0 24 24"><path d="${"M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z"}"></path></svg>
                     <span style="font-weight:600;">PHOTO UPLOAD AREA</span>
                     <span style="font-size:0.8rem; margin-top:4px;">(Drag & Drop or Click)</span>
                  `}
                  <input type="file" id="strain-image-upload" style="display:none" accept="image/*"
                         @change=${t=>{const e=t.target.files?.[0];if(e){const t=new FileReader;t.onload=t=>a("image",t.target?.result),t.readAsDataURL(e)}}} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Strain Name *</label>
                  <input type="text" class="sd-input" .value=${r.strain} @input=${t=>a("strain",t.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Phenotype</label>
                  <input type="text" class="sd-input" placeholder="e.g. #1 (Optional)" .value=${r.phenotype} @input=${t=>a("phenotype",t.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Breeder/Seedbank</label>
                  <input type="text" class="sd-input" .value=${r.breeder} @input=${t=>a("breeder",t.target.value)} />
               </div>
            </div>

            <!-- RIGHT COL: GENETICS -->
            <div class="editor-col">
               <div class="sd-form-group">
                  <label class="sd-label">Type *</label>
                  <div class="type-selector-grid">
                     ${["Indica","Sativa","Hybrid","Ruderalis"].map(t=>{let e=Ct;"Indica"===t&&(e=Ot),"Sativa"===t&&(e=Lt),"Hybrid"===t&&(e=Mt);const i=(r.type||"").toLowerCase()===t.toLowerCase();return R`
                           <div class="type-option ${i?"active":""}"
                                @click=${()=>a("type",t)}>
                              <svg viewBox="0 0 24 24"><path d="${e}"></path></svg>
                              <span class="type-label">${t}</span>
                           </div>
                        `})}
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Flowering Time (Days)</label>
                  <div style="display:flex; gap:16px;">
                     <input type="number" class="sd-input" placeholder="Min" .value=${r.flowering_min} @input=${t=>a("flowering_min",t.target.value)} />
                     <input type="number" class="sd-input" placeholder="Max" .value=${r.flowering_max} @input=${t=>a("flowering_max",t.target.value)} />
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Lineage</label>
                  <input type="text" class="sd-input" .value=${r.lineage} @input=${t=>a("lineage",t.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Sex</label>
                  <div style="display:flex; gap:20px; padding: 8px 0;">
                     ${["Feminized","Regular"].map(t=>R`
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white;">
                           <input type="radio" name="sex_radio"
                                  .checked=${r.sex===t}
                                  @change=${()=>a("sex",t)}
                                  style="accent-color: var(--accent-green); transform: scale(1.2);" />
                           ${t}
                        </label>
                     `)}
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Description</label>
                  <textarea class="sd-textarea" .value=${r.description} @input=${t=>a("description",t.target.value)}></textarea>
               </div>
            </div>
         </div>
      </div>

      <div class="sd-footer">
         <button class="sd-btn secondary" @click=${()=>e.onSwitchView("browse")}>
            Cancel
         </button>
         <button class="sd-btn primary" @click=${e.onAddStrain}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mt}"></path></svg>
            Save Strain
         </button>
      </div>
    `}static renderMD3TextInput(t,e,r){return R`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="text"
          class="md3-input"
          .value=${e}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderMD3SelectInput(t,e,r,i){return R`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <select
          class="md3-input"
          .value=${e}
          @change=${t=>i(t.target.value)}
        >
          <option value="">Select...</option>
          ${r.map(t=>R`<option value="${t}" ?selected=${t===e}>${t}</option>`)}
        </select>
      </div>
    `}static renderMD3NumberInput(t,e,r){return R`
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
    `}static renderMD3DateInput(t,e,r){const i=Ka.toDateTimeLocal(e);return R`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="datetime-local"
          class="md3-input"
          .value=${i}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderTextInput(t,e,r){return R`
      <div class="form-group">
        <label>${t}</label>
        <input 
          type="text" 
          class="form-input"
          .value=${e}
          @input=${t=>r(t.target.value)}
        />
      </div>
    `}static renderNumberInput(t,e,r){return R`
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
    `}static renderDateTimeInput(t,e,r,i){return R`
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
          @input=${t=>i(t.target.value)}
        />
      </div>
    `}static renderPlantStatsMD3(t){return t.attributes?.veg_days||t.attributes?.flower_days||t.attributes?.dry_days||t.attributes?.cure_days?R`
      <div class="detail-card">
        <h3>Current Progress</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
           ${t.attributes?.veg_days?R`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-veg);">${t.attributes.veg_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Veg Days</span>
             </div>
           `:""}
           ${t.attributes?.flower_days?R`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-flower);">${t.attributes.flower_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Flower Days</span>
             </div>
           `:""}
           ${t.attributes?.dry_days?R`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-dry);">${t.attributes.dry_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Drying Days</span>
             </div>
           `:""}
           ${t.attributes?.cure_days?R`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-cure);">${t.attributes.cure_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Curing Days</span>
             </div>
           `:""}
        </div>
      </div>
    `:R``}static renderPlantStats(t){return this.renderPlantStatsMD3(t)}static renderConfigDialog(t,e,r){if(!t?.open)return R``;const i=t.currentTab;return R`
      <ha-dialog
        open
        @closed=${r.onClose}
        hideActions
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <style>
          /* CONFIG DIALOG SPECIFIC STYLES */
          .config-container {
             background-color: #1a1a1a;
             color: #fff;
             display: flex;
             flex-direction: column;
             height: 80vh;
             width: 500px;
             max-width: 90vw;
             border-radius: 24px;
             overflow: hidden;
             font-family: 'Roboto', sans-serif;
             --accent-color: #22c55e;
          }
          .config-header {
             padding: 20px 24px;
             background: #2d2d2d;
             display: flex;
             align-items: center;
             gap: 16px;
             border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .config-title {
             margin: 0;
             font-size: 1.25rem;
             font-weight: 600;
          }
          .config-tabs {
             display: flex;
             background: #2d2d2d;
             padding: 0 16px;
             border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .config-tab {
             flex: 1;
             padding: 16px 8px;
             text-align: center;
             cursor: pointer;
             color: var(--secondary-text-color);
             border-bottom: 3px solid transparent;
             transition: all 0.2s;
             display: flex;
             flex-direction: column;
             align-items: center;
             gap: 4px;
             font-size: 0.8rem;
             font-weight: 500;
          }
          .config-tab svg {
             width: 24px;
             height: 24px;
             margin-bottom: 4px;
          }
          .config-tab:hover {
             color: #fff;
             background: rgba(255,255,255,0.05);
          }
          .config-tab.active {
             color: var(--accent-color);
             border-bottom-color: var(--accent-color);
          }
          .config-content {
             flex: 1;
             padding: 24px;
             overflow-y: auto;
          }
          .config-actions {
             padding: 16px 24px;
             border-top: 1px solid rgba(255,255,255,0.1);
             display: flex;
             justify-content: flex-end;
             gap: 12px;
             background: #2d2d2d;
          }
        </style>

        <div class="config-container">
           <!-- Header -->
           <div class="config-header">
              <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 12px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${bt}"></path></svg>
              </div>
              <h2 class="config-title">Configuration</h2>
              <div style="flex:1"></div>
              <button class="md3-button text" @click=${r.onClose} style="min-width: auto; padding: 8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${yt}"></path></svg>
              </button>
           </div>

           <!-- Tabs -->
           <div class="config-tabs">
              <div class="config-tab ${"add_growspace"===i?"active":""}"
                   @click=${()=>r.onSwitchTab("add_growspace")}>
                 <svg viewBox="0 0 24 24"><path d="${Et}"></path></svg>
                 Add Growspace
              </div>
              <div class="config-tab ${"environment"===i?"active":""}"
                   @click=${()=>r.onSwitchTab("environment")}>
                 <svg viewBox="0 0 24 24"><path d="${At}"></path></svg>
                 Environment
              </div>
              <div class="config-tab ${"global"===i?"active":""}"
                   @click=${()=>r.onSwitchTab("global")}>
                 <svg viewBox="0 0 24 24"><path d="${"M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"}"></path></svg>
                 Global
              </div>
           </div>

           <!-- Content -->
           <div class="config-content">
              ${"add_growspace"===i?this.renderAddGrowspaceTab(t,r):Z}
              ${"environment"===i?this.renderEnvironmentTab(t,e,r):Z}
              ${"global"===i?this.renderGlobalTab(t,r):Z}
           </div>

           <!-- Actions -->
           <div class="config-actions">
              <button class="md3-button tonal" @click=${r.onClose}>Cancel</button>
              ${"add_growspace"===i?R`
                 <button class="md3-button primary" @click=${r.onAddGrowspaceSubmit}>Add Growspace</button>
              `:Z}
              ${"environment"===i?R`
                 <button class="md3-button primary" @click=${r.onEnvSubmit}>Save Sensors</button>
              `:Z}
              ${"global"===i?R`
                 <button class="md3-button primary" @click=${r.onGlobalSubmit}>Save Global</button>
              `:Z}
           </div>
        </div>
      </ha-dialog>
    `}static renderAddGrowspaceTab(t,e){const r=t.addGrowspaceData;return R`
      <div style="display:flex; flex-direction:column; gap:20px;">
         <div class="detail-card">
            <h3>New Growspace Details</h3>
            ${this.renderMD3TextInput("Growspace Name",r.name,t=>e.onAddGrowspaceChange("name",t))}
            <div style="display:flex; gap:16px;">
               ${this.renderMD3NumberInput("Rows",r.rows,t=>e.onAddGrowspaceChange("rows",parseInt(t)))}
               ${this.renderMD3NumberInput("Plants per Row",r.plants_per_row,t=>e.onAddGrowspaceChange("plants_per_row",parseInt(t)))}
            </div>
            ${this.renderMD3TextInput("Notification Service (Optional)",r.notification_service,t=>e.onAddGrowspaceChange("notification_service",t))}
         </div>
      </div>
    `}static renderEnvironmentTab(t,e,r){const i=t.environmentData,a=Object.entries(e).map(([t,e])=>({id:t,name:e}));return R`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Select Target</h3>
             <div class="md3-input-group">
                <label class="md3-label">Growspace</label>
                <select class="md3-input" .value=${i.selectedGrowspaceId} @change=${t=>r.onEnvChange("selectedGrowspaceId",t.target.value)}>
                   <option value="">Select...</option>
                   ${a.map(t=>R`<option value="${t.id}">${t.name}</option>`)}
                </select>
             </div>
          </div>

          <div class="detail-card">
             <h3>Sensors</h3>
             ${this.renderMD3TextInput("Temperature Sensor ID",i.temp_sensor,t=>r.onEnvChange("temp_sensor",t))}
             ${this.renderMD3TextInput("Humidity Sensor ID",i.humidity_sensor,t=>r.onEnvChange("humidity_sensor",t))}
             ${this.renderMD3TextInput("VPD Sensor ID",i.vpd_sensor,t=>r.onEnvChange("vpd_sensor",t))}
          </div>

          <div class="detail-card">
             <h3>Optional</h3>
             ${this.renderMD3TextInput("CO2 Sensor ID",i.co2_sensor,t=>r.onEnvChange("co2_sensor",t))}
             ${this.renderMD3TextInput("Light Sensor/State ID",i.light_sensor,t=>r.onEnvChange("light_sensor",t))}
             ${this.renderMD3TextInput("Fan Switch ID",i.fan_switch,t=>r.onEnvChange("fan_switch",t))}
          </div>
       </div>
    `}static renderGlobalTab(t,e){const r=t.globalData;return R`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Global Environment</h3>
             ${this.renderMD3TextInput("Weather Entity ID",r.weather_entity,t=>e.onGlobalChange("weather_entity",t))}
          </div>
          <div class="detail-card">
             <h3>Lung Room</h3>
             ${this.renderMD3TextInput("Lung Room Temp Sensor",r.lung_room_temp,t=>e.onGlobalChange("lung_room_temp",t))}
             ${this.renderMD3TextInput("Lung Room Humidity Sensor",r.lung_room_humidity,t=>e.onGlobalChange("lung_room_humidity",t))}
          </div>
       </div>
    `}}let es=class extends ot{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._strainLibraryDialog=null,this._configDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1,this._historyData=null,this._lightCycleCollapsed=!0,this._activeEnvGraphs=new Set,this._tooltip=null,this._handleTakeClone=t=>{const e=t.attributes?.plant_id||t.entity_id.replace("sensor.","");this.hass.callService("growspace_manager","take_clone",{mother_plant_id:e}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})},this.clonePlant=(t,e)=>{const r=t.attributes?.plant_id||t.entity_id.replace("sensor.",""),i=e;this.hass.callService("growspace_manager","take_clone",{mother_plant_id:r,num_clones:i}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})}}firstUpdated(){this.dataService=new Xa(this.hass),this.initializeSelectedDevice(),this._fetchHistory()}updated(t){super.updated(t),t.has("selectedDevice")&&this._fetchHistory()}async _fetchHistory(){if(!this.hass||!this.selectedDevice)return;const t=this.dataService.getGrowspaceDevices().find(t=>t.device_id===this.selectedDevice);if(!t)return;let e=t.name.toLowerCase().replace(/\s+/g,"_");t.overview_entity_id&&(e=t.overview_entity_id.replace("sensor.",""));const r=`binary_sensor.${e}_optimal_conditions`,i=new Date,a=new Date(i.getTime()-864e5);try{const t=await this.dataService.getHistory(r,a,i);this._historyData=t}catch(t){console.error("Failed to fetch history",t)}}initializeSelectedDevice(){const t=this.dataService.getGrowspaceDevices();if(t.length&&!this.selectedDevice){if(this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);if(e)return void(this.selectedDevice=e.device_id)}this.selectedDevice=t[0].device_id}}static async getConfigElement(){await Promise.resolve().then(function(){return is});return document.createElement("growspace-manager-card-editor")}static getStubConfig(){return{default_growspace:"4x4",compact:!0}}setConfig(t){if(!t)throw new Error("Invalid configuration");this._config=t,void 0!==this._config.compact&&(this._isCompactView=this._config.compact)}getCardSize(){return 4}_handleDeviceChange(t){const e=t.target;this.selectedDevice=e.value}_handlePlantClick(t){this._plantOverviewDialog={open:!0,plant:t,editedAttributes:{...t.attributes}}}getHaDateTimeString(){const t=this.hass.config.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone;return Ya.now().setZone(t).toFormat("yyyy-LL-dd'T'HH:mm")}_openAddPlantDialog(t,e){const r=this.getHaDateTimeString(),i=this.dataService.getStrainLibrary(),a=i.length>0?i[0].strain:"",s=i.length>0?i[0].phenotype:"";this._addPlantDialog={open:!0,row:t,col:e,strain:a,phenotype:s,veg_start:r,flower_start:r}}async _confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const{row:t,col:e,strain:r,phenotype:i,veg_start:a,flower_start:s}=this._addPlantDialog;try{const n={growspace_id:this.selectedDevice,row:t+1,col:e+1,strain:r,phenotype:i,veg_start:Ka.formatDateForBackend(a)??Ka.formatDateForBackend(Ka.getCurrentDateTime()),flower_start:Ka.formatDateForBackend(s)??Ka.formatDateForBackend(Ka.getCurrentDateTime())};console.log("Adding plant to growspace:",this.selectedDevice,n),console.log("Adding plant:",n),await this.dataService.addPlant(n),this._addPlantDialog=null}catch(t){console.error("Error adding plant:",t)}}async _updatePlant(){if(!this._plantOverviewDialog)return;const{plant:t,editedAttributes:e}=this._plantOverviewDialog,r={plant_id:t.attributes?.plant_id||t.entity_id.replace("sensor.","")},i=["seedling_start","mother_start","clone_start","veg_start","flower_start","dry_start","cure_start"];["strain","phenotype","row","col",...i].forEach(t=>{if(void 0!==e[t]&&null!==e[t])if(i.includes(t)){const i=Ka.formatDateForBackend(String(e[t]));i&&(r[t]=i)}else r[t]=e[t]});try{await this.dataService.updatePlant(r),this._plantOverviewDialog=null}catch(t){console.error("Error updating plant:",t)}}async _handleDeletePlant(t){if(confirm("Are you sure you want to delete this plant?"))try{await this.dataService.removePlant(t),this._plantOverviewDialog=null}catch(t){console.error("Error deleting plant:",t)}}async _movePlantToNextStage(t){if(!this._plantOverviewDialog?.plant)return void console.error("No plant found in overview dialog");const e=this._plantOverviewDialog.plant,r=e.attributes?.stage;let i="";const a=new Set(["mother","flower","dry","cure"]);if(r&&a.has(r)){"flower"===r?i="dry":"dry"===r?i="cure":"mother"===r?i="clone":(console.error("Unknown stage, cannot move plant",i),i="error");try{const t=e.attributes?.plant_id||e.entity_id.replace("sensor.","");await this.dataService.harvestPlant(t,i),this._plantOverviewDialog=null}catch(t){console.error("Error moving plant to next stage:",t)}}else alert("Plant must be in mother or flower or dry or cure stage to move. stage is "+r)}async _harvestPlant(t){await this._movePlantToNextStage(t)}async _finishDryingPlant(t){await this._movePlantToNextStage(t)}_openStrainLibraryDialog(){const t=this.dataService.getStrainLibrary();this._strainLibraryDialog={open:!0,view:"browse",strains:t,searchQuery:"",editorState:this._createEmptyEditorState()}}_createEmptyEditorState(){return{strain:"",phenotype:"",breeder:"",type:"",flowering_min:"",flowering_max:"",lineage:"",sex:"",description:"",image:"",image_crop_meta:void 0}}_switchStrainView(t,e){this._strainLibraryDialog&&(this._strainLibraryDialog.view=t,this._strainLibraryDialog.isCropping=!1,"editor"===t&&(this._strainLibraryDialog.editorState=e?{strain:e.strain,phenotype:e.phenotype||"",breeder:e.breeder||"",type:e.type||"",flowering_min:e.flowering_days_min?.toString()||"",flowering_max:e.flowering_days_max?.toString()||"",lineage:e.lineage||"",sex:e.sex||"",description:e.description||"",image:e.image||"",image_crop_meta:e.image_crop_meta}:this._createEmptyEditorState()),this.requestUpdate())}_handleStrainEditorChange(t,e){this._strainLibraryDialog&&this._strainLibraryDialog.editorState&&(this._strainLibraryDialog.editorState[t]=e,this.requestUpdate())}_toggleCropMode(t){this._strainLibraryDialog&&(this._strainLibraryDialog.isCropping=t,this.requestUpdate())}_toggleImageSelector(t){this._strainLibraryDialog&&(this._strainLibraryDialog.isImageSelectorOpen=t,this.requestUpdate())}_handleSelectLibraryImage(t){this._strainLibraryDialog&&this._strainLibraryDialog.editorState&&(this._strainLibraryDialog.editorState.image=t,this._strainLibraryDialog.isImageSelectorOpen=!1,this.requestUpdate())}_toggleLightCycle(){this._lightCycleCollapsed=!this._lightCycleCollapsed}_toggleEnvGraph(t){const e=new Set(this._activeEnvGraphs);e.has(t)?e.delete(t):e.add(t),this._activeEnvGraphs=e,this.requestUpdate()}_handleGraphHover(t,e,r,i,a){const s=t.clientX-i.left,n=i.width,o=new Date,l=new Date(o.getTime()-864e5).getTime(),c=l+s/n*(o.getTime()-l);let d=r[0],u=Math.abs(c-d.time);for(let t=1;t<r.length;t++){const e=Math.abs(c-r[t].time);e<u&&(u=e,d=r[t])}const h=new Date(c).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).toLowerCase();let p=`${d.value} ${a}`;"state"===a&&(p=1===d.value?"ON":"OFF"),this._tooltip={id:e,x:s,time:h,value:p}}renderEnvGraph(t,e,r,i){if(!this._historyData||0===this._historyData.length)return R``;const a=[...this._historyData].sort((t,e)=>new Date(t.last_changed).getTime()-new Date(e.last_changed).getTime()),s=new Date,n=new Date(s.getTime()-864e5),o=[];if(a.forEach(e=>{const r=new Date(e.last_changed).getTime();if(r<n.getTime())return;const i=((t,e)=>{if(t&&t.attributes)return void 0!==t.attributes[e]?t.attributes[e]:t.attributes.observations&&"object"==typeof t.attributes.observations?t.attributes.observations[e]:void 0})(e,t);void 0===i||isNaN(parseFloat(i))||o.push({time:r,value:parseFloat(i)})}),o.length<2)return R``;const l=Math.min(...o.map(t=>t.value)),c=Math.max(...o.map(t=>t.value)),d=c-l||1,u=l-.1*d,h=c+.1*d-u,p=o.map(t=>[(t.time-n.getTime())/864e5*1e3,100-(t.value-u)/h*100]),g=`M ${p.map(t=>`${t[0]},${t[1]}`).join(" L ")}`;return R`
      <div class="gs-light-cycle-card" style="margin-top: 12px; border: 1px solid ${e}40;">
         <div class="gs-light-header-row" @click=${()=>this._toggleEnvGraph(t)}>
             <div class="gs-light-title" style="font-size: 1.2rem;">
                 <div class="gs-icon-box" style="color: ${e}; background: ${e}10; border-color: ${e}30; width: 36px; height: 36px;">
                      <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Dt}"></path></svg>
                 </div>
                 <div>
                    <div>${r}</div>
                    <div class="gs-light-subtitle">24H HISTORY • ${l.toFixed(1)} - ${c.toFixed(1)} ${i}</div>
                 </div>
             </div>
             <div style="opacity: 0.7;">
                <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ft}"></path></svg>
             </div>
         </div>

         <div class="gs-chart-container" style="height: 100px;"
              @mousemove=${e=>{const r=e.currentTarget.getBoundingClientRect();this._handleGraphHover(e,t,o,r,i)}}
              @mouseleave=${()=>this._tooltip=null}>

             ${this._tooltip&&this._tooltip.id===t?R`
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
                 <path class="chart-line" d="${g}" style="stroke: ${e};" />
                 <path class="chart-gradient-fill" d="${g} V 100 H 0 Z" style="fill: url(#grad-${t});" />
             </svg>
             <div class="chart-markers">
                <span>-24H</span>
                <span>NOW</span>
             </div>
         </div>
      </div>
    `}_setStrainSearchQuery(t){this._strainLibraryDialog&&(this._strainLibraryDialog.searchQuery=t,this.requestUpdate())}_toggleAddStrainForm(){}_promptClearAll(){}_cancelClearAll(){}async _addStrain(){if(!this._strainLibraryDialog?.editorState?.strain)return;const t=this._strainLibraryDialog.editorState,e={strain:t.strain,phenotype:t.phenotype,breeder:t.breeder,type:t.type,flowering_days_min:t.flowering_min?parseInt(t.flowering_min):void 0,flowering_days_max:t.flowering_max?parseInt(t.flowering_max):void 0,lineage:t.lineage,sex:t.sex,description:t.description,image:t.image,image_crop_meta:t.image_crop_meta};try{await this.dataService.addStrain(e);const r=`${t.strain}|${t.phenotype||"default"}`,i={key:r,strain:t.strain,phenotype:t.phenotype,breeder:t.breeder,type:t.type,flowering_days_min:e.flowering_days_min,flowering_days_max:e.flowering_days_max,lineage:t.lineage,sex:t.sex,description:t.description,image:t.image,image_crop_meta:t.image_crop_meta};this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(t=>t.key!==r),this._strainLibraryDialog.strains.push(i),this._switchStrainView("browse")}catch(t){console.error("Error adding strain:",t)}}async _removeStrain(t){if(this._strainLibraryDialog)try{const e=t.split("|"),r=e[0],i=e.length>1&&"default"!==e[1]?e[1]:void 0;await this.dataService.removeStrain(r,i),this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e.key!==t),this.requestUpdate()}catch(t){console.error("Error removing strain:",t)}}async _clearStrains(){await this.dataService.clearStrainLibrary(),this._strainLibraryDialog&&(this._strainLibraryDialog.strains=[],this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate())}updateGrid(){this.dataService=new Xa(this.hass),this.requestUpdate()}_handleDragStart(t,e){this._draggedPlant=e,t.dataTransfer?.setData("text/plain",JSON.stringify({id:e.entity_id}));t.target.classList.add("dragging")}_handleDragEnd(t){t.target.classList.remove("dragging")}_handleDragOver(t){t.preventDefault()}async _handleDrop(t,e,r,i){if(t.preventDefault(),!this._draggedPlant||!this.selectedDevice)return;const a=this._draggedPlant;this._draggedPlant=null;try{if(i){const t=a.attributes.plant_id||a.entity_id.replace("sensor.",""),e=i.attributes.plant_id||i.entity_id.replace("sensor.","");await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e}),this.updateGrid()}else await this._movePlant(a,e,r)}catch(t){console.error("Error during drag-and-drop:",t)}}async _movePlant(t,e,r){try{const i=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.dataService.updatePlant({plant_id:i,row:e,col:r})}catch(t){console.error("Error moving plant:",t)}}_moveClonePlant(t,e){this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Moved clone ${t.attributes.friendly_name} to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})}_openConfigDialog(){this._configDialog={open:!0,currentTab:"add_growspace",addGrowspaceData:{name:"",rows:3,plants_per_row:3,notification_service:""},environmentData:{selectedGrowspaceId:"",temp_sensor:"",humidity_sensor:"",vpd_sensor:"",co2_sensor:"",light_sensor:"",fan_switch:""},globalData:{weather_entity:"",lung_room_temp:"",lung_room_humidity:""}}}_handleAddGrowspaceSubmit(){if(!this._configDialog)return;const t=this._configDialog.addGrowspaceData;t.name?this.dataService.addGrowspace(t).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(t=>alert(`Error: ${t.message}`)):alert("Name is required")}_handleEnvSubmit(){if(!this._configDialog)return;const t=this._configDialog.environmentData;t.selectedGrowspaceId&&t.temp_sensor&&t.humidity_sensor&&t.vpd_sensor?this.dataService.configureGrowspaceSensors({growspace_id:t.selectedGrowspaceId,temperature_sensor:t.temp_sensor,humidity_sensor:t.humidity_sensor,vpd_sensor:t.vpd_sensor,co2_sensor:t.co2_sensor||void 0,light_sensor:t.light_sensor||void 0,fan_switch:t.fan_switch||void 0}).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(t=>alert(`Error: ${t.message}`)):alert("Growspace and required sensors (Temp, Hum, VPD) are mandatory")}_handleGlobalSubmit(){if(!this._configDialog)return;const t=this._configDialog.globalData;this.dataService.configureGlobalSettings(t).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(t=>alert(`Error: ${t.message}`))}render(){if(!this.hass)return R`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;this.dataService=new Xa(this.hass);const t=this.dataService.getGrowspaceDevices();if(!t.length)return R`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;if(!this._defaultApplied&&this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);e&&(this.selectedDevice=e.device_id),this._defaultApplied=!0}this.selectedDevice&&t.find(t=>t.device_id===this.selectedDevice)||(this.selectedDevice=t[0].device_id);const e=t.find(t=>t.device_id===this.selectedDevice);if(!e)return R`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;const r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;r&&Object.entries(r).forEach(([t,e])=>{});const i=Ka.calculateEffectiveRows(e),{grid:a}=Ka.createGridLayout(e.plants,i,e.plants_per_row),s=e.plants_per_row>6;return R`
      <ha-card class=${s?"wide-growspace":""}>
        <div class="unified-growspace-card">
          ${this.renderHeader(t)}
          ${this._isCompactView?"":this.renderGrowspaceHeader(e)}
          ${this.renderGrid(a,i,e.plants_per_row)}
        </div>
      </ha-card>
      
      ${this.renderDialogs()}
    `}renderGrowspaceHeader(t){const e=Ka.getDominantStage(t.plants),r=this.dataService.getGrowspaceDevices();let i=t.name.toLowerCase().replace(/\s+/g,"_");t.overview_entity_id&&(i=t.overview_entity_id.replace("sensor.",""));const a=`binary_sensor.${i}_optimal_conditions`,s=this.hass.states[a],n=(t,e)=>{if(t&&t.attributes)return void 0!==t.attributes[e]?t.attributes[e]:t.attributes.observations&&"object"==typeof t.attributes.observations?t.attributes.observations[e]:void 0},o=n(s,"temperature"),l=n(s,"humidity"),c=n(s,"vpd"),d=n(s,"co2"),u=n(s,"is_lights_on"),h=null!=u,p=!0===u;let g="",m="--:--",f="--:--",v="",y="";const b=t.plants.some(t=>"flower"===t.attributes.stage),w=b?"12/12 Cycle":"18/6 Cycle";let x=[];if(this._historyData&&this._historyData.length>0){const t=[...this._historyData].sort((t,e)=>new Date(t.last_changed).getTime()-new Date(e.last_changed).getTime()),e=new Date,r=new Date(e.getTime()-864e5),i=1e3,a=100,s=[];let o=t.length>0?!0!==n(t[0],"is_lights_on"):p;t.forEach(t=>{const e=new Date(t.last_changed).getTime(),i=!0===n(t,"is_lights_on");e>=r.getTime()&&x.push({time:e,state:i})}),o=x.length>0?!x[0].state:p,s.push([0,o?0:a]),x.forEach(t=>{const e=(t.time-r.getTime())/864e5*i;s.push([e,o?0:a]),o=t.state,s.push([e,o?0:a])}),s.push([i,o?0:a]),g=`M ${s.map(t=>`${t[0]},${t[1]}`).join(" L ")}`;const l=[...t].reverse(),c=l.find(t=>!0===n(t,"is_lights_on"));if(c){const t=new Date(c.last_changed);m=t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).replace(/ [AP]M/,""),v=t.toLocaleTimeString([],{hour12:!0}).slice(-2)}const d=l.find(t=>!1===n(t,"is_lights_on"));if(d){const t=new Date(d.last_changed);f=t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).replace(/ [AP]M/,""),y=t.toLocaleTimeString([],{hour12:!0}).slice(-2)}}return R`
      <div class="gs-stats-container">
         <div class="gs-header-top">
            <div class="gs-title-group">
               <!-- Title as Dropdown if no default is set -->
               ${this._config?.default_growspace?R`
                 <h3 class="gs-title">${t.name}</h3>
               `:R`
                 <select class="growspace-select-header" .value=${this.selectedDevice||""} @change=${this._handleDeviceChange}>
                    ${r.map(t=>R`<option value="${t.device_id}">${t.name}</option>`)}
                 </select>
               `}

               ${e?R`
               <div class="gs-stage-chip">
                 <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ka.getPlantStageIcon(e.stage)}"></path></svg>
                 ${e.stage.charAt(0).toUpperCase()+e.stage.slice(1)} • Day ${e.days}
               </div>
               `:""}
            </div>

            <div class="gs-stats-chips">
                ${void 0!==o?R`
                   <div class="stat-chip ${this._activeEnvGraphs.has("temperature")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("temperature")}>
                     <svg viewBox="0 0 24 24"><path d="${At}"></path></svg>${o}°C
                   </div>`:""}
                ${void 0!==l?R`
                   <div class="stat-chip ${this._activeEnvGraphs.has("humidity")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("humidity")}>
                     <svg viewBox="0 0 24 24"><path d="${"M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z"}"></path></svg>${l}%
                   </div>`:""}
                ${void 0!==c?R`
                   <div class="stat-chip ${this._activeEnvGraphs.has("vpd")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("vpd")}>
                     <svg viewBox="0 0 24 24"><path d="${"M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20M6.5 18H18.5Q19.55 18 20.27 17.27 21 16.55 21 15.5 21 14.45 20.27 13.73 19.55 13 18.5 13H17V11Q17 8.93 15.54 7.46 14.08 6 12 6 9.93 6 8.46 7.46 7 8.93 7 11H6.5Q5.05 11 4.03 12.03 3 13.05 3 14.5 3 15.95 4.03 17 5.05 18 6.5 18M12 12Z"}"></path></svg>${c} kPa
                   </div>`:""}
                ${void 0!==d?R`
                   <div class="stat-chip ${this._activeEnvGraphs.has("co2")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("co2")}>
                     <svg viewBox="0 0 24 24"><path d="${"M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z"}"></path></svg>${d} ppm
                   </div>`:""}

                ${this._isCompactView?"":R`
                   <div class="stat-chip" @click=${this._openStrainLibraryDialog} title="Strain Library">
                      <svg viewBox="0 0 24 24"><path d="${_t}"></path></svg>
                      Strains
                   </div>

                   <div class="stat-chip" @click=${this._openConfigDialog} title="Configure">
                      <svg viewBox="0 0 24 24"><path d="${bt}"></path></svg>
                      Config
                   </div>

                   <div class="stat-chip" @click=${()=>this._isCompactView=!0} title="Switch to Compact Mode">
                       <svg viewBox="0 0 24 24"><path d="${Dt}"></path></svg>
                       Compact
                   </div>
                `}
            </div>
         </div>

         <!-- Nested Light Cycle Card -->
         ${h?R`
         <div class="gs-light-cycle-card ${this._lightCycleCollapsed?"collapsed":""}">
            <div class="gs-light-header-row" @click=${()=>this._toggleLightCycle()}>
                <div class="gs-light-title">
                    <div class="gs-icon-box">
                       <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Lt}"></path></svg>
                    </div>
                    <div>
                       <div>Light Cycle</div>
                       ${this._lightCycleCollapsed?"":R`<div class="gs-light-subtitle">24H HISTORY</div>`}
                    </div>
                </div>

                ${s?R`
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div>
                        <div class="light-status-chip ${p?"on":"off"}">
                           <div class="light-status-text">
                               <div class="status-dot"></div>
                               ${p?"ON":"OFF"}
                           </div>
                        </div>
                        ${this._lightCycleCollapsed?"":R`<div class="target-cycle-text">Target: ${w}</div>`}
                    </div>
                    <div class="rotate-icon ${this._lightCycleCollapsed?"":"expanded"}" style="opacity: 0.7;">
                        <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ft}"></path></svg>
                    </div>
                </div>
                `:""}
            </div>

            ${this._lightCycleCollapsed?"":R`
            <div class="gs-chart-container"
                @mousemove=${t=>{const e=t.currentTarget.getBoundingClientRect(),r=new Date,i=new Date(r.getTime()-864e5),a=x.map(t=>({time:t.time,value:t.state?1:0}));0===a.length||(a[0].time,i.getTime()),this._handleGraphHover(t,"light-cycle",a,e,"state")}}
                @mouseleave=${()=>this._tooltip=null}
            >
                ${this._tooltip&&"light-cycle"===this._tooltip.id?R`
                    <div class="gs-cursor-line" style="left: ${this._tooltip.x}px;"></div>
                    <div class="gs-tooltip" style="left: ${this._tooltip.x}px;">
                        <div class="time">${this._tooltip.time}</div>
                        <div>${this._tooltip.value}</div>
                    </div>
                `:""}

                <svg class="gs-chart-svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color:var(--primary-light-color, #FFEB3B);stop-opacity:0.5" />
                            <stop offset="100%" style="stop-color:var(--primary-light-color, #FFEB3B);stop-opacity:0" />
                        </linearGradient>
                    </defs>
                    <path class="chart-line" d="${g}" />
                    <path class="chart-gradient-fill" d="${g} V 100 H 0 Z" />
                </svg>
                <div class="chart-markers">
                   <span>-24H</span>
                   <span>-18H</span>
                   <span>-12H</span>
                   <span>-6H</span>
                   <span>NOW</span>
                </div>
            </div>

            <!-- Bottom Cards -->
            <div class="gs-action-cards">
                <div class="action-card">
                    <div class="ac-content">
                        <div class="ac-icon on">
                            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Lt}"></path></svg>
                        </div>
                        <div class="ac-text">
                            <h4>LIGHT ON</h4>
                            <div class="time">${m} <span>${v}</span></div>
                        </div>
                    </div>
                    <div class="ac-arrow">
                        <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
                    </div>
                </div>

                <div class="action-card">
                    <div class="ac-content">
                        <div class="ac-icon off">
                            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ot}"></path></svg>
                        </div>
                        <div class="ac-text">
                            <h4>LIGHT OFF</h4>
                            <div class="time">${f} <span>${y}</span></div>
                        </div>
                    </div>
                    <div class="ac-arrow">
                         <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
                    </div>
                </div>
            </div>
            `}
         </div>
         `:""}

         <!-- Active Environmental Graphs -->
         ${this._activeEnvGraphs.has("temperature")?this.renderEnvGraph("temperature","#FF5722","Temperature","°C"):""}
         ${this._activeEnvGraphs.has("humidity")?this.renderEnvGraph("humidity","#2196F3","Humidity","%"):""}
         ${this._activeEnvGraphs.has("vpd")?this.renderEnvGraph("vpd","#9C27B0","VPD","kPa"):""}
         ${this._activeEnvGraphs.has("co2")?this.renderEnvGraph("co2","#90A4AE","CO2","ppm"):""}

      </div>
    `}renderHeader(t){return this._isCompactView||this._config?.title?(t.find(t=>t.device_id===this.selectedDevice),R`
      <div class="header">
        ${this._config?.title?R`<h2 class="header-title">${this._config.title}</h2>`:""}
        
        ${this._isCompactView?R`
        <div class="selector-container">
          ${this._config?.default_growspace?R`
            <label for="device-select">Growspace:</label>
            <!-- Even if default is set, user wants dropdown in compact mode -->
            <select
              id="device-select"
              class="growspace-select"
              .value=${this.selectedDevice||""}
              @change=${this._handleDeviceChange}
            >
              ${t.map(t=>R`<option value="${t.device_id}">${t.name}</option>`)}
            </select>
          `:R`
            <label for="device-select">Growspace:</label>
            <select 
              id="device-select" 
              class="growspace-select"
              .value=${this.selectedDevice||""} 
              @change=${this._handleDeviceChange}
            >
              ${t.map(t=>R`<option value="${t.device_id}">${t.name}</option>`)}
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
              <path d="${_t}"></path>
            </svg>
            Strains
          </button>
        </div>
        `:""}
      </div>
    `):R``}renderGrid(t,e,r){return R`
      <div class="grid ${this._isCompactView?"compact":""}" 
           style="grid-template-columns: repeat(${r}, 1fr); grid-template-rows: repeat(${e}, 1fr);">
        ${t.flat().map((t,e)=>{const i=Math.floor(e/r)+1,a=e%r+1;return t?this.renderPlantSlot(t,i,a):this.renderEmptySlot(i,a)})}
      </div>
    `}renderEmptySlot(t,e){return R`
      <div 
        class="plant empty" 
        style="grid-row: ${t}; grid-column: ${e}" 
        @click=${()=>this._openAddPlantDialog(t-1,e-1)}
        @dragover=${this._handleDragOver}
        @drop=${r=>this._handleDrop(r,t,e,null)}
      >
        <div class="plant-header">
          <svg class="plant-icon" viewBox="0 0 24 24">
            <path d="${kt}"></path>
          </svg>
        </div>
        <div class="plant-name">Add Plant</div>
        <div class="plant-stage">Empty Slot</div>
      </div>
    `}renderPlantSlot(t,e,r){const i=Ka.getPlantStageColor(t.state),a=Ka.getPlantStageIcon(t.state);return R`
      <div 
        class="plant" 
        style="grid-row: ${e}; grid-column: ${r}; --stage-color: ${i}" 
        draggable="true"
        @dragstart=${e=>this._handleDragStart(e,t)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${i=>this._handleDrop(i,e,r,t)}
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
    `}renderPlantDays(t){const e=[{days:t.attributes?.seedling_days,icon:Tt,title:"Days in Seedling",stage:"seedling"},{days:t.attributes?.mother_days,icon:Tt,title:"Days in Mother",stage:"mother"},{days:t.attributes?.clone_days,icon:Tt,title:"Days in Clone",stage:"clone"},{days:t.attributes?.veg_days,icon:Tt,title:"Days in Vegetative",stage:"vegetative"},{days:t.attributes?.flower_days,icon:$t,title:"Days in Flower",stage:"flower"},{days:t.attributes?.dry_days,icon:St,title:"Days in Dry",stage:"dry"},{days:t.attributes?.cure_days,icon:gt,title:"Days in Cure",stage:"cure"}].filter(t=>t.days);return e.length?R`
      <div class="plant-days">
        ${e.map(({days:t,icon:e,title:r,stage:i})=>{const a=Ka.getPlantStageColor(i);return R`
            <span title="${r}" style="color: ${a}">
              <svg style="width: 2rem;height: 2rem;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${e}"></path>
              </svg>
              ${t}d
            </span>
          `})}
      </div>
    `:R``}renderDialogs(){const t=this.dataService?.getStrainLibrary()||[],e={},r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;return r&&Object.entries(r).forEach(([t,r])=>{e[t]=r}),R`
      ${ts.renderAddPlantDialog(this._addPlantDialog,t,{onClose:()=>this._addPlantDialog=null,onConfirm:()=>this._confirmAddPlant(),onStrainChange:e=>{if(this._addPlantDialog){this._addPlantDialog.strain=e;const r=t.find(t=>t.strain===e);r&&r.phenotype?this._addPlantDialog.phenotype=r.phenotype:this._addPlantDialog.phenotype="",this.requestUpdate()}},onPhenotypeChange:t=>{this._addPlantDialog&&(this._addPlantDialog.phenotype=t)},onVegStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.veg_start=t)},onFlowerStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.flower_start=t)},onRowChange:t=>{if(this._addPlantDialog){const e=parseInt(t);!isNaN(e)&&e>0&&(this._addPlantDialog.row=e-1,this.requestUpdate())}},onColChange:t=>{if(this._addPlantDialog){const e=parseInt(t);!isNaN(e)&&e>0&&(this._addPlantDialog.col=e-1,this.requestUpdate())}}})}

      ${ts.renderPlantOverviewDialog(this._plantOverviewDialog,e,{onClose:()=>this._plantOverviewDialog=null,onUpdate:()=>{this._updatePlant()},onDelete:t=>{this._handleDeletePlant(t)},onHarvest:t=>{this._harvestPlant(t)},onClone:(t,e)=>{this.clonePlant(t,e)},onTakeClone:(t,e)=>{this.clonePlant(t,e)},onMoveClone:(t,e)=>{this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Clone ${t.attributes.friendly_name} moved to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})},onFinishDrying:t=>{this._finishDryingPlant(t)},_harvestPlant:this._harvestPlant.bind(this),_finishDryingPlant:this._finishDryingPlant.bind(this),onAttributeChange:(t,e)=>{this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes[t]=e)}})}

      ${ts.renderStrainLibraryDialog(this._strainLibraryDialog,{onClose:()=>this._strainLibraryDialog=null,onAddStrain:()=>this._addStrain(),onRemoveStrain:t=>this._removeStrain(t),onClearAll:()=>this._clearStrains(),onEditorChange:(t,e)=>this._handleStrainEditorChange(t,e),onSwitchView:(t,e)=>this._switchStrainView(t,e),onSearch:t=>this._setStrainSearchQuery(t),onToggleCropMode:t=>this._toggleCropMode(t),onToggleImageSelector:t=>this._toggleImageSelector(t),onSelectLibraryImage:t=>this._handleSelectLibraryImage(t)})}

      ${ts.renderConfigDialog(this._configDialog,e,{onClose:()=>this._configDialog=null,onSwitchTab:t=>{this._configDialog&&(this._configDialog.currentTab=t,this.requestUpdate())},onAddGrowspaceChange:(t,e)=>{this._configDialog&&(this._configDialog.addGrowspaceData[t]=e,this.requestUpdate())},onAddGrowspaceSubmit:()=>this._handleAddGrowspaceSubmit(),onEnvChange:(t,e)=>{this._configDialog&&(this._configDialog.environmentData[t]=e,this.requestUpdate())},onEnvSubmit:()=>this._handleEnvSubmit(),onGlobalChange:(t,e)=>{this._configDialog&&(this._configDialog.globalData[t]=e,this.requestUpdate())},onGlobalSubmit:()=>this._handleGlobalSubmit()})}
    `}};es.styles=[Qa,o`
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
        /* Fallback */
        background: rgba(30, 30, 35, 0.6);
        /* Gradient approximating the screenshot */
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
        cursor: pointer;
        transition: all 0.2s;
      }

      .stat-chip:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .stat-chip.active {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
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
        color: var(--primary-light-color);
      }

      .light-status-chip.off {
         color: rgba(255, 255, 255, 0.7);
      }

      /* 24h Chart */
      .gs-chart-container {
         margin-top: 8px;
         height: 150px;
         position: relative;
         width: 100%;
      }

      .gs-chart-svg {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 0 4px rgba(255, 235, 59, 0.2));
      }

      .chart-line {
        fill: none;
        stroke: var(--primary-light-color, #FFEB3B);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .chart-gradient-fill {
        fill: url(#gradient);
        opacity: 0.2;
      }

      /* Time markers for chart */
      .chart-markers {
         display: flex;
         justify-content: space-between;
         margin-top: -24px;
         padding: 0 10px;
         font-size: 0.75rem;
         color: rgba(255, 255, 255, 0.3);
         font-weight: 500;
         position: relative;
         z-index: 2;
         pointer-events: none;
      }

      .gs-tooltip {
        position: absolute;
        top: 10px;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        pointer-events: none;
        transform: translate(-50%, 0);
        z-index: 10;
        white-space: nowrap;
        border: 1px solid rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        line-height: 1.2;
        text-align: center;
      }
      .gs-tooltip .time {
        font-weight: bold;
        color: var(--primary-light-color);
        margin-bottom: 2px;
      }

      .gs-cursor-line {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(255, 255, 255, 0.3);
        pointer-events: none;
        z-index: 5;
        border-left: 1px dashed rgba(255, 255, 255, 0.5);
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
        transition: all 0.3s ease;
      }

      .gs-light-cycle-card.collapsed {
        padding: 12px 20px;
        gap: 0;
      }

      .gs-light-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        cursor: pointer;
      }

      .gs-light-cycle-card.collapsed .gs-light-header-row {
        margin-bottom: 0;
      }

      .gs-light-title {
         font-size: 1.5rem;
         font-weight: 600;
         display: flex;
         align-items: center;
         gap: 12px;
         color: #fff;
      }

      .gs-icon-box {
        background: rgba(255, 235, 59, 0.05);
        border: 1px solid rgba(255, 235, 59, 0.2);
        border-radius: 14px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-light-color);
      }

      .gs-light-subtitle {
        font-size: 0.75rem;
        opacity: 0.5;
        font-weight: 500;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-top: 4px;
      }

      .light-status-text {
         font-size: 1.5rem;
         font-weight: 700;
         display: flex;
         align-items: center;
         gap: 8px;
      }

      .status-dot {
         width: 8px;
         height: 8px;
         border-radius: 50%;
         background: currentColor;
         box-shadow: 0 0 8px currentColor;
      }

      .target-cycle-text {
         font-size: 0.9rem;
         opacity: 0.5;
         text-align: right;
         margin-top: 4px;
      }

      /* Bottom Action Cards */
      .gs-action-cards {
        display: flex;
        gap: 16px;
        margin-top: 8px;
      }

      .action-card {
         flex: 1;
         background: rgba(255, 255, 255, 0.05);
         border: 1px solid rgba(255, 255, 255, 0.05);
         border-radius: 16px;
         padding: 16px;
         display: flex;
         align-items: center;
         justify-content: space-between;
         cursor: default; /* Or pointer if clickable */
      }

      .ac-content {
         display: flex;
         align-items: center;
         gap: 12px;
      }

      .ac-icon {
         width: 40px;
         height: 40px;
         border-radius: 50%;
         display: flex;
         align-items: center;
         justify-content: center;
      }

      .ac-icon.on {
         background: rgba(255, 235, 59, 0.1);
         color: var(--primary-light-color);
      }

      .ac-icon.off {
         background: rgba(120, 144, 156, 0.1);
         color: #90a4ae;
      }

      .ac-text h4 {
         margin: 0;
         font-size: 0.7rem;
         text-transform: uppercase;
         opacity: 0.5;
         letter-spacing: 0.5px;
      }

      .ac-text .time {
         font-size: 1.2rem;
         font-weight: 600;
         color: #fff;
      }

      .ac-text .time span {
         font-size: 0.9rem;
         font-weight: 400;
         opacity: 0.7;
         margin-left: 2px;
      }

      .ac-arrow {
         opacity: 0.3;
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
      }

      .grid.compact {
        gap: var(--spacing-sm);
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
         transform: rotate(180deg);
      }

      @media (max-width: 600px) {
        .header {
          flex-direction: column;
          align-items: stretch;
        }
        .selector-container {
          justify-content: center;
        }
        /* Switch Grid to List View */
        .grid {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          grid-template-columns: 1fr !important;
          grid-template-rows: auto !important;
        }
        .plant {
          min-height: auto;
          aspect-ratio: unset;
          display: grid;
          grid-template-columns: 48px 1fr auto;
          grid-template-rows: auto auto;
          grid-template-areas:
            "icon name stage"
            "icon phenotype days";
          padding: 12px;
          gap: 4px 12px;
          text-align: left;
        }
        .plant-name, .plant-phenotype, .plant-stage, .plant-days {
          text-align: left;
          min-height: 0;
          margin: 0;
        }
        .plant-header {
          justify-content: center; /* Icon stays centered in its box */
        }
        .plant-name {
          font-size: 1rem;
          align-self: end;
        }
        .plant-phenotype {
          font-size: 0.85rem;
          align-self: start;
        }
        .plant-stage {
          font-size: 0.85rem;
          text-align: right;
          align-self: end;
        }
        .plant-days {
          justify-content: flex-end;
          font-size: 0.8rem;
        }
        .plant-days span {
           flex-direction: row;
           gap: 4px;
        }
        .plant-days span svg {
           width: 1.2rem;
           height: 1.2rem;
        }

        /* Empty Slot in List View */
        .plant.empty {
           display: flex;
           align-items: center;
           gap: 12px;
           padding: 12px;
        }
        .plant.empty .plant-header {
           margin: 0;
        }
        .plant.empty .plant-name {
           font-size: 1rem;
           margin: 0;
        }
        .plant.empty .plant-stage {
           display: none;
        }

        /* Header vertical stacking */
        .gs-header-top {
            flex-direction: column;
        }
        .gs-stats-chips {
            flex-direction: column;
            width: 100%;
            align-items: stretch;
            gap: 4px;
        }
        .stat-chip {
            width: 100%;
            box-sizing: border-box;
            justify-content: space-between; /* Icon/Value spread */
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
    `],t([pt(),e("design:type",Object)],es.prototype,"_addPlantDialog",void 0),t([pt(),e("design:type",Object)],es.prototype,"_defaultApplied",void 0),t([pt(),e("design:type",Object)],es.prototype,"_plantOverviewDialog",void 0),t([pt(),e("design:type",Object)],es.prototype,"_strainLibraryDialog",void 0),t([pt(),e("design:type",Object)],es.prototype,"_configDialog",void 0),t([pt(),e("design:type",Object)],es.prototype,"selectedDevice",void 0),t([pt(),e("design:type",Object)],es.prototype,"_draggedPlant",void 0),t([pt(),e("design:type",Boolean)],es.prototype,"_isCompactView",void 0),t([pt(),e("design:type",Object)],es.prototype,"_historyData",void 0),t([pt(),e("design:type",Boolean)],es.prototype,"_lightCycleCollapsed",void 0),t([pt(),e("design:type",Set)],es.prototype,"_activeEnvGraphs",void 0),t([pt(),e("design:type",Object)],es.prototype,"_tooltip",void 0),t([ht({attribute:!1}),e("design:type",Object)],es.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],es.prototype,"_config",void 0),es=t([ct("growspace-manager-card")],es);let rs=class extends ot{constructor(){super(...arguments),this._growspaceOptions=[]}setConfig(t){this._config=t,this._loadGrowspaces()}updated(t){t.has("hass")&&this.hass&&(this._loadGrowspaces(),this._subscribeToSensorUpdates())}disconnectedCallback(){super.disconnectedCallback(),this._unsubStateChanged&&(this._unsubStateChanged(),this._unsubStateChanged=void 0)}_subscribeToSensorUpdates(){this.hass&&!this._unsubStateChanged&&(this._unsubStateChanged=this.hass.connection.subscribeEvents(t=>{const e=t.data.new_state;"sensor.growspaces_list"===e?.entity_id&&(Array.isArray(e.attributes?.growspaces)?this._growspaceOptions=e.attributes.growspaces:this._growspaceOptions=[])},"state_changed"))}_loadGrowspaces(){if(!this.hass)return;const t=this.hass.states["sensor.growspaces_list"];if(t&&t.attributes?.growspaces){const e=t.attributes.growspaces;this._growspaceOptions=Object.values(e)}else this._growspaceOptions=[]}render(){return this._config?R`
      <div class="form-group">
        <label>Default Growspace</label>
        <select
          .value=${this._config.default_growspace??""}
          @change=${t=>this._valueChanged("default_growspace",t.target.value)}
        >
          <option value="">Select a growspace</option>
          ${0===this._growspaceOptions.length?R`<option disabled>No growspaces found</option>`:this._growspaceOptions.map(t=>R`<option value="${t}">${t}</option>`)}
        </select>
      </div>
    `:R``}_valueChanged(t,e){if(!this._config)return;const r={...this._config,[t]:e};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:r},bubbles:!0,composed:!0}))}};rs.styles=o`
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
  `,t([ht({attribute:!1}),e("design:type",Object)],rs.prototype,"hass",void 0),t([ht({attribute:!1}),e("design:type",Object)],rs.prototype,"_config",void 0),t([pt(),e("design:type",Array)],rs.prototype,"_growspaceOptions",void 0),rs=t([ct("growspace-manager-card-editor")],rs);var is=Object.freeze({__proto__:null,get GrowspaceManagerCardEditor(){return rs}});export{es as GrowspaceManagerCard};
