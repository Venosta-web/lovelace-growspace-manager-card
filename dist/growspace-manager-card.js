function e(e,t,r,i){var a,s=arguments.length,n=s<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,r):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,r,i);else for(var o=e.length-1;o>=0;o--)(a=e[o])&&(n=(s<3?a(n):s>3?a(t,r,n):a(t,r))||n);return s>3&&n&&Object.defineProperty(t,r,n),n}function t(e,t){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(e,t)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const r=globalThis,i=r.ShadowRoot&&(void 0===r.ShadyCSS||r.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,a=Symbol(),s=new WeakMap;class n{constructor(e,t,r){if(this._$cssResult$=!0,r!==a)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const r=void 0!==t&&1===t.length;r&&(e=s.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),r&&s.set(t,e))}return e}toString(){return this.cssText}}const o=(e,...t)=>{const r=1===e.length?e[0]:t.reduce((t,r,i)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+e[i+1],e[0]);return new n(r,e,a)},l=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const r of e.cssRules)t+=r.cssText;return(e=>new n("string"==typeof e?e:e+"",void 0,a))(t)})(e):e,{is:c,defineProperty:d,getOwnPropertyDescriptor:u,getOwnPropertyNames:h,getOwnPropertySymbols:p,getPrototypeOf:g}=Object,m=globalThis,f=m.trustedTypes,v=f?f.emptyScript:"",y=m.reactiveElementPolyfillSupport,b=(e,t)=>e,w={toAttribute(e,t){switch(t){case Boolean:e=e?v:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let r=e;switch(t){case Boolean:r=null!==e;break;case Number:r=null===e?null:Number(e);break;case Object:case Array:try{r=JSON.parse(e)}catch(e){r=null}}return r}},x=(e,t)=>!c(e,t),_={attribute:!0,type:String,converter:w,reflect:!1,useDefault:!1,hasChanged:x};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;class $ extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=_){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const r=Symbol(),i=this.getPropertyDescriptor(e,r,t);void 0!==i&&d(this.prototype,e,i)}}static getPropertyDescriptor(e,t,r){const{get:i,set:a}=u(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:i,set(t){const s=i?.call(this);a?.call(this,t),this.requestUpdate(e,s,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??_}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const e=g(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const e=this.properties,t=[...h(e),...p(e)];for(const r of t)this.createProperty(r,e[r])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,r]of t)this.elementProperties.set(e,r)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const r=this._$Eu(e,t);void 0!==r&&this._$Eh.set(r,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const r=new Set(e.flat(1/0).reverse());for(const e of r)t.unshift(l(e))}else void 0!==e&&t.push(l(e));return t}static _$Eu(e,t){const r=t.attribute;return!1===r?void 0:"string"==typeof r?r:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const r of t.keys())this.hasOwnProperty(r)&&(e.set(r,this[r]),delete this[r]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,t)=>{if(i)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of t){const t=document.createElement("style"),a=r.litNonce;void 0!==a&&t.setAttribute("nonce",a),t.textContent=i.cssText,e.appendChild(t)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,r){this._$AK(e,r)}_$ET(e,t){const r=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,r);if(void 0!==i&&!0===r.reflect){const a=(void 0!==r.converter?.toAttribute?r.converter:w).toAttribute(t,r.type);this._$Em=e,null==a?this.removeAttribute(i):this.setAttribute(i,a),this._$Em=null}}_$AK(e,t){const r=this.constructor,i=r._$Eh.get(e);if(void 0!==i&&this._$Em!==i){const e=r.getPropertyOptions(i),a="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:w;this._$Em=i;const s=a.fromAttribute(t,e.type);this[i]=s??this._$Ej?.get(i)??s,this._$Em=null}}requestUpdate(e,t,r){if(void 0!==e){const i=this.constructor,a=this[e];if(r??=i.getPropertyOptions(e),!((r.hasChanged??x)(a,t)||r.useDefault&&r.reflect&&a===this._$Ej?.get(e)&&!this.hasAttribute(i._$Eu(e,r))))return;this.C(e,t,r)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:r,reflect:i,wrapped:a},s){r&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,s??t??this[e]),!0!==a||void 0!==s)||(this._$AL.has(e)||(this.hasUpdated||r||(t=void 0),this._$AL.set(e,t)),!0===i&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,r]of e){const{wrapped:e}=r,i=this[t];!0!==e||this._$AL.has(t)||void 0===i||this.C(t,void 0,r,i)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}}$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[b("elementProperties")]=new Map,$[b("finalized")]=new Map,y?.({ReactiveElement:$}),(m.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const S=globalThis,C=S.trustedTypes,D=C?C.createPolicy("lit-html",{createHTML:e=>e}):void 0,k="$lit$",A=`lit$${Math.random().toFixed(9).slice(2)}$`,M="?"+A,T=`<${M}>`,L=document,E=()=>L.createComment(""),O=e=>null===e||"object"!=typeof e&&"function"!=typeof e,I=Array.isArray,N="[ \t\n\f\r]",V=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,z=/-->/g,P=/>/g,H=RegExp(`>|${N}(?:([^\\s"'>=/]+)(${N}*=${N}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),F=/'/g,j=/"/g,G=/^(?:script|style|textarea|title)$/i,R=(e=>(t,...r)=>({_$litType$:e,strings:t,values:r}))(1),U=Symbol.for("lit-noChange"),Z=Symbol.for("lit-nothing"),B=new WeakMap,W=L.createTreeWalker(L,129);function q(e,t){if(!I(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==D?D.createHTML(t):t}const Y=(e,t)=>{const r=e.length-1,i=[];let a,s=2===t?"<svg>":3===t?"<math>":"",n=V;for(let t=0;t<r;t++){const r=e[t];let o,l,c=-1,d=0;for(;d<r.length&&(n.lastIndex=d,l=n.exec(r),null!==l);)d=n.lastIndex,n===V?"!--"===l[1]?n=z:void 0!==l[1]?n=P:void 0!==l[2]?(G.test(l[2])&&(a=RegExp("</"+l[2],"g")),n=H):void 0!==l[3]&&(n=H):n===H?">"===l[0]?(n=a??V,c=-1):void 0===l[1]?c=-2:(c=n.lastIndex-l[2].length,o=l[1],n=void 0===l[3]?H:'"'===l[3]?j:F):n===j||n===F?n=H:n===z||n===P?n=V:(n=H,a=void 0);const u=n===H&&e[t+1].startsWith("/>")?" ":"";s+=n===V?r+T:c>=0?(i.push(o),r.slice(0,c)+k+r.slice(c)+A+u):r+A+(-2===c?t:u)}return[q(e,s+(e[r]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),i]};class J{constructor({strings:e,_$litType$:t},r){let i;this.parts=[];let a=0,s=0;const n=e.length-1,o=this.parts,[l,c]=Y(e,t);if(this.el=J.createElement(l,r),W.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(i=W.nextNode())&&o.length<n;){if(1===i.nodeType){if(i.hasAttributes())for(const e of i.getAttributeNames())if(e.endsWith(k)){const t=c[s++],r=i.getAttribute(e).split(A),n=/([.?@])?(.*)/.exec(t);o.push({type:1,index:a,name:n[2],strings:r,ctor:"."===n[1]?te:"?"===n[1]?re:"@"===n[1]?ie:ee}),i.removeAttribute(e)}else e.startsWith(A)&&(o.push({type:6,index:a}),i.removeAttribute(e));if(G.test(i.tagName)){const e=i.textContent.split(A),t=e.length-1;if(t>0){i.textContent=C?C.emptyScript:"";for(let r=0;r<t;r++)i.append(e[r],E()),W.nextNode(),o.push({type:2,index:++a});i.append(e[t],E())}}}else if(8===i.nodeType)if(i.data===M)o.push({type:2,index:a});else{let e=-1;for(;-1!==(e=i.data.indexOf(A,e+1));)o.push({type:7,index:a}),e+=A.length-1}a++}}static createElement(e,t){const r=L.createElement("template");return r.innerHTML=e,r}}function Q(e,t,r=e,i){if(t===U)return t;let a=void 0!==i?r._$Co?.[i]:r._$Cl;const s=O(t)?void 0:t._$litDirective$;return a?.constructor!==s&&(a?._$AO?.(!1),void 0===s?a=void 0:(a=new s(e),a._$AT(e,r,i)),void 0!==i?(r._$Co??=[])[i]=a:r._$Cl=a),void 0!==a&&(t=Q(e,a._$AS(e,t.values),a,i)),t}class K{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:r}=this._$AD,i=(e?.creationScope??L).importNode(t,!0);W.currentNode=i;let a=W.nextNode(),s=0,n=0,o=r[0];for(;void 0!==o;){if(s===o.index){let t;2===o.type?t=new X(a,a.nextSibling,this,e):1===o.type?t=new o.ctor(a,o.name,o.strings,this,e):6===o.type&&(t=new ae(a,this,e)),this._$AV.push(t),o=r[++n]}s!==o?.index&&(a=W.nextNode(),s++)}return W.currentNode=L,i}p(e){let t=0;for(const r of this._$AV)void 0!==r&&(void 0!==r.strings?(r._$AI(e,r,t),t+=r.strings.length-2):r._$AI(e[t])),t++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,r,i){this.type=2,this._$AH=Z,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=r,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=Q(this,e,t),O(e)?e===Z||null==e||""===e?(this._$AH!==Z&&this._$AR(),this._$AH=Z):e!==this._$AH&&e!==U&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>I(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==Z&&O(this._$AH)?this._$AA.nextSibling.data=e:this.T(L.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:r}=e,i="number"==typeof r?this._$AC(e):(void 0===r.el&&(r.el=J.createElement(q(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===i)this._$AH.p(t);else{const e=new K(i,this),r=e.u(this.options);e.p(t),this.T(r),this._$AH=e}}_$AC(e){let t=B.get(e.strings);return void 0===t&&B.set(e.strings,t=new J(e)),t}k(e){I(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let r,i=0;for(const a of e)i===t.length?t.push(r=new X(this.O(E()),this.O(E()),this,this.options)):r=t[i],r._$AI(a),i++;i<t.length&&(this._$AR(r&&r._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=e.nextSibling;e.remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,r,i,a){this.type=1,this._$AH=Z,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=a,r.length>2||""!==r[0]||""!==r[1]?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=Z}_$AI(e,t=this,r,i){const a=this.strings;let s=!1;if(void 0===a)e=Q(this,e,t,0),s=!O(e)||e!==this._$AH&&e!==U,s&&(this._$AH=e);else{const i=e;let n,o;for(e=a[0],n=0;n<a.length-1;n++)o=Q(this,i[r+n],t,n),o===U&&(o=this._$AH[n]),s||=!O(o)||o!==this._$AH[n],o===Z?e=Z:e!==Z&&(e+=(o??"")+a[n+1]),this._$AH[n]=o}s&&!i&&this.j(e)}j(e){e===Z?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===Z?void 0:e}}class re extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==Z)}}class ie extends ee{constructor(e,t,r,i,a){super(e,t,r,i,a),this.type=5}_$AI(e,t=this){if((e=Q(this,e,t,0)??Z)===U)return;const r=this._$AH,i=e===Z&&r!==Z||e.capture!==r.capture||e.once!==r.once||e.passive!==r.passive,a=e!==Z&&(r===Z||i);i&&this.element.removeEventListener(this.name,this,r),a&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ae{constructor(e,t,r){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(e){Q(this,e)}}const se=S.litHtmlPolyfillSupport;se?.(J,X),(S.litHtmlVersions??=[]).push("3.3.1");const ne=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class oe extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,r)=>{const i=r?.renderBefore??t;let a=i._$litPart$;if(void 0===a){const e=r?.renderBefore??null;i._$litPart$=a=new X(t.insertBefore(E(),e),e,void 0,r??{})}return a._$AI(e),a})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return U}}oe._$litElement$=!0,oe.finalized=!0,ne.litElementHydrateSupport?.({LitElement:oe});const le=ne.litElementPolyfillSupport;le?.({LitElement:oe}),(ne.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ce=e=>(t,r)=>{void 0!==r?r.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)},de={attribute:!0,type:String,converter:w,reflect:!1,hasChanged:x},ue=(e=de,t,r)=>{const{kind:i,metadata:a}=r;let s=globalThis.litPropertyMetadata.get(a);if(void 0===s&&globalThis.litPropertyMetadata.set(a,s=new Map),"setter"===i&&((e=Object.create(e)).wrapped=!0),s.set(r.name,e),"accessor"===i){const{name:i}=r;return{set(r){const a=t.get.call(this);t.set.call(this,r),this.requestUpdate(i,a,e)},init(t){return void 0!==t&&this.C(i,void 0,e,t),t}}}if("setter"===i){const{name:i}=r;return function(r){const a=this[i];t.call(this,r),this.requestUpdate(i,a,e)}}throw Error("Unsupported decorator location: "+i)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function he(e){return(t,r)=>"object"==typeof r?ue(e,t,r):((e,t,r)=>{const i=t.hasOwnProperty(r);return t.constructor.createProperty(r,e),i?Object.getOwnPropertyDescriptor(t,r):void 0})(e,t,r)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pe(e){return he({...e,state:!0,attribute:!1})}var ge="M21.33,12.91C21.42,14.46 20.71,15.95 19.44,16.86L20.21,18.35C20.44,18.8 20.47,19.33 20.27,19.8C20.08,20.27 19.69,20.64 19.21,20.8L18.42,21.05C18.25,21.11 18.06,21.14 17.88,21.14C17.37,21.14 16.89,20.91 16.56,20.5L14.44,18C13.55,17.85 12.71,17.47 12,16.9C11.5,17.05 11,17.13 10.5,17.13C9.62,17.13 8.74,16.86 8,16.34C7.47,16.5 6.93,16.57 6.38,16.56C5.59,16.57 4.81,16.41 4.08,16.11C2.65,15.47 1.7,14.07 1.65,12.5C1.57,11.78 1.69,11.05 2,10.39C1.71,9.64 1.68,8.82 1.93,8.06C2.3,7.11 3,6.32 3.87,5.82C4.45,4.13 6.08,3 7.87,3.12C9.47,1.62 11.92,1.46 13.7,2.75C14.12,2.64 14.56,2.58 15,2.58C16.36,2.55 17.65,3.15 18.5,4.22C20.54,4.75 22,6.57 22.08,8.69C22.13,9.8 21.83,10.89 21.22,11.82C21.29,12.18 21.33,12.54 21.33,12.91M16.33,11.5C16.9,11.57 17.35,12 17.35,12.57A1,1 0 0,1 16.35,13.57H15.72C15.4,14.47 14.84,15.26 14.1,15.86C14.35,15.95 14.61,16 14.87,16.07C20,16 19.4,12.87 19.4,12.82C19.34,11.39 18.14,10.27 16.71,10.33A1,1 0 0,1 15.71,9.33A1,1 0 0,1 16.71,8.33C17.94,8.36 19.12,8.82 20.04,9.63C20.09,9.34 20.12,9.04 20.12,8.74C20.06,7.5 19.5,6.42 17.25,6.21C16,3.25 12.85,4.89 12.85,5.81V5.81C12.82,6.04 13.06,6.53 13.1,6.56A1,1 0 0,1 14.1,7.56C14.1,8.11 13.65,8.56 13.1,8.56V8.56C12.57,8.54 12.07,8.34 11.67,8C11.19,8.31 10.64,8.5 10.07,8.56V8.56C9.5,8.61 9.03,8.21 9,7.66C8.92,7.1 9.33,6.61 9.88,6.56C10.04,6.54 10.82,6.42 10.82,5.79V5.79C10.82,5.13 11.07,4.5 11.5,4C10.58,3.75 9.59,4.08 8.59,5.29C6.75,5 6,5.25 5.45,7.2C4.5,7.67 4,8 3.78,9C4.86,8.78 5.97,8.87 7,9.25C7.5,9.44 7.78,10 7.59,10.54C7.4,11.06 6.82,11.32 6.3,11.13C5.57,10.81 4.75,10.79 4,11.07C3.68,11.34 3.68,11.9 3.68,12.34C3.68,13.08 4.05,13.77 4.68,14.17C5.21,14.44 5.8,14.58 6.39,14.57C6.24,14.31 6.11,14.04 6,13.76C5.81,13.22 6.1,12.63 6.64,12.44C7.18,12.25 7.77,12.54 7.96,13.08C8.36,14.22 9.38,15 10.58,15.13C11.95,15.06 13.17,14.25 13.77,13C14,11.62 15.11,11.5 16.33,11.5M18.33,18.97L17.71,17.67L17,17.83L18,19.08L18.33,18.97M13.68,10.36C13.7,9.83 13.3,9.38 12.77,9.33C12.06,9.29 11.37,9.53 10.84,10C10.27,10.58 9.97,11.38 10,12.19A1,1 0 0,0 11,13.19C11.57,13.19 12,12.74 12,12.19C12,11.92 12.07,11.65 12.23,11.43C12.35,11.33 12.5,11.28 12.66,11.28C13.21,11.31 13.68,10.9 13.68,10.36Z",me="M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z",fe="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",ve="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",ye="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",be="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",we="M11 20H6.5Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20H13V12.85L14.6 14.4L16 13L12 9L8 13L9.4 14.4L11 12.85Z",xe="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",_e="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z",$e="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",Se="M4,2H6V4C6,5.44 6.68,6.61 7.88,7.78C8.74,8.61 9.89,9.41 11.09,10.2L9.26,11.39C8.27,10.72 7.31,10 6.5,9.21C5.07,7.82 4,6.1 4,4V2M18,2H20V4C20,6.1 18.93,7.82 17.5,9.21C16.09,10.59 14.29,11.73 12.54,12.84C10.79,13.96 9.09,15.05 7.88,16.22C6.68,17.39 6,18.56 6,20V22H4V20C4,17.9 5.07,16.18 6.5,14.79C7.91,13.41 9.71,12.27 11.46,11.16C13.21,10.04 14.91,8.95 16.12,7.78C17.32,6.61 18,5.44 18,4V2M14.74,12.61C15.73,13.28 16.69,14 17.5,14.79C18.93,16.18 20,17.9 20,20V22H18V20C18,18.56 17.32,17.39 16.12,16.22C15.26,15.39 14.11,14.59 12.91,13.8L14.74,12.61M7,3H17V4L16.94,4.5H7.06L7,4V3M7.68,6H16.32C16.08,6.34 15.8,6.69 15.42,7.06L14.91,7.5H9.07L8.58,7.06C8.2,6.69 7.92,6.34 7.68,6M9.09,16.5H14.93L15.42,16.94C15.8,17.31 16.08,17.66 16.32,18H7.68C7.92,17.66 8.2,17.31 8.58,16.94L9.09,16.5M7.06,19.5H16.94L17,20V21H7V20L7.06,19.5Z",Ce="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",De="M22 9A4.32 4.32 0 0 1 19.78 8.45A3.4 3.4 0 0 0 18 8V7A4.32 4.32 0 0 1 20.22 7.55A3.4 3.4 0 0 0 22 8M22 6A3.4 3.4 0 0 1 20.22 5.55A4.32 4.32 0 0 0 18 5V6A3.4 3.4 0 0 1 19.78 6.45A4.32 4.32 0 0 0 22 7M22 10A3.4 3.4 0 0 1 20.22 9.55A4.32 4.32 0 0 0 18 9V10A3.4 3.4 0 0 1 19.78 10.45A4.32 4.32 0 0 0 22 11M10 12.73A70.39 70.39 0 0 0 17 11V4S10.5 2 7.5 2A5.5 5.5 0 0 0 6.12 12.82L7 19H8A3 3 0 0 0 9.46 21.33A3.15 3.15 0 0 1 11 24H12A4.12 4.12 0 0 0 10.09 20.55C9.39 20 9 19.63 9 19H10M7.5 10A2.5 2.5 0 1 1 10 7.5A2.5 2.5 0 0 1 7.5 10Z",ke="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z",Ae="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",Me="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",Te="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z",Le="M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z",Ee="M8 13C6.14 13 4.59 14.28 4.14 16H2V18H4.14C4.59 19.72 6.14 21 8 21S11.41 19.72 11.86 18H22V16H11.86C11.41 14.28 9.86 13 8 13M8 19C6.9 19 6 18.1 6 17C6 15.9 6.9 15 8 15S10 15.9 10 17C10 18.1 9.1 19 8 19M19.86 6C19.41 4.28 17.86 3 16 3S12.59 4.28 12.14 6H2V8H12.14C12.59 9.72 14.14 11 16 11S19.41 9.72 19.86 8H22V6H19.86M16 9C14.9 9 14 8.1 14 7C14 5.9 14.9 5 16 5S18 5.9 18 7C18 8.1 17.1 9 16 9Z",Oe="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z",Ie="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z",Ne="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z";class Ve extends Error{}class ze extends Ve{constructor(e){super(`Invalid DateTime: ${e.toMessage()}`)}}class Pe extends Ve{constructor(e){super(`Invalid Interval: ${e.toMessage()}`)}}class He extends Ve{constructor(e){super(`Invalid Duration: ${e.toMessage()}`)}}class Fe extends Ve{}class je extends Ve{constructor(e){super(`Invalid unit ${e}`)}}class Ge extends Ve{}class Re extends Ve{constructor(){super("Zone is an abstract class")}}const Ue="numeric",Ze="short",Be="long",We={year:Ue,month:Ue,day:Ue},qe={year:Ue,month:Ze,day:Ue},Ye={year:Ue,month:Ze,day:Ue,weekday:Ze},Je={year:Ue,month:Be,day:Ue},Qe={year:Ue,month:Be,day:Ue,weekday:Be},Ke={hour:Ue,minute:Ue},Xe={hour:Ue,minute:Ue,second:Ue},et={hour:Ue,minute:Ue,second:Ue,timeZoneName:Ze},tt={hour:Ue,minute:Ue,second:Ue,timeZoneName:Be},rt={hour:Ue,minute:Ue,hourCycle:"h23"},it={hour:Ue,minute:Ue,second:Ue,hourCycle:"h23"},at={hour:Ue,minute:Ue,second:Ue,hourCycle:"h23",timeZoneName:Ze},st={hour:Ue,minute:Ue,second:Ue,hourCycle:"h23",timeZoneName:Be},nt={year:Ue,month:Ue,day:Ue,hour:Ue,minute:Ue},ot={year:Ue,month:Ue,day:Ue,hour:Ue,minute:Ue,second:Ue},lt={year:Ue,month:Ze,day:Ue,hour:Ue,minute:Ue},ct={year:Ue,month:Ze,day:Ue,hour:Ue,minute:Ue,second:Ue},dt={year:Ue,month:Ze,day:Ue,weekday:Ze,hour:Ue,minute:Ue},ut={year:Ue,month:Be,day:Ue,hour:Ue,minute:Ue,timeZoneName:Ze},ht={year:Ue,month:Be,day:Ue,hour:Ue,minute:Ue,second:Ue,timeZoneName:Ze},pt={year:Ue,month:Be,day:Ue,weekday:Be,hour:Ue,minute:Ue,timeZoneName:Be},gt={year:Ue,month:Be,day:Ue,weekday:Be,hour:Ue,minute:Ue,second:Ue,timeZoneName:Be};class mt{get type(){throw new Re}get name(){throw new Re}get ianaName(){return this.name}get isUniversal(){throw new Re}offsetName(e,t){throw new Re}formatOffset(e,t){throw new Re}offset(e){throw new Re}equals(e){throw new Re}get isValid(){throw new Re}}let ft=null;class vt extends mt{static get instance(){return null===ft&&(ft=new vt),ft}get type(){return"system"}get name(){return(new Intl.DateTimeFormat).resolvedOptions().timeZone}get isUniversal(){return!1}offsetName(e,{format:t,locale:r}){return zr(e,t,r)}formatOffset(e,t){return jr(this.offset(e),t)}offset(e){return-new Date(e).getTimezoneOffset()}equals(e){return"system"===e.type}get isValid(){return!0}}const yt=new Map;const bt={year:0,month:1,day:2,era:3,hour:4,minute:5,second:6};const wt=new Map;class xt extends mt{static create(e){let t=wt.get(e);return void 0===t&&wt.set(e,t=new xt(e)),t}static resetCache(){wt.clear(),yt.clear()}static isValidSpecifier(e){return this.isValidZone(e)}static isValidZone(e){if(!e)return!1;try{return new Intl.DateTimeFormat("en-US",{timeZone:e}).format(),!0}catch(e){return!1}}constructor(e){super(),this.zoneName=e,this.valid=xt.isValidZone(e)}get type(){return"iana"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(e,{format:t,locale:r}){return zr(e,t,r,this.name)}formatOffset(e,t){return jr(this.offset(e),t)}offset(e){if(!this.valid)return NaN;const t=new Date(e);if(isNaN(t))return NaN;const r=function(e){let t=yt.get(e);return void 0===t&&(t=new Intl.DateTimeFormat("en-US",{hour12:!1,timeZone:e,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",era:"short"}),yt.set(e,t)),t}(this.name);let[i,a,s,n,o,l,c]=r.formatToParts?function(e,t){const r=e.formatToParts(t),i=[];for(let e=0;e<r.length;e++){const{type:t,value:a}=r[e],s=bt[t];"era"===t?i[s]=a:fr(s)||(i[s]=parseInt(a,10))}return i}(r,t):function(e,t){const r=e.format(t).replace(/\u200E/g,""),i=/(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(r),[,a,s,n,o,l,c,d]=i;return[n,a,s,o,l,c,d]}(r,t);"BC"===n&&(i=1-Math.abs(i));let d=+t;const u=d%1e3;return d-=u>=0?u:1e3+u,(Or({year:i,month:a,day:s,hour:24===o?0:o,minute:l,second:c,millisecond:0})-d)/6e4}equals(e){return"iana"===e.type&&e.name===this.name}get isValid(){return this.valid}}let _t={};const $t=new Map;function St(e,t={}){const r=JSON.stringify([e,t]);let i=$t.get(r);return void 0===i&&(i=new Intl.DateTimeFormat(e,t),$t.set(r,i)),i}const Ct=new Map;const Dt=new Map;let kt=null;const At=new Map;function Mt(e){let t=At.get(e);return void 0===t&&(t=new Intl.DateTimeFormat(e).resolvedOptions(),At.set(e,t)),t}const Tt=new Map;function Lt(e,t,r,i){const a=e.listingMode();return"error"===a?null:"en"===a?r(t):i(t)}class Et{constructor(e,t,r){this.padTo=r.padTo||0,this.floor=r.floor||!1;const{padTo:i,floor:a,...s}=r;if(!t||Object.keys(s).length>0){const t={useGrouping:!1,...r};r.padTo>0&&(t.minimumIntegerDigits=r.padTo),this.inf=function(e,t={}){const r=JSON.stringify([e,t]);let i=Ct.get(r);return void 0===i&&(i=new Intl.NumberFormat(e,t),Ct.set(r,i)),i}(e,t)}}format(e){if(this.inf){const t=this.floor?Math.floor(e):e;return this.inf.format(t)}return Cr(this.floor?Math.floor(e):Mr(e,3),this.padTo)}}class Ot{constructor(e,t,r){let i;if(this.opts=r,this.originalZone=void 0,this.opts.timeZone)this.dt=e;else if("fixed"===e.zone.type){const t=e.offset/60*-1,r=t>=0?`Etc/GMT+${t}`:`Etc/GMT${t}`;0!==e.offset&&xt.create(r).valid?(i=r,this.dt=e):(i="UTC",this.dt=0===e.offset?e:e.setZone("UTC").plus({minutes:e.offset}),this.originalZone=e.zone)}else"system"===e.zone.type?this.dt=e:"iana"===e.zone.type?(this.dt=e,i=e.zone.name):(i="UTC",this.dt=e.setZone("UTC").plus({minutes:e.offset}),this.originalZone=e.zone);const a={...this.opts};a.timeZone=a.timeZone||i,this.dtf=St(t,a)}format(){return this.originalZone?this.formatToParts().map(({value:e})=>e).join(""):this.dtf.format(this.dt.toJSDate())}formatToParts(){const e=this.dtf.formatToParts(this.dt.toJSDate());return this.originalZone?e.map(e=>{if("timeZoneName"===e.type){const t=this.originalZone.offsetName(this.dt.ts,{locale:this.dt.locale,format:this.opts.timeZoneName});return{...e,value:t}}return e}):e}resolvedOptions(){return this.dtf.resolvedOptions()}}class It{constructor(e,t,r){this.opts={style:"long",...r},!t&&br()&&(this.rtf=function(e,t={}){const{base:r,...i}=t,a=JSON.stringify([e,i]);let s=Dt.get(a);return void 0===s&&(s=new Intl.RelativeTimeFormat(e,t),Dt.set(a,s)),s}(e,r))}format(e,t){return this.rtf?this.rtf.format(e,t):function(e,t,r="always",i=!1){const a={years:["year","yr."],quarters:["quarter","qtr."],months:["month","mo."],weeks:["week","wk."],days:["day","day","days"],hours:["hour","hr."],minutes:["minute","min."],seconds:["second","sec."]},s=-1===["hours","minutes","seconds"].indexOf(e);if("auto"===r&&s){const r="days"===e;switch(t){case 1:return r?"tomorrow":`next ${a[e][0]}`;case-1:return r?"yesterday":`last ${a[e][0]}`;case 0:return r?"today":`this ${a[e][0]}`}}const n=Object.is(t,-0)||t<0,o=Math.abs(t),l=1===o,c=a[e],d=i?l?c[1]:c[2]||c[1]:l?a[e][0]:e;return n?`${o} ${d} ago`:`in ${o} ${d}`}(t,e,this.opts.numeric,"long"!==this.opts.style)}formatToParts(e,t){return this.rtf?this.rtf.formatToParts(e,t):[]}}const Nt={firstDay:1,minimalDays:4,weekend:[6,7]};class Vt{static fromOpts(e){return Vt.create(e.locale,e.numberingSystem,e.outputCalendar,e.weekSettings,e.defaultToEN)}static create(e,t,r,i,a=!1){const s=e||er.defaultLocale,n=s||(a?"en-US":kt||(kt=(new Intl.DateTimeFormat).resolvedOptions().locale,kt)),o=t||er.defaultNumberingSystem,l=r||er.defaultOutputCalendar,c=$r(i)||er.defaultWeekSettings;return new Vt(n,o,l,c,s)}static resetCache(){kt=null,$t.clear(),Ct.clear(),Dt.clear(),At.clear(),Tt.clear()}static fromObject({locale:e,numberingSystem:t,outputCalendar:r,weekSettings:i}={}){return Vt.create(e,t,r,i)}constructor(e,t,r,i,a){const[s,n,o]=function(e){const t=e.indexOf("-x-");-1!==t&&(e=e.substring(0,t));const r=e.indexOf("-u-");if(-1===r)return[e];{let t,i;try{t=St(e).resolvedOptions(),i=e}catch(a){const s=e.substring(0,r);t=St(s).resolvedOptions(),i=s}const{numberingSystem:a,calendar:s}=t;return[i,a,s]}}(e);this.locale=s,this.numberingSystem=t||n||null,this.outputCalendar=r||o||null,this.weekSettings=i,this.intl=function(e,t,r){return r||t?(e.includes("-u-")||(e+="-u"),r&&(e+=`-ca-${r}`),t&&(e+=`-nu-${t}`),e):e}(this.locale,this.numberingSystem,this.outputCalendar),this.weekdaysCache={format:{},standalone:{}},this.monthsCache={format:{},standalone:{}},this.meridiemCache=null,this.eraCache={},this.specifiedLocale=a,this.fastNumbersCached=null}get fastNumbers(){var e;return null==this.fastNumbersCached&&(this.fastNumbersCached=(!(e=this).numberingSystem||"latn"===e.numberingSystem)&&("latn"===e.numberingSystem||!e.locale||e.locale.startsWith("en")||"latn"===Mt(e.locale).numberingSystem)),this.fastNumbersCached}listingMode(){const e=this.isEnglish(),t=!(null!==this.numberingSystem&&"latn"!==this.numberingSystem||null!==this.outputCalendar&&"gregory"!==this.outputCalendar);return e&&t?"en":"intl"}clone(e){return e&&0!==Object.getOwnPropertyNames(e).length?Vt.create(e.locale||this.specifiedLocale,e.numberingSystem||this.numberingSystem,e.outputCalendar||this.outputCalendar,$r(e.weekSettings)||this.weekSettings,e.defaultToEN||!1):this}redefaultToEN(e={}){return this.clone({...e,defaultToEN:!0})}redefaultToSystem(e={}){return this.clone({...e,defaultToEN:!1})}months(e,t=!1){return Lt(this,e,Br,()=>{const r="ja"===this.intl||this.intl.startsWith("ja-"),i=(t&=!r)?{month:e,day:"numeric"}:{month:e},a=t?"format":"standalone";if(!this.monthsCache[a][e]){const t=r?e=>this.dtFormatter(e,i).format():e=>this.extract(e,i,"month");this.monthsCache[a][e]=function(e){const t=[];for(let r=1;r<=12;r++){const i=Qa.utc(2009,r,1);t.push(e(i))}return t}(t)}return this.monthsCache[a][e]})}weekdays(e,t=!1){return Lt(this,e,Jr,()=>{const r=t?{weekday:e,year:"numeric",month:"long",day:"numeric"}:{weekday:e},i=t?"format":"standalone";return this.weekdaysCache[i][e]||(this.weekdaysCache[i][e]=function(e){const t=[];for(let r=1;r<=7;r++){const i=Qa.utc(2016,11,13+r);t.push(e(i))}return t}(e=>this.extract(e,r,"weekday"))),this.weekdaysCache[i][e]})}meridiems(){return Lt(this,void 0,()=>Qr,()=>{if(!this.meridiemCache){const e={hour:"numeric",hourCycle:"h12"};this.meridiemCache=[Qa.utc(2016,11,13,9),Qa.utc(2016,11,13,19)].map(t=>this.extract(t,e,"dayperiod"))}return this.meridiemCache})}eras(e){return Lt(this,e,ti,()=>{const t={era:e};return this.eraCache[e]||(this.eraCache[e]=[Qa.utc(-40,1,1),Qa.utc(2017,1,1)].map(e=>this.extract(e,t,"era"))),this.eraCache[e]})}extract(e,t,r){const i=this.dtFormatter(e,t).formatToParts().find(e=>e.type.toLowerCase()===r);return i?i.value:null}numberFormatter(e={}){return new Et(this.intl,e.forceSimple||this.fastNumbers,e)}dtFormatter(e,t={}){return new Ot(e,this.intl,t)}relFormatter(e={}){return new It(this.intl,this.isEnglish(),e)}listFormatter(e={}){return function(e,t={}){const r=JSON.stringify([e,t]);let i=_t[r];return i||(i=new Intl.ListFormat(e,t),_t[r]=i),i}(this.intl,e)}isEnglish(){return"en"===this.locale||"en-us"===this.locale.toLowerCase()||Mt(this.intl).locale.startsWith("en-us")}getWeekSettings(){return this.weekSettings?this.weekSettings:wr()?function(e){let t=Tt.get(e);if(!t){const r=new Intl.Locale(e);t="getWeekInfo"in r?r.getWeekInfo():r.weekInfo,"minimalDays"in t||(t={...Nt,...t}),Tt.set(e,t)}return t}(this.locale):Nt}getStartOfWeek(){return this.getWeekSettings().firstDay}getMinDaysInFirstWeek(){return this.getWeekSettings().minimalDays}getWeekendDays(){return this.getWeekSettings().weekend}equals(e){return this.locale===e.locale&&this.numberingSystem===e.numberingSystem&&this.outputCalendar===e.outputCalendar}toString(){return`Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`}}let zt=null;class Pt extends mt{static get utcInstance(){return null===zt&&(zt=new Pt(0)),zt}static instance(e){return 0===e?Pt.utcInstance:new Pt(e)}static parseSpecifier(e){if(e){const t=e.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);if(t)return new Pt(Pr(t[1],t[2]))}return null}constructor(e){super(),this.fixed=e}get type(){return"fixed"}get name(){return 0===this.fixed?"UTC":`UTC${jr(this.fixed,"narrow")}`}get ianaName(){return 0===this.fixed?"Etc/UTC":`Etc/GMT${jr(-this.fixed,"narrow")}`}offsetName(){return this.name}formatOffset(e,t){return jr(this.fixed,t)}get isUniversal(){return!0}offset(){return this.fixed}equals(e){return"fixed"===e.type&&e.fixed===this.fixed}get isValid(){return!0}}class Ht extends mt{constructor(e){super(),this.zoneName=e}get type(){return"invalid"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(){return null}formatOffset(){return""}offset(){return NaN}equals(){return!1}get isValid(){return!1}}function Ft(e,t){if(fr(e)||null===e)return t;if(e instanceof mt)return e;if(function(e){return"string"==typeof e}(e)){const r=e.toLowerCase();return"default"===r?t:"local"===r||"system"===r?vt.instance:"utc"===r||"gmt"===r?Pt.utcInstance:Pt.parseSpecifier(r)||xt.create(e)}return vr(e)?Pt.instance(e):"object"==typeof e&&"offset"in e&&"function"==typeof e.offset?e:new Ht(e)}const jt={arab:"[٠-٩]",arabext:"[۰-۹]",bali:"[᭐-᭙]",beng:"[০-৯]",deva:"[०-९]",fullwide:"[０-９]",gujr:"[૦-૯]",hanidec:"[〇|一|二|三|四|五|六|七|八|九]",khmr:"[០-៩]",knda:"[೦-೯]",laoo:"[໐-໙]",limb:"[᥆-᥏]",mlym:"[൦-൯]",mong:"[᠐-᠙]",mymr:"[၀-၉]",orya:"[୦-୯]",tamldec:"[௦-௯]",telu:"[౦-౯]",thai:"[๐-๙]",tibt:"[༠-༩]",latn:"\\d"},Gt={arab:[1632,1641],arabext:[1776,1785],bali:[6992,7001],beng:[2534,2543],deva:[2406,2415],fullwide:[65296,65303],gujr:[2790,2799],khmr:[6112,6121],knda:[3302,3311],laoo:[3792,3801],limb:[6470,6479],mlym:[3430,3439],mong:[6160,6169],mymr:[4160,4169],orya:[2918,2927],tamldec:[3046,3055],telu:[3174,3183],thai:[3664,3673],tibt:[3872,3881]},Rt=jt.hanidec.replace(/[\[|\]]/g,"").split("");const Ut=new Map;function Zt({numberingSystem:e},t=""){const r=e||"latn";let i=Ut.get(r);void 0===i&&(i=new Map,Ut.set(r,i));let a=i.get(t);return void 0===a&&(a=new RegExp(`${jt[r]}${t}`),i.set(t,a)),a}let Bt,Wt=()=>Date.now(),qt="system",Yt=null,Jt=null,Qt=null,Kt=60,Xt=null;class er{static get now(){return Wt}static set now(e){Wt=e}static set defaultZone(e){qt=e}static get defaultZone(){return Ft(qt,vt.instance)}static get defaultLocale(){return Yt}static set defaultLocale(e){Yt=e}static get defaultNumberingSystem(){return Jt}static set defaultNumberingSystem(e){Jt=e}static get defaultOutputCalendar(){return Qt}static set defaultOutputCalendar(e){Qt=e}static get defaultWeekSettings(){return Xt}static set defaultWeekSettings(e){Xt=$r(e)}static get twoDigitCutoffYear(){return Kt}static set twoDigitCutoffYear(e){Kt=e%100}static get throwOnInvalid(){return Bt}static set throwOnInvalid(e){Bt=e}static resetCaches(){Vt.resetCache(),xt.resetCache(),Qa.resetCache(),Ut.clear()}}class tr{constructor(e,t){this.reason=e,this.explanation=t}toMessage(){return this.explanation?`${this.reason}: ${this.explanation}`:this.reason}}const rr=[0,31,59,90,120,151,181,212,243,273,304,334],ir=[0,31,60,91,121,152,182,213,244,274,305,335];function ar(e,t){return new tr("unit out of range",`you specified ${t} (of type ${typeof t}) as a ${e}, which is invalid`)}function sr(e,t,r){const i=new Date(Date.UTC(e,t-1,r));e<100&&e>=0&&i.setUTCFullYear(i.getUTCFullYear()-1900);const a=i.getUTCDay();return 0===a?7:a}function nr(e,t,r){return r+(Tr(e)?ir:rr)[t-1]}function or(e,t){const r=Tr(e)?ir:rr,i=r.findIndex(e=>e<t);return{month:i+1,day:t-r[i]}}function lr(e,t){return(e-t+7)%7+1}function cr(e,t=4,r=1){const{year:i,month:a,day:s}=e,n=nr(i,a,s),o=lr(sr(i,a,s),r);let l,c=Math.floor((n-o+14-t)/7);return c<1?(l=i-1,c=Nr(l,t,r)):c>Nr(i,t,r)?(l=i+1,c=1):l=i,{weekYear:l,weekNumber:c,weekday:o,...Gr(e)}}function dr(e,t=4,r=1){const{weekYear:i,weekNumber:a,weekday:s}=e,n=lr(sr(i,1,t),r),o=Lr(i);let l,c=7*a+s-n-7+t;c<1?(l=i-1,c+=Lr(l)):c>o?(l=i+1,c-=Lr(i)):l=i;const{month:d,day:u}=or(l,c);return{year:l,month:d,day:u,...Gr(e)}}function ur(e){const{year:t,month:r,day:i}=e;return{year:t,ordinal:nr(t,r,i),...Gr(e)}}function hr(e){const{year:t,ordinal:r}=e,{month:i,day:a}=or(t,r);return{year:t,month:i,day:a,...Gr(e)}}function pr(e,t){if(!fr(e.localWeekday)||!fr(e.localWeekNumber)||!fr(e.localWeekYear)){if(!fr(e.weekday)||!fr(e.weekNumber)||!fr(e.weekYear))throw new Fe("Cannot mix locale-based week fields with ISO-based week fields");return fr(e.localWeekday)||(e.weekday=e.localWeekday),fr(e.localWeekNumber)||(e.weekNumber=e.localWeekNumber),fr(e.localWeekYear)||(e.weekYear=e.localWeekYear),delete e.localWeekday,delete e.localWeekNumber,delete e.localWeekYear,{minDaysInFirstWeek:t.getMinDaysInFirstWeek(),startOfWeek:t.getStartOfWeek()}}return{minDaysInFirstWeek:4,startOfWeek:1}}function gr(e){const t=yr(e.year),r=Sr(e.month,1,12),i=Sr(e.day,1,Er(e.year,e.month));return t?r?!i&&ar("day",e.day):ar("month",e.month):ar("year",e.year)}function mr(e){const{hour:t,minute:r,second:i,millisecond:a}=e,s=Sr(t,0,23)||24===t&&0===r&&0===i&&0===a,n=Sr(r,0,59),o=Sr(i,0,59),l=Sr(a,0,999);return s?n?o?!l&&ar("millisecond",a):ar("second",i):ar("minute",r):ar("hour",t)}function fr(e){return void 0===e}function vr(e){return"number"==typeof e}function yr(e){return"number"==typeof e&&e%1==0}function br(){try{return"undefined"!=typeof Intl&&!!Intl.RelativeTimeFormat}catch(e){return!1}}function wr(){try{return"undefined"!=typeof Intl&&!!Intl.Locale&&("weekInfo"in Intl.Locale.prototype||"getWeekInfo"in Intl.Locale.prototype)}catch(e){return!1}}function xr(e,t,r){if(0!==e.length)return e.reduce((e,i)=>{const a=[t(i),i];return e&&r(e[0],a[0])===e[0]?e:a},null)[1]}function _r(e,t){return Object.prototype.hasOwnProperty.call(e,t)}function $r(e){if(null==e)return null;if("object"!=typeof e)throw new Ge("Week settings must be an object");if(!Sr(e.firstDay,1,7)||!Sr(e.minimalDays,1,7)||!Array.isArray(e.weekend)||e.weekend.some(e=>!Sr(e,1,7)))throw new Ge("Invalid week settings");return{firstDay:e.firstDay,minimalDays:e.minimalDays,weekend:Array.from(e.weekend)}}function Sr(e,t,r){return yr(e)&&e>=t&&e<=r}function Cr(e,t=2){let r;return r=e<0?"-"+(""+-e).padStart(t,"0"):(""+e).padStart(t,"0"),r}function Dr(e){return fr(e)||null===e||""===e?void 0:parseInt(e,10)}function kr(e){return fr(e)||null===e||""===e?void 0:parseFloat(e)}function Ar(e){if(!fr(e)&&null!==e&&""!==e){const t=1e3*parseFloat("0."+e);return Math.floor(t)}}function Mr(e,t,r="round"){const i=10**t;switch(r){case"expand":return e>0?Math.ceil(e*i)/i:Math.floor(e*i)/i;case"trunc":return Math.trunc(e*i)/i;case"round":return Math.round(e*i)/i;case"floor":return Math.floor(e*i)/i;case"ceil":return Math.ceil(e*i)/i;default:throw new RangeError(`Value rounding ${r} is out of range`)}}function Tr(e){return e%4==0&&(e%100!=0||e%400==0)}function Lr(e){return Tr(e)?366:365}function Er(e,t){const r=function(e,t){return e-t*Math.floor(e/t)}(t-1,12)+1;return 2===r?Tr(e+(t-r)/12)?29:28:[31,null,31,30,31,30,31,31,30,31,30,31][r-1]}function Or(e){let t=Date.UTC(e.year,e.month-1,e.day,e.hour,e.minute,e.second,e.millisecond);return e.year<100&&e.year>=0&&(t=new Date(t),t.setUTCFullYear(e.year,e.month-1,e.day)),+t}function Ir(e,t,r){return-lr(sr(e,1,t),r)+t-1}function Nr(e,t=4,r=1){const i=Ir(e,t,r),a=Ir(e+1,t,r);return(Lr(e)-i+a)/7}function Vr(e){return e>99?e:e>er.twoDigitCutoffYear?1900+e:2e3+e}function zr(e,t,r,i=null){const a=new Date(e),s={hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"};i&&(s.timeZone=i);const n={timeZoneName:t,...s},o=new Intl.DateTimeFormat(r,n).formatToParts(a).find(e=>"timezonename"===e.type.toLowerCase());return o?o.value:null}function Pr(e,t){let r=parseInt(e,10);Number.isNaN(r)&&(r=0);const i=parseInt(t,10)||0;return 60*r+(r<0||Object.is(r,-0)?-i:i)}function Hr(e){const t=Number(e);if("boolean"==typeof e||""===e||!Number.isFinite(t))throw new Ge(`Invalid unit value ${e}`);return t}function Fr(e,t){const r={};for(const i in e)if(_r(e,i)){const a=e[i];if(null==a)continue;r[t(i)]=Hr(a)}return r}function jr(e,t){const r=Math.trunc(Math.abs(e/60)),i=Math.trunc(Math.abs(e%60)),a=e>=0?"+":"-";switch(t){case"short":return`${a}${Cr(r,2)}:${Cr(i,2)}`;case"narrow":return`${a}${r}${i>0?`:${i}`:""}`;case"techie":return`${a}${Cr(r,2)}${Cr(i,2)}`;default:throw new RangeError(`Value format ${t} is out of range for property format`)}}function Gr(e){return function(e,t){return t.reduce((t,r)=>(t[r]=e[r],t),{})}(e,["hour","minute","second","millisecond"])}const Rr=["January","February","March","April","May","June","July","August","September","October","November","December"],Ur=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],Zr=["J","F","M","A","M","J","J","A","S","O","N","D"];function Br(e){switch(e){case"narrow":return[...Zr];case"short":return[...Ur];case"long":return[...Rr];case"numeric":return["1","2","3","4","5","6","7","8","9","10","11","12"];case"2-digit":return["01","02","03","04","05","06","07","08","09","10","11","12"];default:return null}}const Wr=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],qr=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],Yr=["M","T","W","T","F","S","S"];function Jr(e){switch(e){case"narrow":return[...Yr];case"short":return[...qr];case"long":return[...Wr];case"numeric":return["1","2","3","4","5","6","7"];default:return null}}const Qr=["AM","PM"],Kr=["Before Christ","Anno Domini"],Xr=["BC","AD"],ei=["B","A"];function ti(e){switch(e){case"narrow":return[...ei];case"short":return[...Xr];case"long":return[...Kr];default:return null}}function ri(e,t){let r="";for(const i of e)i.literal?r+=i.val:r+=t(i.val);return r}const ii={D:We,DD:qe,DDD:Je,DDDD:Qe,t:Ke,tt:Xe,ttt:et,tttt:tt,T:rt,TT:it,TTT:at,TTTT:st,f:nt,ff:lt,fff:ut,ffff:pt,F:ot,FF:ct,FFF:ht,FFFF:gt};class ai{static create(e,t={}){return new ai(e,t)}static parseFormat(e){let t=null,r="",i=!1;const a=[];for(let s=0;s<e.length;s++){const n=e.charAt(s);"'"===n?((r.length>0||i)&&a.push({literal:i||/^\s+$/.test(r),val:""===r?"'":r}),t=null,r="",i=!i):i||n===t?r+=n:(r.length>0&&a.push({literal:/^\s+$/.test(r),val:r}),r=n,t=n)}return r.length>0&&a.push({literal:i||/^\s+$/.test(r),val:r}),a}static macroTokenToFormatOpts(e){return ii[e]}constructor(e,t){this.opts=t,this.loc=e,this.systemLoc=null}formatWithSystemDefault(e,t){null===this.systemLoc&&(this.systemLoc=this.loc.redefaultToSystem());return this.systemLoc.dtFormatter(e,{...this.opts,...t}).format()}dtFormatter(e,t={}){return this.loc.dtFormatter(e,{...this.opts,...t})}formatDateTime(e,t){return this.dtFormatter(e,t).format()}formatDateTimeParts(e,t){return this.dtFormatter(e,t).formatToParts()}formatInterval(e,t){return this.dtFormatter(e.start,t).dtf.formatRange(e.start.toJSDate(),e.end.toJSDate())}resolvedOptions(e,t){return this.dtFormatter(e,t).resolvedOptions()}num(e,t=0,r=void 0){if(this.opts.forceSimple)return Cr(e,t);const i={...this.opts};return t>0&&(i.padTo=t),r&&(i.signDisplay=r),this.loc.numberFormatter(i).format(e)}formatDateTimeFromString(e,t){const r="en"===this.loc.listingMode(),i=this.loc.outputCalendar&&"gregory"!==this.loc.outputCalendar,a=(t,r)=>this.loc.extract(e,t,r),s=t=>e.isOffsetFixed&&0===e.offset&&t.allowZ?"Z":e.isValid?e.zone.formatOffset(e.ts,t.format):"",n=()=>r?function(e){return Qr[e.hour<12?0:1]}(e):a({hour:"numeric",hourCycle:"h12"},"dayperiod"),o=(t,i)=>r?function(e,t){return Br(t)[e.month-1]}(e,t):a(i?{month:t}:{month:t,day:"numeric"},"month"),l=(t,i)=>r?function(e,t){return Jr(t)[e.weekday-1]}(e,t):a(i?{weekday:t}:{weekday:t,month:"long",day:"numeric"},"weekday"),c=t=>{const r=ai.macroTokenToFormatOpts(t);return r?this.formatWithSystemDefault(e,r):t},d=t=>r?function(e,t){return ti(t)[e.year<0?0:1]}(e,t):a({era:t},"era");return ri(ai.parseFormat(t),t=>{switch(t){case"S":return this.num(e.millisecond);case"u":case"SSS":return this.num(e.millisecond,3);case"s":return this.num(e.second);case"ss":return this.num(e.second,2);case"uu":return this.num(Math.floor(e.millisecond/10),2);case"uuu":return this.num(Math.floor(e.millisecond/100));case"m":return this.num(e.minute);case"mm":return this.num(e.minute,2);case"h":return this.num(e.hour%12==0?12:e.hour%12);case"hh":return this.num(e.hour%12==0?12:e.hour%12,2);case"H":return this.num(e.hour);case"HH":return this.num(e.hour,2);case"Z":return s({format:"narrow",allowZ:this.opts.allowZ});case"ZZ":return s({format:"short",allowZ:this.opts.allowZ});case"ZZZ":return s({format:"techie",allowZ:this.opts.allowZ});case"ZZZZ":return e.zone.offsetName(e.ts,{format:"short",locale:this.loc.locale});case"ZZZZZ":return e.zone.offsetName(e.ts,{format:"long",locale:this.loc.locale});case"z":return e.zoneName;case"a":return n();case"d":return i?a({day:"numeric"},"day"):this.num(e.day);case"dd":return i?a({day:"2-digit"},"day"):this.num(e.day,2);case"c":case"E":return this.num(e.weekday);case"ccc":return l("short",!0);case"cccc":return l("long",!0);case"ccccc":return l("narrow",!0);case"EEE":return l("short",!1);case"EEEE":return l("long",!1);case"EEEEE":return l("narrow",!1);case"L":return i?a({month:"numeric",day:"numeric"},"month"):this.num(e.month);case"LL":return i?a({month:"2-digit",day:"numeric"},"month"):this.num(e.month,2);case"LLL":return o("short",!0);case"LLLL":return o("long",!0);case"LLLLL":return o("narrow",!0);case"M":return i?a({month:"numeric"},"month"):this.num(e.month);case"MM":return i?a({month:"2-digit"},"month"):this.num(e.month,2);case"MMM":return o("short",!1);case"MMMM":return o("long",!1);case"MMMMM":return o("narrow",!1);case"y":return i?a({year:"numeric"},"year"):this.num(e.year);case"yy":return i?a({year:"2-digit"},"year"):this.num(e.year.toString().slice(-2),2);case"yyyy":return i?a({year:"numeric"},"year"):this.num(e.year,4);case"yyyyyy":return i?a({year:"numeric"},"year"):this.num(e.year,6);case"G":return d("short");case"GG":return d("long");case"GGGGG":return d("narrow");case"kk":return this.num(e.weekYear.toString().slice(-2),2);case"kkkk":return this.num(e.weekYear,4);case"W":return this.num(e.weekNumber);case"WW":return this.num(e.weekNumber,2);case"n":return this.num(e.localWeekNumber);case"nn":return this.num(e.localWeekNumber,2);case"ii":return this.num(e.localWeekYear.toString().slice(-2),2);case"iiii":return this.num(e.localWeekYear,4);case"o":return this.num(e.ordinal);case"ooo":return this.num(e.ordinal,3);case"q":return this.num(e.quarter);case"qq":return this.num(e.quarter,2);case"X":return this.num(Math.floor(e.ts/1e3));case"x":return this.num(e.ts);default:return c(t)}})}formatDurationFromString(e,t){const r="negativeLargestOnly"===this.opts.signMode?-1:1,i=e=>{switch(e[0]){case"S":return"milliseconds";case"s":return"seconds";case"m":return"minutes";case"h":return"hours";case"d":return"days";case"w":return"weeks";case"M":return"months";case"y":return"years";default:return null}},a=ai.parseFormat(t),s=a.reduce((e,{literal:t,val:r})=>t?e:e.concat(r),[]),n=e.shiftTo(...s.map(i).filter(e=>e));return ri(a,((e,t)=>a=>{const s=i(a);if(s){const i=t.isNegativeDuration&&s!==t.largestUnit?r:1;let n;return n="negativeLargestOnly"===this.opts.signMode&&s!==t.largestUnit?"never":"all"===this.opts.signMode?"always":"auto",this.num(e.get(s)*i,a.length,n)}return a})(n,{isNegativeDuration:n<0,largestUnit:Object.keys(n.values)[0]}))}}const si=/[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;function ni(...e){const t=e.reduce((e,t)=>e+t.source,"");return RegExp(`^${t}$`)}function oi(...e){return t=>e.reduce(([e,r,i],a)=>{const[s,n,o]=a(t,i);return[{...e,...s},n||r,o]},[{},null,1]).slice(0,2)}function li(e,...t){if(null==e)return[null,null];for(const[r,i]of t){const t=r.exec(e);if(t)return i(t)}return[null,null]}function ci(...e){return(t,r)=>{const i={};let a;for(a=0;a<e.length;a++)i[e[a]]=Dr(t[r+a]);return[i,null,r+a]}}const di=/(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/,ui=/(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/,hi=RegExp(`${ui.source}${`(?:${di.source}?(?:\\[(${si.source})\\])?)?`}`),pi=RegExp(`(?:[Tt]${hi.source})?`),gi=ci("weekYear","weekNumber","weekDay"),mi=ci("year","ordinal"),fi=RegExp(`${ui.source} ?(?:${di.source}|(${si.source}))?`),vi=RegExp(`(?: ${fi.source})?`);function yi(e,t,r){const i=e[t];return fr(i)?r:Dr(i)}function bi(e,t){return[{hours:yi(e,t,0),minutes:yi(e,t+1,0),seconds:yi(e,t+2,0),milliseconds:Ar(e[t+3])},null,t+4]}function wi(e,t){const r=!e[t]&&!e[t+1],i=Pr(e[t+1],e[t+2]);return[{},r?null:Pt.instance(i),t+3]}function xi(e,t){return[{},e[t]?xt.create(e[t]):null,t+1]}const _i=RegExp(`^T?${ui.source}$`),$i=/^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;function Si(e){const[t,r,i,a,s,n,o,l,c]=e,d="-"===t[0],u=l&&"-"===l[0],h=(e,t=!1)=>void 0!==e&&(t||e&&d)?-e:e;return[{years:h(kr(r)),months:h(kr(i)),weeks:h(kr(a)),days:h(kr(s)),hours:h(kr(n)),minutes:h(kr(o)),seconds:h(kr(l),"-0"===l),milliseconds:h(Ar(c),u)}]}const Ci={GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function Di(e,t,r,i,a,s,n){const o={year:2===t.length?Vr(Dr(t)):Dr(t),month:Ur.indexOf(r)+1,day:Dr(i),hour:Dr(a),minute:Dr(s)};return n&&(o.second=Dr(n)),e&&(o.weekday=e.length>3?Wr.indexOf(e)+1:qr.indexOf(e)+1),o}const ki=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;function Ai(e){const[,t,r,i,a,s,n,o,l,c,d,u]=e,h=Di(t,a,i,r,s,n,o);let p;return p=l?Ci[l]:c?0:Pr(d,u),[h,new Pt(p)]}const Mi=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,Ti=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,Li=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;function Ei(e){const[,t,r,i,a,s,n,o]=e;return[Di(t,a,i,r,s,n,o),Pt.utcInstance]}function Oi(e){const[,t,r,i,a,s,n,o]=e;return[Di(t,o,r,i,a,s,n),Pt.utcInstance]}const Ii=ni(/([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,pi),Ni=ni(/(\d{4})-?W(\d\d)(?:-?(\d))?/,pi),Vi=ni(/(\d{4})-?(\d{3})/,pi),zi=ni(hi),Pi=oi(function(e,t){return[{year:yi(e,t),month:yi(e,t+1,1),day:yi(e,t+2,1)},null,t+3]},bi,wi,xi),Hi=oi(gi,bi,wi,xi),Fi=oi(mi,bi,wi,xi),ji=oi(bi,wi,xi);const Gi=oi(bi);const Ri=ni(/(\d{4})-(\d\d)-(\d\d)/,vi),Ui=ni(fi),Zi=oi(bi,wi,xi);const Bi="Invalid Duration",Wi={weeks:{days:7,hours:168,minutes:10080,seconds:604800,milliseconds:6048e5},days:{hours:24,minutes:1440,seconds:86400,milliseconds:864e5},hours:{minutes:60,seconds:3600,milliseconds:36e5},minutes:{seconds:60,milliseconds:6e4},seconds:{milliseconds:1e3}},qi={years:{quarters:4,months:12,weeks:52,days:365,hours:8760,minutes:525600,seconds:31536e3,milliseconds:31536e6},quarters:{months:3,weeks:13,days:91,hours:2184,minutes:131040,seconds:7862400,milliseconds:78624e5},months:{weeks:4,days:30,hours:720,minutes:43200,seconds:2592e3,milliseconds:2592e6},...Wi},Yi=365.2425,Ji=30.436875,Qi={years:{quarters:4,months:12,weeks:52.1775,days:Yi,hours:8765.82,minutes:525949.2,seconds:525949.2*60,milliseconds:525949.2*60*1e3},quarters:{months:3,weeks:13.044375,days:91.310625,hours:2191.455,minutes:131487.3,seconds:525949.2*60/4,milliseconds:7889237999.999999},months:{weeks:4.3481250000000005,days:Ji,hours:730.485,minutes:43829.1,seconds:2629746,milliseconds:2629746e3},...Wi},Ki=["years","quarters","months","weeks","days","hours","minutes","seconds","milliseconds"],Xi=Ki.slice(0).reverse();function ea(e,t,r=!1){const i={values:r?t.values:{...e.values,...t.values||{}},loc:e.loc.clone(t.loc),conversionAccuracy:t.conversionAccuracy||e.conversionAccuracy,matrix:t.matrix||e.matrix};return new aa(i)}function ta(e,t){let r=t.milliseconds??0;for(const i of Xi.slice(1))t[i]&&(r+=t[i]*e[i].milliseconds);return r}function ra(e,t){const r=ta(e,t)<0?-1:1;Ki.reduceRight((i,a)=>{if(fr(t[a]))return i;if(i){const s=t[i]*r,n=e[a][i],o=Math.floor(s/n);t[a]+=o*r,t[i]-=o*n*r}return a},null),Ki.reduce((r,i)=>{if(fr(t[i]))return r;if(r){const a=t[r]%1;t[r]-=a,t[i]+=a*e[r][i]}return i},null)}function ia(e){const t={};for(const[r,i]of Object.entries(e))0!==i&&(t[r]=i);return t}class aa{constructor(e){const t="longterm"===e.conversionAccuracy||!1;let r=t?Qi:qi;e.matrix&&(r=e.matrix),this.values=e.values,this.loc=e.loc||Vt.create(),this.conversionAccuracy=t?"longterm":"casual",this.invalid=e.invalid||null,this.matrix=r,this.isLuxonDuration=!0}static fromMillis(e,t){return aa.fromObject({milliseconds:e},t)}static fromObject(e,t={}){if(null==e||"object"!=typeof e)throw new Ge("Duration.fromObject: argument expected to be an object, got "+(null===e?"null":typeof e));return new aa({values:Fr(e,aa.normalizeUnit),loc:Vt.fromObject(t),conversionAccuracy:t.conversionAccuracy,matrix:t.matrix})}static fromDurationLike(e){if(vr(e))return aa.fromMillis(e);if(aa.isDuration(e))return e;if("object"==typeof e)return aa.fromObject(e);throw new Ge(`Unknown duration argument ${e} of type ${typeof e}`)}static fromISO(e,t){const[r]=function(e){return li(e,[$i,Si])}(e);return r?aa.fromObject(r,t):aa.invalid("unparsable",`the input "${e}" can't be parsed as ISO 8601`)}static fromISOTime(e,t){const[r]=function(e){return li(e,[_i,Gi])}(e);return r?aa.fromObject(r,t):aa.invalid("unparsable",`the input "${e}" can't be parsed as ISO 8601`)}static invalid(e,t=null){if(!e)throw new Ge("need to specify a reason the Duration is invalid");const r=e instanceof tr?e:new tr(e,t);if(er.throwOnInvalid)throw new He(r);return new aa({invalid:r})}static normalizeUnit(e){const t={year:"years",years:"years",quarter:"quarters",quarters:"quarters",month:"months",months:"months",week:"weeks",weeks:"weeks",day:"days",days:"days",hour:"hours",hours:"hours",minute:"minutes",minutes:"minutes",second:"seconds",seconds:"seconds",millisecond:"milliseconds",milliseconds:"milliseconds"}[e?e.toLowerCase():e];if(!t)throw new je(e);return t}static isDuration(e){return e&&e.isLuxonDuration||!1}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}toFormat(e,t={}){const r={...t,floor:!1!==t.round&&!1!==t.floor};return this.isValid?ai.create(this.loc,r).formatDurationFromString(this,e):Bi}toHuman(e={}){if(!this.isValid)return Bi;const t=!1!==e.showZeros,r=Ki.map(r=>{const i=this.values[r];return fr(i)||0===i&&!t?null:this.loc.numberFormatter({style:"unit",unitDisplay:"long",...e,unit:r.slice(0,-1)}).format(i)}).filter(e=>e);return this.loc.listFormatter({type:"conjunction",style:e.listStyle||"narrow",...e}).format(r)}toObject(){return this.isValid?{...this.values}:{}}toISO(){if(!this.isValid)return null;let e="P";return 0!==this.years&&(e+=this.years+"Y"),0===this.months&&0===this.quarters||(e+=this.months+3*this.quarters+"M"),0!==this.weeks&&(e+=this.weeks+"W"),0!==this.days&&(e+=this.days+"D"),0===this.hours&&0===this.minutes&&0===this.seconds&&0===this.milliseconds||(e+="T"),0!==this.hours&&(e+=this.hours+"H"),0!==this.minutes&&(e+=this.minutes+"M"),0===this.seconds&&0===this.milliseconds||(e+=Mr(this.seconds+this.milliseconds/1e3,3)+"S"),"P"===e&&(e+="T0S"),e}toISOTime(e={}){if(!this.isValid)return null;const t=this.toMillis();if(t<0||t>=864e5)return null;e={suppressMilliseconds:!1,suppressSeconds:!1,includePrefix:!1,format:"extended",...e,includeOffset:!1};return Qa.fromMillis(t,{zone:"UTC"}).toISOTime(e)}toJSON(){return this.toISO()}toString(){return this.toISO()}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Duration { values: ${JSON.stringify(this.values)} }`:`Duration { Invalid, reason: ${this.invalidReason} }`}toMillis(){return this.isValid?ta(this.matrix,this.values):NaN}valueOf(){return this.toMillis()}plus(e){if(!this.isValid)return this;const t=aa.fromDurationLike(e),r={};for(const e of Ki)(_r(t.values,e)||_r(this.values,e))&&(r[e]=t.get(e)+this.get(e));return ea(this,{values:r},!0)}minus(e){if(!this.isValid)return this;const t=aa.fromDurationLike(e);return this.plus(t.negate())}mapUnits(e){if(!this.isValid)return this;const t={};for(const r of Object.keys(this.values))t[r]=Hr(e(this.values[r],r));return ea(this,{values:t},!0)}get(e){return this[aa.normalizeUnit(e)]}set(e){if(!this.isValid)return this;return ea(this,{values:{...this.values,...Fr(e,aa.normalizeUnit)}})}reconfigure({locale:e,numberingSystem:t,conversionAccuracy:r,matrix:i}={}){return ea(this,{loc:this.loc.clone({locale:e,numberingSystem:t}),matrix:i,conversionAccuracy:r})}as(e){return this.isValid?this.shiftTo(e).get(e):NaN}normalize(){if(!this.isValid)return this;const e=this.toObject();return ra(this.matrix,e),ea(this,{values:e},!0)}rescale(){if(!this.isValid)return this;return ea(this,{values:ia(this.normalize().shiftToAll().toObject())},!0)}shiftTo(...e){if(!this.isValid)return this;if(0===e.length)return this;e=e.map(e=>aa.normalizeUnit(e));const t={},r={},i=this.toObject();let a;for(const s of Ki)if(e.indexOf(s)>=0){a=s;let e=0;for(const t in r)e+=this.matrix[t][s]*r[t],r[t]=0;vr(i[s])&&(e+=i[s]);const n=Math.trunc(e);t[s]=n,r[s]=(1e3*e-1e3*n)/1e3}else vr(i[s])&&(r[s]=i[s]);for(const e in r)0!==r[e]&&(t[a]+=e===a?r[e]:r[e]/this.matrix[a][e]);return ra(this.matrix,t),ea(this,{values:t},!0)}shiftToAll(){return this.isValid?this.shiftTo("years","months","weeks","days","hours","minutes","seconds","milliseconds"):this}negate(){if(!this.isValid)return this;const e={};for(const t of Object.keys(this.values))e[t]=0===this.values[t]?0:-this.values[t];return ea(this,{values:e},!0)}removeZeros(){if(!this.isValid)return this;return ea(this,{values:ia(this.values)},!0)}get years(){return this.isValid?this.values.years||0:NaN}get quarters(){return this.isValid?this.values.quarters||0:NaN}get months(){return this.isValid?this.values.months||0:NaN}get weeks(){return this.isValid?this.values.weeks||0:NaN}get days(){return this.isValid?this.values.days||0:NaN}get hours(){return this.isValid?this.values.hours||0:NaN}get minutes(){return this.isValid?this.values.minutes||0:NaN}get seconds(){return this.isValid?this.values.seconds||0:NaN}get milliseconds(){return this.isValid?this.values.milliseconds||0:NaN}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}equals(e){if(!this.isValid||!e.isValid)return!1;if(!this.loc.equals(e.loc))return!1;function t(e,t){return void 0===e||0===e?void 0===t||0===t:e===t}for(const r of Ki)if(!t(this.values[r],e.values[r]))return!1;return!0}}const sa="Invalid Interval";class na{constructor(e){this.s=e.start,this.e=e.end,this.invalid=e.invalid||null,this.isLuxonInterval=!0}static invalid(e,t=null){if(!e)throw new Ge("need to specify a reason the Interval is invalid");const r=e instanceof tr?e:new tr(e,t);if(er.throwOnInvalid)throw new Pe(r);return new na({invalid:r})}static fromDateTimes(e,t){const r=Ka(e),i=Ka(t),a=function(e,t){return e&&e.isValid?t&&t.isValid?t<e?na.invalid("end before start",`The end of an interval must be after its start, but you had start=${e.toISO()} and end=${t.toISO()}`):null:na.invalid("missing or invalid end"):na.invalid("missing or invalid start")}(r,i);return null==a?new na({start:r,end:i}):a}static after(e,t){const r=aa.fromDurationLike(t),i=Ka(e);return na.fromDateTimes(i,i.plus(r))}static before(e,t){const r=aa.fromDurationLike(t),i=Ka(e);return na.fromDateTimes(i.minus(r),i)}static fromISO(e,t){const[r,i]=(e||"").split("/",2);if(r&&i){let e,a,s,n;try{e=Qa.fromISO(r,t),a=e.isValid}catch(i){a=!1}try{s=Qa.fromISO(i,t),n=s.isValid}catch(i){n=!1}if(a&&n)return na.fromDateTimes(e,s);if(a){const r=aa.fromISO(i,t);if(r.isValid)return na.after(e,r)}else if(n){const e=aa.fromISO(r,t);if(e.isValid)return na.before(s,e)}}return na.invalid("unparsable",`the input "${e}" can't be parsed as ISO 8601`)}static isInterval(e){return e&&e.isLuxonInterval||!1}get start(){return this.isValid?this.s:null}get end(){return this.isValid?this.e:null}get lastDateTime(){return this.isValid&&this.e?this.e.minus(1):null}get isValid(){return null===this.invalidReason}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}length(e="milliseconds"){return this.isValid?this.toDuration(e).get(e):NaN}count(e="milliseconds",t){if(!this.isValid)return NaN;const r=this.start.startOf(e,t);let i;return i=t?.useLocaleWeeks?this.end.reconfigure({locale:r.locale}):this.end,i=i.startOf(e,t),Math.floor(i.diff(r,e).get(e))+(i.valueOf()!==this.end.valueOf())}hasSame(e){return!!this.isValid&&(this.isEmpty()||this.e.minus(1).hasSame(this.s,e))}isEmpty(){return this.s.valueOf()===this.e.valueOf()}isAfter(e){return!!this.isValid&&this.s>e}isBefore(e){return!!this.isValid&&this.e<=e}contains(e){return!!this.isValid&&(this.s<=e&&this.e>e)}set({start:e,end:t}={}){return this.isValid?na.fromDateTimes(e||this.s,t||this.e):this}splitAt(...e){if(!this.isValid)return[];const t=e.map(Ka).filter(e=>this.contains(e)).sort((e,t)=>e.toMillis()-t.toMillis()),r=[];let{s:i}=this,a=0;for(;i<this.e;){const e=t[a]||this.e,s=+e>+this.e?this.e:e;r.push(na.fromDateTimes(i,s)),i=s,a+=1}return r}splitBy(e){const t=aa.fromDurationLike(e);if(!this.isValid||!t.isValid||0===t.as("milliseconds"))return[];let r,{s:i}=this,a=1;const s=[];for(;i<this.e;){const e=this.start.plus(t.mapUnits(e=>e*a));r=+e>+this.e?this.e:e,s.push(na.fromDateTimes(i,r)),i=r,a+=1}return s}divideEqually(e){return this.isValid?this.splitBy(this.length()/e).slice(0,e):[]}overlaps(e){return this.e>e.s&&this.s<e.e}abutsStart(e){return!!this.isValid&&+this.e===+e.s}abutsEnd(e){return!!this.isValid&&+e.e===+this.s}engulfs(e){return!!this.isValid&&(this.s<=e.s&&this.e>=e.e)}equals(e){return!(!this.isValid||!e.isValid)&&(this.s.equals(e.s)&&this.e.equals(e.e))}intersection(e){if(!this.isValid)return this;const t=this.s>e.s?this.s:e.s,r=this.e<e.e?this.e:e.e;return t>=r?null:na.fromDateTimes(t,r)}union(e){if(!this.isValid)return this;const t=this.s<e.s?this.s:e.s,r=this.e>e.e?this.e:e.e;return na.fromDateTimes(t,r)}static merge(e){const[t,r]=e.sort((e,t)=>e.s-t.s).reduce(([e,t],r)=>t?t.overlaps(r)||t.abutsStart(r)?[e,t.union(r)]:[e.concat([t]),r]:[e,r],[[],null]);return r&&t.push(r),t}static xor(e){let t=null,r=0;const i=[],a=e.map(e=>[{time:e.s,type:"s"},{time:e.e,type:"e"}]),s=Array.prototype.concat(...a).sort((e,t)=>e.time-t.time);for(const e of s)r+="s"===e.type?1:-1,1===r?t=e.time:(t&&+t!==+e.time&&i.push(na.fromDateTimes(t,e.time)),t=null);return na.merge(i)}difference(...e){return na.xor([this].concat(e)).map(e=>this.intersection(e)).filter(e=>e&&!e.isEmpty())}toString(){return this.isValid?`[${this.s.toISO()} – ${this.e.toISO()})`:sa}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`:`Interval { Invalid, reason: ${this.invalidReason} }`}toLocaleString(e=We,t={}){return this.isValid?ai.create(this.s.loc.clone(t),e).formatInterval(this):sa}toISO(e){return this.isValid?`${this.s.toISO(e)}/${this.e.toISO(e)}`:sa}toISODate(){return this.isValid?`${this.s.toISODate()}/${this.e.toISODate()}`:sa}toISOTime(e){return this.isValid?`${this.s.toISOTime(e)}/${this.e.toISOTime(e)}`:sa}toFormat(e,{separator:t=" – "}={}){return this.isValid?`${this.s.toFormat(e)}${t}${this.e.toFormat(e)}`:sa}toDuration(e,t){return this.isValid?this.e.diff(this.s,e,t):aa.invalid(this.invalidReason)}mapEndpoints(e){return na.fromDateTimes(e(this.s),e(this.e))}}class oa{static hasDST(e=er.defaultZone){const t=Qa.now().setZone(e).set({month:12});return!e.isUniversal&&t.offset!==t.set({month:6}).offset}static isValidIANAZone(e){return xt.isValidZone(e)}static normalizeZone(e){return Ft(e,er.defaultZone)}static getStartOfWeek({locale:e=null,locObj:t=null}={}){return(t||Vt.create(e)).getStartOfWeek()}static getMinimumDaysInFirstWeek({locale:e=null,locObj:t=null}={}){return(t||Vt.create(e)).getMinDaysInFirstWeek()}static getWeekendWeekdays({locale:e=null,locObj:t=null}={}){return(t||Vt.create(e)).getWeekendDays().slice()}static months(e="long",{locale:t=null,numberingSystem:r=null,locObj:i=null,outputCalendar:a="gregory"}={}){return(i||Vt.create(t,r,a)).months(e)}static monthsFormat(e="long",{locale:t=null,numberingSystem:r=null,locObj:i=null,outputCalendar:a="gregory"}={}){return(i||Vt.create(t,r,a)).months(e,!0)}static weekdays(e="long",{locale:t=null,numberingSystem:r=null,locObj:i=null}={}){return(i||Vt.create(t,r,null)).weekdays(e)}static weekdaysFormat(e="long",{locale:t=null,numberingSystem:r=null,locObj:i=null}={}){return(i||Vt.create(t,r,null)).weekdays(e,!0)}static meridiems({locale:e=null}={}){return Vt.create(e).meridiems()}static eras(e="short",{locale:t=null}={}){return Vt.create(t,null,"gregory").eras(e)}static features(){return{relative:br(),localeWeek:wr()}}}function la(e,t){const r=e=>e.toUTC(0,{keepLocalTime:!0}).startOf("day").valueOf(),i=r(t)-r(e);return Math.floor(aa.fromMillis(i).as("days"))}function ca(e,t,r,i){let[a,s,n,o]=function(e,t,r){const i=[["years",(e,t)=>t.year-e.year],["quarters",(e,t)=>t.quarter-e.quarter+4*(t.year-e.year)],["months",(e,t)=>t.month-e.month+12*(t.year-e.year)],["weeks",(e,t)=>{const r=la(e,t);return(r-r%7)/7}],["days",la]],a={},s=e;let n,o;for(const[l,c]of i)r.indexOf(l)>=0&&(n=l,a[l]=c(e,t),o=s.plus(a),o>t?(a[l]--,(e=s.plus(a))>t&&(o=e,a[l]--,e=s.plus(a))):e=o);return[e,a,o,n]}(e,t,r);const l=t-a,c=r.filter(e=>["hours","minutes","seconds","milliseconds"].indexOf(e)>=0);0===c.length&&(n<t&&(n=a.plus({[o]:1})),n!==a&&(s[o]=(s[o]||0)+l/(n-a)));const d=aa.fromObject(s,i);return c.length>0?aa.fromMillis(l,i).shiftTo(...c).plus(d):d}function da(e,t=e=>e){return{regex:e,deser:([e])=>t(function(e){let t=parseInt(e,10);if(isNaN(t)){t="";for(let r=0;r<e.length;r++){const i=e.charCodeAt(r);if(-1!==e[r].search(jt.hanidec))t+=Rt.indexOf(e[r]);else for(const e in Gt){const[r,a]=Gt[e];i>=r&&i<=a&&(t+=i-r)}}return parseInt(t,10)}return t}(e))}}const ua=`[ ${String.fromCharCode(160)}]`,ha=new RegExp(ua,"g");function pa(e){return e.replace(/\./g,"\\.?").replace(ha,ua)}function ga(e){return e.replace(/\./g,"").replace(ha," ").toLowerCase()}function ma(e,t){return null===e?null:{regex:RegExp(e.map(pa).join("|")),deser:([r])=>e.findIndex(e=>ga(r)===ga(e))+t}}function fa(e,t){return{regex:e,deser:([,e,t])=>Pr(e,t),groups:t}}function va(e){return{regex:e,deser:([e])=>e}}const ya={year:{"2-digit":"yy",numeric:"yyyyy"},month:{numeric:"M","2-digit":"MM",short:"MMM",long:"MMMM"},day:{numeric:"d","2-digit":"dd"},weekday:{short:"EEE",long:"EEEE"},dayperiod:"a",dayPeriod:"a",hour12:{numeric:"h","2-digit":"hh"},hour24:{numeric:"H","2-digit":"HH"},minute:{numeric:"m","2-digit":"mm"},second:{numeric:"s","2-digit":"ss"},timeZoneName:{long:"ZZZZZ",short:"ZZZ"}};let ba=null;function wa(e,t){return Array.prototype.concat(...e.map(e=>function(e,t){if(e.literal)return e;const r=$a(ai.macroTokenToFormatOpts(e.val),t);return null==r||r.includes(void 0)?e:r}(e,t)))}class xa{constructor(e,t){if(this.locale=e,this.format=t,this.tokens=wa(ai.parseFormat(t),e),this.units=this.tokens.map(t=>function(e,t){const r=Zt(t),i=Zt(t,"{2}"),a=Zt(t,"{3}"),s=Zt(t,"{4}"),n=Zt(t,"{6}"),o=Zt(t,"{1,2}"),l=Zt(t,"{1,3}"),c=Zt(t,"{1,6}"),d=Zt(t,"{1,9}"),u=Zt(t,"{2,4}"),h=Zt(t,"{4,6}"),p=e=>{return{regex:RegExp((t=e.val,t.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"))),deser:([e])=>e,literal:!0};var t},g=(g=>{if(e.literal)return p(g);switch(g.val){case"G":return ma(t.eras("short"),0);case"GG":return ma(t.eras("long"),0);case"y":return da(c);case"yy":case"kk":return da(u,Vr);case"yyyy":case"kkkk":return da(s);case"yyyyy":return da(h);case"yyyyyy":return da(n);case"M":case"L":case"d":case"H":case"h":case"m":case"q":case"s":case"W":return da(o);case"MM":case"LL":case"dd":case"HH":case"hh":case"mm":case"qq":case"ss":case"WW":return da(i);case"MMM":return ma(t.months("short",!0),1);case"MMMM":return ma(t.months("long",!0),1);case"LLL":return ma(t.months("short",!1),1);case"LLLL":return ma(t.months("long",!1),1);case"o":case"S":return da(l);case"ooo":case"SSS":return da(a);case"u":return va(d);case"uu":return va(o);case"uuu":case"E":case"c":return da(r);case"a":return ma(t.meridiems(),0);case"EEE":return ma(t.weekdays("short",!1),1);case"EEEE":return ma(t.weekdays("long",!1),1);case"ccc":return ma(t.weekdays("short",!0),1);case"cccc":return ma(t.weekdays("long",!0),1);case"Z":case"ZZ":return fa(new RegExp(`([+-]${o.source})(?::(${i.source}))?`),2);case"ZZZ":return fa(new RegExp(`([+-]${o.source})(${i.source})?`),2);case"z":return va(/[a-z_+-/]{1,256}?/i);case" ":return va(/[^\S\n\r]/);default:return p(g)}})(e)||{invalidReason:"missing Intl.DateTimeFormat.formatToParts support"};return g.token=e,g}(t,e)),this.disqualifyingUnit=this.units.find(e=>e.invalidReason),!this.disqualifyingUnit){const[e,t]=function(e){const t=e.map(e=>e.regex).reduce((e,t)=>`${e}(${t.source})`,"");return[`^${t}$`,e]}(this.units);this.regex=RegExp(e,"i"),this.handlers=t}}explainFromTokens(e){if(this.isValid){const[t,r]=function(e,t,r){const i=e.match(t);if(i){const e={};let t=1;for(const a in r)if(_r(r,a)){const s=r[a],n=s.groups?s.groups+1:1;!s.literal&&s.token&&(e[s.token.val[0]]=s.deser(i.slice(t,t+n))),t+=n}return[i,e]}return[i,{}]}(e,this.regex,this.handlers),[i,a,s]=r?function(e){let t,r=null;fr(e.z)||(r=xt.create(e.z)),fr(e.Z)||(r||(r=new Pt(e.Z)),t=e.Z),fr(e.q)||(e.M=3*(e.q-1)+1),fr(e.h)||(e.h<12&&1===e.a?e.h+=12:12===e.h&&0===e.a&&(e.h=0)),0===e.G&&e.y&&(e.y=-e.y),fr(e.u)||(e.S=Ar(e.u));const i=Object.keys(e).reduce((t,r)=>{const i=(e=>{switch(e){case"S":return"millisecond";case"s":return"second";case"m":return"minute";case"h":case"H":return"hour";case"d":return"day";case"o":return"ordinal";case"L":case"M":return"month";case"y":return"year";case"E":case"c":return"weekday";case"W":return"weekNumber";case"k":return"weekYear";case"q":return"quarter";default:return null}})(r);return i&&(t[i]=e[r]),t},{});return[i,r,t]}(r):[null,null,void 0];if(_r(r,"a")&&_r(r,"H"))throw new Fe("Can't include meridiem when specifying 24-hour format");return{input:e,tokens:this.tokens,regex:this.regex,rawMatches:t,matches:r,result:i,zone:a,specificOffset:s}}return{input:e,tokens:this.tokens,invalidReason:this.invalidReason}}get isValid(){return!this.disqualifyingUnit}get invalidReason(){return this.disqualifyingUnit?this.disqualifyingUnit.invalidReason:null}}function _a(e,t,r){return new xa(e,r).explainFromTokens(t)}function $a(e,t){if(!e)return null;const r=ai.create(t,e).dtFormatter((ba||(ba=Qa.fromMillis(1555555555555)),ba)),i=r.formatToParts(),a=r.resolvedOptions();return i.map(t=>function(e,t,r){const{type:i,value:a}=e;if("literal"===i){const e=/^\s+$/.test(a);return{literal:!e,val:e?" ":a}}const s=t[i];let n=i;"hour"===i&&(n=null!=t.hour12?t.hour12?"hour12":"hour24":null!=t.hourCycle?"h11"===t.hourCycle||"h12"===t.hourCycle?"hour12":"hour24":r.hour12?"hour12":"hour24");let o=ya[n];if("object"==typeof o&&(o=o[s]),o)return{literal:!1,val:o}}(t,e,a))}const Sa="Invalid DateTime",Ca=864e13;function Da(e){return new tr("unsupported zone",`the zone "${e.name}" is not supported`)}function ka(e){return null===e.weekData&&(e.weekData=cr(e.c)),e.weekData}function Aa(e){return null===e.localWeekData&&(e.localWeekData=cr(e.c,e.loc.getMinDaysInFirstWeek(),e.loc.getStartOfWeek())),e.localWeekData}function Ma(e,t){const r={ts:e.ts,zone:e.zone,c:e.c,o:e.o,loc:e.loc,invalid:e.invalid};return new Qa({...r,...t,old:r})}function Ta(e,t,r){let i=e-60*t*1e3;const a=r.offset(i);if(t===a)return[i,t];i-=60*(a-t)*1e3;const s=r.offset(i);return a===s?[i,a]:[e-60*Math.min(a,s)*1e3,Math.max(a,s)]}function La(e,t){const r=new Date(e+=60*t*1e3);return{year:r.getUTCFullYear(),month:r.getUTCMonth()+1,day:r.getUTCDate(),hour:r.getUTCHours(),minute:r.getUTCMinutes(),second:r.getUTCSeconds(),millisecond:r.getUTCMilliseconds()}}function Ea(e,t,r){return Ta(Or(e),t,r)}function Oa(e,t){const r=e.o,i=e.c.year+Math.trunc(t.years),a=e.c.month+Math.trunc(t.months)+3*Math.trunc(t.quarters),s={...e.c,year:i,month:a,day:Math.min(e.c.day,Er(i,a))+Math.trunc(t.days)+7*Math.trunc(t.weeks)},n=aa.fromObject({years:t.years-Math.trunc(t.years),quarters:t.quarters-Math.trunc(t.quarters),months:t.months-Math.trunc(t.months),weeks:t.weeks-Math.trunc(t.weeks),days:t.days-Math.trunc(t.days),hours:t.hours,minutes:t.minutes,seconds:t.seconds,milliseconds:t.milliseconds}).as("milliseconds"),o=Or(s);let[l,c]=Ta(o,r,e.zone);return 0!==n&&(l+=n,c=e.zone.offset(l)),{ts:l,o:c}}function Ia(e,t,r,i,a,s){const{setZone:n,zone:o}=r;if(e&&0!==Object.keys(e).length||t){const i=t||o,a=Qa.fromObject(e,{...r,zone:i,specificOffset:s});return n?a:a.setZone(o)}return Qa.invalid(new tr("unparsable",`the input "${a}" can't be parsed as ${i}`))}function Na(e,t,r=!0){return e.isValid?ai.create(Vt.create("en-US"),{allowZ:r,forceSimple:!0}).formatDateTimeFromString(e,t):null}function Va(e,t,r){const i=e.c.year>9999||e.c.year<0;let a="";if(i&&e.c.year>=0&&(a+="+"),a+=Cr(e.c.year,i?6:4),"year"===r)return a;if(t){if(a+="-",a+=Cr(e.c.month),"month"===r)return a;a+="-"}else if(a+=Cr(e.c.month),"month"===r)return a;return a+=Cr(e.c.day),a}function za(e,t,r,i,a,s,n){let o=!r||0!==e.c.millisecond||0!==e.c.second,l="";switch(n){case"day":case"month":case"year":break;default:if(l+=Cr(e.c.hour),"hour"===n)break;if(t){if(l+=":",l+=Cr(e.c.minute),"minute"===n)break;o&&(l+=":",l+=Cr(e.c.second))}else{if(l+=Cr(e.c.minute),"minute"===n)break;o&&(l+=Cr(e.c.second))}if("second"===n)break;!o||i&&0===e.c.millisecond||(l+=".",l+=Cr(e.c.millisecond,3))}return a&&(e.isOffsetFixed&&0===e.offset&&!s?l+="Z":e.o<0?(l+="-",l+=Cr(Math.trunc(-e.o/60)),l+=":",l+=Cr(Math.trunc(-e.o%60))):(l+="+",l+=Cr(Math.trunc(e.o/60)),l+=":",l+=Cr(Math.trunc(e.o%60)))),s&&(l+="["+e.zone.ianaName+"]"),l}const Pa={month:1,day:1,hour:0,minute:0,second:0,millisecond:0},Ha={weekNumber:1,weekday:1,hour:0,minute:0,second:0,millisecond:0},Fa={ordinal:1,hour:0,minute:0,second:0,millisecond:0},ja=["year","month","day","hour","minute","second","millisecond"],Ga=["weekYear","weekNumber","weekday","hour","minute","second","millisecond"],Ra=["year","ordinal","hour","minute","second","millisecond"];function Ua(e){const t={year:"year",years:"year",month:"month",months:"month",day:"day",days:"day",hour:"hour",hours:"hour",minute:"minute",minutes:"minute",quarter:"quarter",quarters:"quarter",second:"second",seconds:"second",millisecond:"millisecond",milliseconds:"millisecond",weekday:"weekday",weekdays:"weekday",weeknumber:"weekNumber",weeksnumber:"weekNumber",weeknumbers:"weekNumber",weekyear:"weekYear",weekyears:"weekYear",ordinal:"ordinal"}[e.toLowerCase()];if(!t)throw new je(e);return t}function Za(e){switch(e.toLowerCase()){case"localweekday":case"localweekdays":return"localWeekday";case"localweeknumber":case"localweeknumbers":return"localWeekNumber";case"localweekyear":case"localweekyears":return"localWeekYear";default:return Ua(e)}}function Ba(e,t){const r=Ft(t.zone,er.defaultZone);if(!r.isValid)return Qa.invalid(Da(r));const i=Vt.fromObject(t);let a,s;if(fr(e.year))a=er.now();else{for(const t of ja)fr(e[t])&&(e[t]=Pa[t]);const t=gr(e)||mr(e);if(t)return Qa.invalid(t);const i=function(e){if(void 0===Ya&&(Ya=er.now()),"iana"!==e.type)return e.offset(Ya);const t=e.name;let r=Ja.get(t);return void 0===r&&(r=e.offset(Ya),Ja.set(t,r)),r}(r);[a,s]=Ea(e,i,r)}return new Qa({ts:a,zone:r,loc:i,o:s})}function Wa(e,t,r){const i=!!fr(r.round)||r.round,a=fr(r.rounding)?"trunc":r.rounding,s=(e,s)=>{e=Mr(e,i||r.calendary?0:2,r.calendary?"round":a);return t.loc.clone(r).relFormatter(r).format(e,s)},n=i=>r.calendary?t.hasSame(e,i)?0:t.startOf(i).diff(e.startOf(i),i).get(i):t.diff(e,i).get(i);if(r.unit)return s(n(r.unit),r.unit);for(const e of r.units){const t=n(e);if(Math.abs(t)>=1)return s(t,e)}return s(e>t?-0:0,r.units[r.units.length-1])}function qa(e){let t,r={};return e.length>0&&"object"==typeof e[e.length-1]?(r=e[e.length-1],t=Array.from(e).slice(0,e.length-1)):t=Array.from(e),[r,t]}let Ya;const Ja=new Map;class Qa{constructor(e){const t=e.zone||er.defaultZone;let r=e.invalid||(Number.isNaN(e.ts)?new tr("invalid input"):null)||(t.isValid?null:Da(t));this.ts=fr(e.ts)?er.now():e.ts;let i=null,a=null;if(!r){if(e.old&&e.old.ts===this.ts&&e.old.zone.equals(t))[i,a]=[e.old.c,e.old.o];else{const s=vr(e.o)&&!e.old?e.o:t.offset(this.ts);i=La(this.ts,s),r=Number.isNaN(i.year)?new tr("invalid input"):null,i=r?null:i,a=r?null:s}}this._zone=t,this.loc=e.loc||Vt.create(),this.invalid=r,this.weekData=null,this.localWeekData=null,this.c=i,this.o=a,this.isLuxonDateTime=!0}static now(){return new Qa({})}static local(){const[e,t]=qa(arguments),[r,i,a,s,n,o,l]=t;return Ba({year:r,month:i,day:a,hour:s,minute:n,second:o,millisecond:l},e)}static utc(){const[e,t]=qa(arguments),[r,i,a,s,n,o,l]=t;return e.zone=Pt.utcInstance,Ba({year:r,month:i,day:a,hour:s,minute:n,second:o,millisecond:l},e)}static fromJSDate(e,t={}){const r=function(e){return"[object Date]"===Object.prototype.toString.call(e)}(e)?e.valueOf():NaN;if(Number.isNaN(r))return Qa.invalid("invalid input");const i=Ft(t.zone,er.defaultZone);return i.isValid?new Qa({ts:r,zone:i,loc:Vt.fromObject(t)}):Qa.invalid(Da(i))}static fromMillis(e,t={}){if(vr(e))return e<-Ca||e>Ca?Qa.invalid("Timestamp out of range"):new Qa({ts:e,zone:Ft(t.zone,er.defaultZone),loc:Vt.fromObject(t)});throw new Ge(`fromMillis requires a numerical input, but received a ${typeof e} with value ${e}`)}static fromSeconds(e,t={}){if(vr(e))return new Qa({ts:1e3*e,zone:Ft(t.zone,er.defaultZone),loc:Vt.fromObject(t)});throw new Ge("fromSeconds requires a numerical input")}static fromObject(e,t={}){e=e||{};const r=Ft(t.zone,er.defaultZone);if(!r.isValid)return Qa.invalid(Da(r));const i=Vt.fromObject(t),a=Fr(e,Za),{minDaysInFirstWeek:s,startOfWeek:n}=pr(a,i),o=er.now(),l=fr(t.specificOffset)?r.offset(o):t.specificOffset,c=!fr(a.ordinal),d=!fr(a.year),u=!fr(a.month)||!fr(a.day),h=d||u,p=a.weekYear||a.weekNumber;if((h||c)&&p)throw new Fe("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(u&&c)throw new Fe("Can't mix ordinal dates with month/day");const g=p||a.weekday&&!h;let m,f,v=La(o,l);g?(m=Ga,f=Ha,v=cr(v,s,n)):c?(m=Ra,f=Fa,v=ur(v)):(m=ja,f=Pa);let y=!1;for(const e of m){fr(a[e])?a[e]=y?f[e]:v[e]:y=!0}const b=g?function(e,t=4,r=1){const i=yr(e.weekYear),a=Sr(e.weekNumber,1,Nr(e.weekYear,t,r)),s=Sr(e.weekday,1,7);return i?a?!s&&ar("weekday",e.weekday):ar("week",e.weekNumber):ar("weekYear",e.weekYear)}(a,s,n):c?function(e){const t=yr(e.year),r=Sr(e.ordinal,1,Lr(e.year));return t?!r&&ar("ordinal",e.ordinal):ar("year",e.year)}(a):gr(a),w=b||mr(a);if(w)return Qa.invalid(w);const x=g?dr(a,s,n):c?hr(a):a,[_,$]=Ea(x,l,r),S=new Qa({ts:_,zone:r,o:$,loc:i});return a.weekday&&h&&e.weekday!==S.weekday?Qa.invalid("mismatched weekday",`you can't specify both a weekday of ${a.weekday} and a date of ${S.toISO()}`):S.isValid?S:Qa.invalid(S.invalid)}static fromISO(e,t={}){const[r,i]=function(e){return li(e,[Ii,Pi],[Ni,Hi],[Vi,Fi],[zi,ji])}(e);return Ia(r,i,t,"ISO 8601",e)}static fromRFC2822(e,t={}){const[r,i]=function(e){return li(function(e){return e.replace(/\([^()]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").trim()}(e),[ki,Ai])}(e);return Ia(r,i,t,"RFC 2822",e)}static fromHTTP(e,t={}){const[r,i]=function(e){return li(e,[Mi,Ei],[Ti,Ei],[Li,Oi])}(e);return Ia(r,i,t,"HTTP",t)}static fromFormat(e,t,r={}){if(fr(e)||fr(t))throw new Ge("fromFormat requires an input string and a format");const{locale:i=null,numberingSystem:a=null}=r,s=Vt.fromOpts({locale:i,numberingSystem:a,defaultToEN:!0}),[n,o,l,c]=function(e,t,r){const{result:i,zone:a,specificOffset:s,invalidReason:n}=_a(e,t,r);return[i,a,s,n]}(s,e,t);return c?Qa.invalid(c):Ia(n,o,r,`format ${t}`,e,l)}static fromString(e,t,r={}){return Qa.fromFormat(e,t,r)}static fromSQL(e,t={}){const[r,i]=function(e){return li(e,[Ri,Pi],[Ui,Zi])}(e);return Ia(r,i,t,"SQL",e)}static invalid(e,t=null){if(!e)throw new Ge("need to specify a reason the DateTime is invalid");const r=e instanceof tr?e:new tr(e,t);if(er.throwOnInvalid)throw new ze(r);return new Qa({invalid:r})}static isDateTime(e){return e&&e.isLuxonDateTime||!1}static parseFormatForOpts(e,t={}){const r=$a(e,Vt.fromObject(t));return r?r.map(e=>e?e.val:null).join(""):null}static expandFormat(e,t={}){return wa(ai.parseFormat(e),Vt.fromObject(t)).map(e=>e.val).join("")}static resetCache(){Ya=void 0,Ja.clear()}get(e){return this[e]}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}get outputCalendar(){return this.isValid?this.loc.outputCalendar:null}get zone(){return this._zone}get zoneName(){return this.isValid?this.zone.name:null}get year(){return this.isValid?this.c.year:NaN}get quarter(){return this.isValid?Math.ceil(this.c.month/3):NaN}get month(){return this.isValid?this.c.month:NaN}get day(){return this.isValid?this.c.day:NaN}get hour(){return this.isValid?this.c.hour:NaN}get minute(){return this.isValid?this.c.minute:NaN}get second(){return this.isValid?this.c.second:NaN}get millisecond(){return this.isValid?this.c.millisecond:NaN}get weekYear(){return this.isValid?ka(this).weekYear:NaN}get weekNumber(){return this.isValid?ka(this).weekNumber:NaN}get weekday(){return this.isValid?ka(this).weekday:NaN}get isWeekend(){return this.isValid&&this.loc.getWeekendDays().includes(this.weekday)}get localWeekday(){return this.isValid?Aa(this).weekday:NaN}get localWeekNumber(){return this.isValid?Aa(this).weekNumber:NaN}get localWeekYear(){return this.isValid?Aa(this).weekYear:NaN}get ordinal(){return this.isValid?ur(this.c).ordinal:NaN}get monthShort(){return this.isValid?oa.months("short",{locObj:this.loc})[this.month-1]:null}get monthLong(){return this.isValid?oa.months("long",{locObj:this.loc})[this.month-1]:null}get weekdayShort(){return this.isValid?oa.weekdays("short",{locObj:this.loc})[this.weekday-1]:null}get weekdayLong(){return this.isValid?oa.weekdays("long",{locObj:this.loc})[this.weekday-1]:null}get offset(){return this.isValid?+this.o:NaN}get offsetNameShort(){return this.isValid?this.zone.offsetName(this.ts,{format:"short",locale:this.locale}):null}get offsetNameLong(){return this.isValid?this.zone.offsetName(this.ts,{format:"long",locale:this.locale}):null}get isOffsetFixed(){return this.isValid?this.zone.isUniversal:null}get isInDST(){return!this.isOffsetFixed&&(this.offset>this.set({month:1,day:1}).offset||this.offset>this.set({month:5}).offset)}getPossibleOffsets(){if(!this.isValid||this.isOffsetFixed)return[this];const e=864e5,t=6e4,r=Or(this.c),i=this.zone.offset(r-e),a=this.zone.offset(r+e),s=this.zone.offset(r-i*t),n=this.zone.offset(r-a*t);if(s===n)return[this];const o=r-s*t,l=r-n*t,c=La(o,s),d=La(l,n);return c.hour===d.hour&&c.minute===d.minute&&c.second===d.second&&c.millisecond===d.millisecond?[Ma(this,{ts:o}),Ma(this,{ts:l})]:[this]}get isInLeapYear(){return Tr(this.year)}get daysInMonth(){return Er(this.year,this.month)}get daysInYear(){return this.isValid?Lr(this.year):NaN}get weeksInWeekYear(){return this.isValid?Nr(this.weekYear):NaN}get weeksInLocalWeekYear(){return this.isValid?Nr(this.localWeekYear,this.loc.getMinDaysInFirstWeek(),this.loc.getStartOfWeek()):NaN}resolvedLocaleOptions(e={}){const{locale:t,numberingSystem:r,calendar:i}=ai.create(this.loc.clone(e),e).resolvedOptions(this);return{locale:t,numberingSystem:r,outputCalendar:i}}toUTC(e=0,t={}){return this.setZone(Pt.instance(e),t)}toLocal(){return this.setZone(er.defaultZone)}setZone(e,{keepLocalTime:t=!1,keepCalendarTime:r=!1}={}){if((e=Ft(e,er.defaultZone)).equals(this.zone))return this;if(e.isValid){let i=this.ts;if(t||r){const t=e.offset(this.ts),r=this.toObject();[i]=Ea(r,t,e)}return Ma(this,{ts:i,zone:e})}return Qa.invalid(Da(e))}reconfigure({locale:e,numberingSystem:t,outputCalendar:r}={}){return Ma(this,{loc:this.loc.clone({locale:e,numberingSystem:t,outputCalendar:r})})}setLocale(e){return this.reconfigure({locale:e})}set(e){if(!this.isValid)return this;const t=Fr(e,Za),{minDaysInFirstWeek:r,startOfWeek:i}=pr(t,this.loc),a=!fr(t.weekYear)||!fr(t.weekNumber)||!fr(t.weekday),s=!fr(t.ordinal),n=!fr(t.year),o=!fr(t.month)||!fr(t.day),l=n||o,c=t.weekYear||t.weekNumber;if((l||s)&&c)throw new Fe("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(o&&s)throw new Fe("Can't mix ordinal dates with month/day");let d;a?d=dr({...cr(this.c,r,i),...t},r,i):fr(t.ordinal)?(d={...this.toObject(),...t},fr(t.day)&&(d.day=Math.min(Er(d.year,d.month),d.day))):d=hr({...ur(this.c),...t});const[u,h]=Ea(d,this.o,this.zone);return Ma(this,{ts:u,o:h})}plus(e){if(!this.isValid)return this;return Ma(this,Oa(this,aa.fromDurationLike(e)))}minus(e){if(!this.isValid)return this;return Ma(this,Oa(this,aa.fromDurationLike(e).negate()))}startOf(e,{useLocaleWeeks:t=!1}={}){if(!this.isValid)return this;const r={},i=aa.normalizeUnit(e);switch(i){case"years":r.month=1;case"quarters":case"months":r.day=1;case"weeks":case"days":r.hour=0;case"hours":r.minute=0;case"minutes":r.second=0;case"seconds":r.millisecond=0}if("weeks"===i)if(t){const e=this.loc.getStartOfWeek(),{weekday:t}=this;t<e&&(r.weekNumber=this.weekNumber-1),r.weekday=e}else r.weekday=1;if("quarters"===i){const e=Math.ceil(this.month/3);r.month=3*(e-1)+1}return this.set(r)}endOf(e,t){return this.isValid?this.plus({[e]:1}).startOf(e,t).minus(1):this}toFormat(e,t={}){return this.isValid?ai.create(this.loc.redefaultToEN(t)).formatDateTimeFromString(this,e):Sa}toLocaleString(e=We,t={}){return this.isValid?ai.create(this.loc.clone(t),e).formatDateTime(this):Sa}toLocaleParts(e={}){return this.isValid?ai.create(this.loc.clone(e),e).formatDateTimeParts(this):[]}toISO({format:e="extended",suppressSeconds:t=!1,suppressMilliseconds:r=!1,includeOffset:i=!0,extendedZone:a=!1,precision:s="milliseconds"}={}){if(!this.isValid)return null;const n="extended"===e;let o=Va(this,n,s=Ua(s));return ja.indexOf(s)>=3&&(o+="T"),o+=za(this,n,t,r,i,a,s),o}toISODate({format:e="extended",precision:t="day"}={}){return this.isValid?Va(this,"extended"===e,Ua(t)):null}toISOWeekDate(){return Na(this,"kkkk-'W'WW-c")}toISOTime({suppressMilliseconds:e=!1,suppressSeconds:t=!1,includeOffset:r=!0,includePrefix:i=!1,extendedZone:a=!1,format:s="extended",precision:n="milliseconds"}={}){if(!this.isValid)return null;return n=Ua(n),(i&&ja.indexOf(n)>=3?"T":"")+za(this,"extended"===s,t,e,r,a,n)}toRFC2822(){return Na(this,"EEE, dd LLL yyyy HH:mm:ss ZZZ",!1)}toHTTP(){return Na(this.toUTC(),"EEE, dd LLL yyyy HH:mm:ss 'GMT'")}toSQLDate(){return this.isValid?Va(this,!0):null}toSQLTime({includeOffset:e=!0,includeZone:t=!1,includeOffsetSpace:r=!0}={}){let i="HH:mm:ss.SSS";return(t||e)&&(r&&(i+=" "),t?i+="z":e&&(i+="ZZ")),Na(this,i,!0)}toSQL(e={}){return this.isValid?`${this.toSQLDate()} ${this.toSQLTime(e)}`:null}toString(){return this.isValid?this.toISO():Sa}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`:`DateTime { Invalid, reason: ${this.invalidReason} }`}valueOf(){return this.toMillis()}toMillis(){return this.isValid?this.ts:NaN}toSeconds(){return this.isValid?this.ts/1e3:NaN}toUnixInteger(){return this.isValid?Math.floor(this.ts/1e3):NaN}toJSON(){return this.toISO()}toBSON(){return this.toJSDate()}toObject(e={}){if(!this.isValid)return{};const t={...this.c};return e.includeConfig&&(t.outputCalendar=this.outputCalendar,t.numberingSystem=this.loc.numberingSystem,t.locale=this.loc.locale),t}toJSDate(){return new Date(this.isValid?this.ts:NaN)}diff(e,t="milliseconds",r={}){if(!this.isValid||!e.isValid)return aa.invalid("created by diffing an invalid DateTime");const i={locale:this.locale,numberingSystem:this.numberingSystem,...r},a=(o=t,Array.isArray(o)?o:[o]).map(aa.normalizeUnit),s=e.valueOf()>this.valueOf(),n=ca(s?this:e,s?e:this,a,i);var o;return s?n.negate():n}diffNow(e="milliseconds",t={}){return this.diff(Qa.now(),e,t)}until(e){return this.isValid?na.fromDateTimes(this,e):this}hasSame(e,t,r){if(!this.isValid)return!1;const i=e.valueOf(),a=this.setZone(e.zone,{keepLocalTime:!0});return a.startOf(t,r)<=i&&i<=a.endOf(t,r)}equals(e){return this.isValid&&e.isValid&&this.valueOf()===e.valueOf()&&this.zone.equals(e.zone)&&this.loc.equals(e.loc)}toRelative(e={}){if(!this.isValid)return null;const t=e.base||Qa.fromObject({},{zone:this.zone}),r=e.padding?this<t?-e.padding:e.padding:0;let i=["years","months","days","hours","minutes","seconds"],a=e.unit;return Array.isArray(e.unit)&&(i=e.unit,a=void 0),Wa(t,this.plus(r),{...e,numeric:"always",units:i,unit:a})}toRelativeCalendar(e={}){return this.isValid?Wa(e.base||Qa.fromObject({},{zone:this.zone}),this,{...e,numeric:"auto",units:["years","months","days"],calendary:!0}):null}static min(...e){if(!e.every(Qa.isDateTime))throw new Ge("min requires all arguments be DateTimes");return xr(e,e=>e.valueOf(),Math.min)}static max(...e){if(!e.every(Qa.isDateTime))throw new Ge("max requires all arguments be DateTimes");return xr(e,e=>e.valueOf(),Math.max)}static fromFormatExplain(e,t,r={}){const{locale:i=null,numberingSystem:a=null}=r;return _a(Vt.fromOpts({locale:i,numberingSystem:a,defaultToEN:!0}),e,t)}static fromStringExplain(e,t,r={}){return Qa.fromFormatExplain(e,t,r)}static buildFormatParser(e,t={}){const{locale:r=null,numberingSystem:i=null}=t,a=Vt.fromOpts({locale:r,numberingSystem:i,defaultToEN:!0});return new xa(a,e)}static fromFormatParser(e,t,r={}){if(fr(e)||fr(t))throw new Ge("fromFormatParser requires an input string and a format parser");const{locale:i=null,numberingSystem:a=null}=r,s=Vt.fromOpts({locale:i,numberingSystem:a,defaultToEN:!0});if(!s.equals(t.locale))throw new Ge(`fromFormatParser called with a locale of ${s}, but the format parser was created for ${t.locale}`);const{result:n,zone:o,specificOffset:l,invalidReason:c}=t.explainFromTokens(e);return c?Qa.invalid(c):Ia(n,o,r,`format ${t.format}`,e,l)}static get DATE_SHORT(){return We}static get DATE_MED(){return qe}static get DATE_MED_WITH_WEEKDAY(){return Ye}static get DATE_FULL(){return Je}static get DATE_HUGE(){return Qe}static get TIME_SIMPLE(){return Ke}static get TIME_WITH_SECONDS(){return Xe}static get TIME_WITH_SHORT_OFFSET(){return et}static get TIME_WITH_LONG_OFFSET(){return tt}static get TIME_24_SIMPLE(){return rt}static get TIME_24_WITH_SECONDS(){return it}static get TIME_24_WITH_SHORT_OFFSET(){return at}static get TIME_24_WITH_LONG_OFFSET(){return st}static get DATETIME_SHORT(){return nt}static get DATETIME_SHORT_WITH_SECONDS(){return ot}static get DATETIME_MED(){return lt}static get DATETIME_MED_WITH_SECONDS(){return ct}static get DATETIME_MED_WITH_WEEKDAY(){return dt}static get DATETIME_FULL(){return ut}static get DATETIME_FULL_WITH_SECONDS(){return ht}static get DATETIME_HUGE(){return pt}static get DATETIME_HUGE_WITH_SECONDS(){return gt}}function Ka(e){if(Qa.isDateTime(e))return e;if(e&&e.valueOf&&vr(e.valueOf()))return Qa.fromJSDate(e);if(e&&"object"==typeof e)return Qa.fromObject(e);throw new Ge(`Unknown datetime argument: ${e}, of type ${typeof e}`)}const Xa=o`
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
`;class es{static normalizeStage(e){const t=e.toLowerCase();return"veg"===t?"vegetative":"mom"===t?"mother":t}static getPlantStageColor(e){const t=this.normalizeStage(e);return this.stageColors[t]??"#757575"}static getPlantStageIcon(e){const t=this.normalizeStage(e);return this.stageIcons[t]??Te}static getPlantStage(e){const t=e?.attributes??{},r=new Date;return t.cure_start?"cure":t.dry_start?"dry":t.mom_start?"mother":t.clone_start?"clone":t.flower_start&&new Date(t.flower_start)<=r?"flower":t.veg_start&&new Date(t.veg_start)<=r?"vegetative":"seedling"}static createGridLayout(e,t,r){const i=Array.from({length:t},()=>Array.from({length:r},()=>null));return e.forEach(e=>{const a=(e.attributes?.row??1)-1,s=(e.attributes?.col??1)-1;a>=0&&a<t&&s>=0&&s<r&&(i[a][s]=e)}),{rows:t,cols:r,grid:i}}static calculateEffectiveRows(e){const{name:t,plants:r,plants_per_row:i,rows:a}=e;if("dry"===t||"cure"===t||"mother"===t||"clone"===t){if(0===r.length)return 1;const e=Math.max(...r.map(e=>e.attributes?.row||1)),t=r.filter(t=>(t.attributes?.row||1)===e).length;return t>=i?e+1:e}return a}static parseDateTimeLocal(e){if(e)try{const t=16===e.length?e+":00":e,r=new Date(t);if(isNaN(r.getTime()))return;const i=r.getFullYear(),a=String(r.getMonth()+1).padStart(2,"0"),s=String(r.getDate()).padStart(2,"0"),n=String(r.getHours()).padStart(2,"0"),o=String(r.getMinutes()).padStart(2,"0");return`${i}-${a}-${s}T${n}:${o}:${String(r.getSeconds()).padStart(2,"0")}`}catch{return}}static formatDateForBackend(e){if(e)try{const t=e.split("T");if(t.length>0&&t[0].match(/^\d{4}-\d{2}-\d{2}$/))return t[0];const r=new Date(e);if(isNaN(r.getTime()))return;const i=r.getFullYear(),a=String(r.getMonth()+1).padStart(2,"0");return`${i}-${a}-${String(r.getDate()).padStart(2,"0")}`}catch{return}}static getCurrentDateTime(){const e=new Date,t=e=>e.toString().padStart(2,"0");return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())}T${t(e.getHours())}:${t(e.getMinutes())}:00`}static toDateTimeLocal(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const r=e=>e.toString().padStart(2,"0"),i=t.getFullYear(),a=r(t.getMonth()+1),s=r(t.getDate()),n=r(t.getHours());return`${i}-${a}-${s}T${n}:${r(t.getMinutes())}`}catch{return""}}static getDominantStage(e){if(!e||0===e.length)return null;const t=["cure","dry","flower","vegetative","clone","mother","seedling"];let r=null,i=0;const a={};for(const t of e){const e=this.normalizeStage(t.state||this.getPlantStage(t));a[e]||(a[e]=[]),a[e].push(t)}for(const e of t)if(a[e]&&a[e].length>0){r=e;const t=`${"vegetative"===e?"veg":e}_days`,s=a[e].map(e=>{const r=e.attributes[t];return"number"==typeof r?r:0});i=Math.max(...s);break}return r?{stage:r,days:i}:null}static compressImage(e,t=800,r=800,i=.7){return new Promise((a,s)=>{const n=new FileReader;n.readAsDataURL(e),n.onload=e=>{const n=new Image;n.src=e.target?.result,n.onload=()=>{let e=n.width,o=n.height;e>o?e>t&&(o=Math.round(o*t/e),e=t):o>r&&(e=Math.round(e*r/o),o=r);const l=document.createElement("canvas");l.width=e,l.height=o;const c=l.getContext("2d");if(!c)return void s(new Error("Failed to get canvas context"));c.drawImage(n,0,0,e,o);const d=l.toDataURL("image/jpeg",i);a(d)},n.onerror=e=>s(e)},n.onerror=e=>s(e)})}}es.stageColors={mother:"#E91E63",clone:"#FF5722",seedling:"#4CAF50",vegetative:"#8BC34A",flower:"#FF9800",dry:"#795548",cure:"#9C27B0"},es.stageIcons={mother:Te,clone:Te,seedling:Te,vegetative:Te,flower:Ce,dry:De,cure:me};class ts{constructor(e){this.hass=e}getGrowspaceDevices(){if(!this.hass)return[];const e=Object.values(this.hass.states),t=e.filter(e=>e.entity_id.startsWith("sensor.")&&void 0!==e.attributes?.growspace_id&&void 0!==e.attributes?.rows&&void 0!==e.attributes?.plants_per_row&&void 0===e.attributes?.row&&void 0===e.attributes?.col),r=new Map;return t.forEach(e=>{const t=e.attributes.growspace_id;r.set(t,[])}),e.forEach(e=>{if(void 0!==e.attributes?.row&&void 0!==e.attributes?.col){const t=this.getGrowspaceId(e);r.has(t)||r.set(t,[]),r.get(t).push(e)}}),Array.from(r.entries()).map(([e,r])=>{const i=t.find(t=>t.attributes?.growspace_id===e),a=i?.attributes?.friendly_name||`Growspace ${e}`,s=i?.attributes?.type??(a.toLowerCase().includes("dry")?"dry":a.toLowerCase().includes("cure")?"cure":"normal");return n={device_id:e,overview_entity_id:i?.entity_id,name:a,plants:r,rows:i?.attributes?.rows??3,plants_per_row:i?.attributes?.plants_per_row??3,type:s},{...n,type:n.type??"normal"};var n})}getGrowspaceId(e){return e.attributes?.growspace_id||"unknown"}getStrainLibrary(){const e=Object.values(this.hass.states).find(e=>void 0!==e.attributes?.strains&&null!==e.attributes?.strains),t=e?.attributes?.strains;if(!t)return[];if(Array.isArray(t))return t.map(e=>({strain:e,phenotype:"",key:`${e}|default`}));if("object"==typeof t){const e=[];for(const[r,i]of Object.entries(t)){const t=i,a=t.analytics,s=t.meta||{};if(t.phenotypes&&"object"==typeof t.phenotypes){const i=Object.entries(t.phenotypes);if(i.length>0)for(const[t,n]of i){const i=n;let o;i.analytics?o=i.analytics:"number"==typeof i.avg_veg_days&&(o={avg_veg_days:i.avg_veg_days,avg_flower_days:i.avg_flower_days,total_harvests:i.total_harvests}),e.push({strain:r,phenotype:t,key:`${r}|${t}`,analytics:o,strain_analytics:a,image_crop_meta:i.image_crop_meta,breeder:i.breeder||s.breeder,type:i.type||s.type,lineage:i.lineage||s.lineage,sex:i.sex||s.sex,description:i.description||s.description,flowering_days_min:i.flower_days_min||s.flowering_days_min,flowering_days_max:i.flower_days_max||s.flowering_days_max,image:i.image_path||i.image||s.image,sativa_percentage:i.sativa_percentage||s.sativa_percentage,indica_percentage:i.indica_percentage||s.indica_percentage})}else e.push({strain:r,phenotype:"",key:`${r}|default`,strain_analytics:a,image_crop_meta:t.image_crop_meta,breeder:s.breeder,type:s.type,lineage:s.lineage,sex:s.sex,description:s.description,flowering_days_min:s.flowering_days_min,flowering_days_max:s.flowering_days_max,image:s.image,sativa_percentage:s.sativa_percentage,indica_percentage:s.indica_percentage})}else e.push({strain:r,phenotype:"",key:`${r}|default`,strain_analytics:a,image_crop_meta:t.image_crop_meta,breeder:s.breeder,type:s.type,lineage:s.lineage,sex:s.sex,description:s.description,flowering_days_min:s.flowering_days_min,flowering_days_max:s.flowering_days_max,image:s.image,sativa_percentage:s.sativa_percentage,indica_percentage:s.indica_percentage})}return e.sort((e,t)=>{const r=e.strain.localeCompare(t.strain);return 0!==r?r:(e.phenotype||"").localeCompare(t.phenotype||"")})}return[]}async getHistory(e,t,r){if(!this.hass)return[];let i=`history/period/${t.toISOString()}?filter_entity_id=${e}`;r&&(i+=`&end_time=${r.toISOString()}`);try{const e=await this.hass.callApi("GET",i);return e&&e.length>0?e[0]:[]}catch(e){return console.error("Error fetching history:",e),[]}}async addPlant(e){console.log("[DataService:addPlant] Sending payload:",e);try{"mother"!==e.growspace_id&&"mother_overview"!==e.growspace_id||(e.mother_start=(new Date).toISOString().split("T")[0]),"clone"!==e.growspace_id&&"clone_overview"!==e.growspace_id||(e.clone_start=(new Date).toISOString().split("T")[0]);const t=await this.hass.callService("growspace_manager","add_plant",e);return console.log("[DataService:addPlant] Response:",t),t}catch(e){throw console.error("[DataService:addPlant] Error:",e),e}}async updatePlant(e){console.log("[DataService:updatePlant] Sending payload:",e);try{const t=await this.hass.callService("growspace_manager","update_plant",e);return console.log("[DataService:updatePlant] Response:",t),t}catch(e){throw console.error("[DataService:updatePlant] Error:",e),e}}async removePlant(e){console.log("[DataService:removePlant] Removing plant_id:",e);try{const t=await this.hass.callService("growspace_manager","remove_plant",{plant_id:e});return console.log("[DataService:removePlant] Response:",t),t}catch(e){throw console.error("[DataService:removePlant] Error:",e),e}}async harvestPlant(e,t="dry"){console.log("[DataService:harvestPlant] Harvesting plant:",e,"→ target:",t);try{const r=(t||"").toLowerCase(),i={plant_id:e};r.includes("dry")?i.target_growspace_id="dry_overview":r.includes("cure")?i.target_growspace_id="cure_overview":r.includes("mother")?i.target_growspace_id="mother_overview":r.includes("clone")?i.target_growspace_id="clone_overview":r&&(i.target_growspace_name=t);const a=await this.hass.callService("growspace_manager","harvest_plant",i);return console.log("[DataService:harvestPlant] Response:",a),a}catch(e){throw console.error("[DataService:harvestPlant] Error:",e),e}}async takeClone(e,t="clone"){console.log("[DataService:takeClone] Cloning plant:",e,"→ target:",t);try{const r=(t||"").toLowerCase(),i={plant_id:e};r.includes("dry")?i.target_growspace_id="dry_overview":r.includes("cure")?i.target_growspace_id="cure_overview":r.includes("mother")?i.target_growspace_id="mother_overview":r.includes("clone")?i.target_growspace_id="clone_overview":r&&(i.target_growspace_name=t);const a=await this.hass.callService("growspace_manager","takeClone",i);return console.log("[DataService:takeClone] Response:",a),a}catch(e){throw console.error("[DataService:takeClone] Error:",e),e}}async swapPlants(e,t){console.log(`[DataService:swapPlants] Swapping plants: ${e} and ${t}`);try{const r=await this.hass.callService("growspace_manager","switch_plants",{plant1_id:e,plant2_id:t});return console.log("[DataService:swapPlants] Response:",r),r}catch(e){throw console.error("[DataService:swapPlants] Error:",e),e}}async addStrain(e){console.log("[DataService:addStrain] Adding strain:",e);try{const t={...e};Object.keys(t).forEach(e=>{void 0===t[e]&&delete t[e]}),e.image&&(e.image.startsWith("data:")?(t.image_base64=e.image,delete t.image):(t.image_path=e.image,delete t.image));const r=await this.hass.callService("growspace_manager","add_strain",t);return console.log("[DataService:addStrain] Response:",r),r}catch(e){throw console.error("[DataService:addStrain] Error:",e),e}}async removeStrain(e,t){console.log("[DataService:removeStrain] Removing strain:",e,t);try{const r=await this.hass.callService("growspace_manager","remove_strain",{strain:e,phenotype:t});return console.log("[DataService:removeStrain] Response:",r),r}catch(e){throw console.error("[DataService:removeStrain] Error:",e),e}}async importStrainLibrary(e,t){console.log("[DataService:importStrainLibrary] Importing strain library ZIP via HTTP. Replace:",t);const r=new FormData;r.append("file",e),r.append("replace",t.toString());try{const e=await fetch("/api/growspace_manager/import_strains",{method:"POST",body:r,headers:{Authorization:`Bearer ${this.hass.auth.data.access_token}`}});if(!e.ok){const t=await e.text();throw new Error(t||e.statusText)}const t=await e.json();if(console.log("[DataService:importStrainLibrary] Response:",t),t.success)return t;throw new Error(t.error||"Unknown import error")}catch(e){throw console.error("[DataService:importStrainLibrary] Error:",e),e}}async clearStrainLibrary(){console.log("[DataService:clearStrainLibrary] Clearing library");try{const e=await this.hass.callService("growspace_manager","clear_strain_library");return console.log("[DataService:clearStrainLibrary] Response:",e),e}catch(e){throw console.error("[DataService:clearStrainLibrary] Error:",e),e}}async addGrowspace(e){console.log("[DataService:addGrowspace] Adding growspace:",e);try{const t=await this.hass.callService("growspace_manager","add_growspace",e);return console.log("[DataService:addGrowspace] Response:",t),t}catch(e){throw console.error("[DataService:addGrowspace] Error:",e),e}}async configureGrowspaceSensors(e){console.log("[DataService:configureGrowspaceSensors] Configuring sensors:",e);try{const t=await this.hass.callService("growspace_manager","configure_growspace",e);return console.log("[DataService:configureGrowspaceSensors] Response:",t),t}catch(e){throw console.error("[DataService:configureGrowspaceSensors] Error:",e),e}}async configureGlobalSettings(e){console.log("[DataService:configureGlobalSettings] Configuring global settings:",e);try{const t=await this.hass.callService("growspace_manager","configure_global",e);return console.log("[DataService:configureGlobalSettings] Response:",t),t}catch(e){throw console.error("[DataService:configureGlobalSettings] Error:",e),e}}async askGrowAdvice(e,t){console.log("[DataService:askGrowAdvice] Asking advice for:",e,t);try{const r=await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"ask_grow_advice",service_data:{growspace_id:e,user_query:t},return_response:!0});return console.log("[DataService:askGrowAdvice] Response:",r),r}catch(e){throw console.error("[DataService:askGrowAdvice] Error:",e),e}}}class rs{static getCropStyle(e,t){return t?`\n      background-image: url('${e}');\n      background-size: ${100*t.scale}%;\n      background-position: ${t.x}% ${t.y}%;\n    `:`background-image: url('${e}')`}static renderAddPlantDialog(e,t,r){if(!e?.open)return R``;const i=[...new Set(t.map(e=>e.strain))].sort();return R`
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
                 <path d="${be}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${rs.renderMD3SelectInput("Strain *",e.strain||"",i,r.onStrainChange)}
               ${rs.renderMD3TextInput("Phenotype",e.phenotype||"",r.onPhenotypeChange)}
               <div style="display:flex; gap:16px;">
                 ${rs.renderMD3NumberInput("Row",e.row+1,e=>r.onRowChange(e))}
                 ${rs.renderMD3NumberInput("Col",e.col+1,e=>r.onColChange(e))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${rs.renderMD3DateInput("Vegetative Start",e.veg_start||"",r.onVegStartChange)}
               ${rs.renderMD3DateInput("Flower Start",e.flower_start||"",r.onFlowerStartChange)}
             </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${r.onClose}>
              Cancel
            </button>
            <button class="md3-button primary" @click=${r.onConfirm}>
              <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Te}"></path></svg>
              Add Plant
            </button>
          </div>

        </div>
      </ha-dialog>
    `}static renderPlantOverviewDialog(e,t,r){if(!e?.open)return R``;const{plant:i,editedAttributes:a}=e,s=i.attributes?.plant_id||i.entity_id.replace("sensor.",""),n=es.getPlantStageColor(i.state),o=es.getPlantStageIcon(i.state),l=(e,t)=>{a[e]="number"==typeof t?t.toString():t,r.onAttributeChange(e,a[e])};return R`
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
                 <path d="${be}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY & LOCATION CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${rs.renderMD3TextInput("Strain Name",a.strain||"",e=>r.onAttributeChange("strain",e))}
               ${rs.renderMD3TextInput("Phenotype",a.phenotype||"",e=>r.onAttributeChange("phenotype",e))}
               <div style="display:flex; gap:16px;">
                 ${rs.renderMD3NumberInput("Row",a.row||1,e=>r.onAttributeChange("row",parseInt(e)))}
                 ${rs.renderMD3NumberInput("Col",a.col||1,e=>r.onAttributeChange("col",parseInt(e)))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <h3>Timeline</h3>
               ${"mother"===a.stage?rs.renderMD3DateInput("Mother Start",a.mother_start??"",e=>l("mother_start",e)):Z}
               ${"clone"===a.stage?rs.renderMD3DateInput("Clone Start",a.clone_start??"",e=>l("clone_start",e)):Z}
               ${"veg"===a.stage||"flower"===a.stage?rs.renderMD3DateInput("Vegetative Start",a.veg_start??"",e=>l("veg_start",e)):Z}
               ${"flower"===a.stage?rs.renderMD3DateInput("Flower Start",a.flower_start??"",e=>l("flower_start",e)):Z}
               ${"dry"===a.stage||"cure"===a.stage?rs.renderMD3DateInput("Dry Start",a.dry_start??"",e=>l("dry_start",e)):Z}
               ${"cure"===a.stage?rs.renderMD3DateInput("Cure Start",a.cure_start??"",e=>l("cure_start",e)):Z}
             </div>

             <!-- STATS CARD -->
             ${rs.renderPlantStatsMD3(i)}

          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
             <button class="md3-button danger" @click=${()=>r.onDelete(s)}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${$e}"></path></svg>
               Delete
             </button>

             <button class="md3-button tonal" @click=${r.onUpdate}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${fe}"></path></svg>
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
                    @click=${e=>{const t=e.currentTarget.previousElementSibling,a=t?parseInt(t.value,10):1;r.onTakeClone(i,a)}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${_e}"></path></svg>
                    Take Clone
                  </button>
                </div>
             `:Z}

             ${"flower"===i.state.toLowerCase()?R`
               <button class="md3-button primary" @click=${()=>r.onHarvest(i)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ce}"></path></svg>
                 Harvest
               </button>
             `:Z}

             ${"dry"===i.state.toLowerCase()?R`
               <button class="md3-button primary" @click=${()=>r.onFinishDrying(i)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${me}"></path></svg>
                 Finish Drying
               </button>
             `:Z}

             ${"clone"===i.state.toLowerCase()?R`
               <div style="display:contents;">
                  <select class="md3-input" style="width: auto; height: 40px; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 0 16px;" id="clone-target-select">
                    <option value="">Move to...</option>
                    ${Object.entries(t).map(([e,t])=>R`<option value="${e}">${t}</option>`)}
                  </select>
                  <button class="md3-button primary"
                    @click=${e=>{const t=e.currentTarget.previousElementSibling;t.value?r.onMoveClone(i,t.value):alert("Select a growspace")}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"}"></path></svg>
                    Move
                  </button>
               </div>
             `:Z}
          </div>

        </div>
      </ha-dialog>
    `}static renderStrainLibraryDialog(e,t){return e?.open?R`
      <ha-dialog
        open
        @closed=${t.onClose}
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

          /* SCALE GRAPH */
          .scale-graph-container {
             width: 100%;
             height: 8px;
             background: rgba(255,255,255,0.1);
             border-radius: 4px;
             margin-top: 6px;
             position: relative;
             overflow: hidden;
             display: flex;
          }
          .sg-bar-sativa {
             background: #EAB308; /* Yellow/Orange */
             height: 100%;
          }
          .sg-bar-indica {
             background: #8B5CF6; /* Purple */
             height: 100%;
             position: absolute;
             right: 0;
             top: 0;
          }

          /* NEW HYBRID GRAPH STYLES */
          .hg-container {
             display: flex;
             flex-direction: column;
             gap: 4px;
             width: 100%;
             margin-top: 8px;
             font-family: 'Roboto', sans-serif;
          }
          .hg-labels {
             display: flex;
             justify-content: space-between;
             font-size: 0.75rem;
             font-weight: 700;
             color: #fff;
             margin-bottom: 2px;
          }
          .hg-bar-track {
             height: 18px;
             width: 100%;
             background: #333;
             border-radius: 2px;
             position: relative;
             overflow: hidden;
             display: flex;
             border: 1px solid rgba(255,255,255,0.1);
             cursor: pointer;
          }
          .hg-bar-indica {
             background: #8B5CF6; /* Purple */
             height: 100%;
             transition: width 0.2s ease;
          }
          .hg-bar-sativa {
             background: #EAB308; /* Yellow */
             height: 100%;
             flex: 1;
             transition: width 0.2s ease;
          }
          .hg-tick {
             position: absolute;
             top: 0;
             bottom: 0;
             width: 1px;
             background: rgba(255,255,255,0.4);
             pointer-events: none;
          }
          .hg-legend-container {
             position: relative;
             height: 14px;
             width: 100%;
             margin-top: 2px;
          }
          .hg-legend-label {
             position: absolute;
             font-size: 0.65rem;
             color: var(--text-secondary);
             transform: translateX(-50%);
          }
          .hg-legend-label.start { left: 0; transform: none; }
          .hg-legend-label.end { right: 0; transform: none; }

          /* Interactive input styling override */
          .hg-input-label {
             display: flex;
             align-items: center;
             gap: 4px;
          }
          .hg-num-input {
             background: transparent;
             border: none;
             border-bottom: 1px solid var(--text-secondary);
             color: #fff;
             width: 36px;
             text-align: center;
             font-size: 0.75rem;
             font-weight: 700;
             padding: 0;
          }
          .hg-num-input:focus {
             outline: none;
             border-bottom-color: var(--accent-green);
          }

        </style>

        <div class="strain-dialog-container">
           ${"browse"===e.view?this.renderStrainBrowseView(e,t):this.renderStrainEditorView(e,t)}
        </div>

        ${e.isCropping?this.renderCropOverlay(e,t):Z}
        ${e.isImageSelectorOpen?this.renderImageSelector(e,t):Z}
        ${e.importDialog?.open?this.renderImportDialog(e,t):Z}

      </ha-dialog>
    `:R``}static renderImportDialog(e,t){const r=e.importDialog?.replace||!1;return R`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 400px; max-width: 90vw; border-radius: 16px; padding: 24px; border: 1px solid var(--border-color); color: #fff; display: flex; flex-direction: column; gap: 20px;">

              <div style="display: flex; justify-content: space-between; align-items: center;">
                 <h2 style="margin: 0; font-size: 1.25rem;">Import Strains</h2>
                 <button class="sd-close-btn" @click=${()=>t.onImportDialogChange({open:!1})}>
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${be}"></path></svg>
                 </button>
              </div>

              <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">
                 Select a ZIP file containing your strain library export. You can either merge the new strains with your existing library or replace it entirely.
              </div>

              <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
                 <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                    <input type="radio" name="import_mode"
                           .checked=${!r}
                           @change=${()=>t.onImportDialogChange({replace:!1})}
                           style="accent-color: var(--accent-green); transform: scale(1.2);" />
                    <div>
                       <div style="font-weight: 600;">Merge</div>
                       <div style="font-size: 0.8rem; color: var(--text-secondary);">Add new strains, keep existing ones.</div>
                    </div>
                 </label>

                 <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;"></div>

                 <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                     <input type="radio" name="import_mode"
                           .checked=${r}
                           @change=${()=>t.onImportDialogChange({replace:!0})}
                           style="accent-color: var(--accent-green); transform: scale(1.2);" />
                     <div>
                       <div style="font-weight: 600;">Replace</div>
                       <div style="font-size: 0.8rem; color: var(--text-secondary);">Overwrite entire library with import.</div>
                    </div>
                 </label>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
                 <button class="sd-btn secondary" @click=${()=>t.onImportDialogChange({open:!1})}>
                    Cancel
                 </button>
                 <button class="sd-btn primary" @click=${t.onConfirmImport}>
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${we}"></path></svg>
                    Select File
                 </button>
              </div>

           </div>
        </div>
     `}static renderImageSelector(e,t){const r=new Map;return e.strains.forEach(e=>{e.image&&(r.has(e.image)||r.set(e.image,[]),r.get(e.image).push({strain:e.strain,phenotype:e.phenotype||""}))}),R`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 80%; max-width: 800px; height: 80%; max-height: 600px; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color);">
              <div class="sd-header">
                 <h2 class="sd-title">Select from Library</h2>
                 <button class="sd-close-btn" @click=${()=>t.onToggleImageSelector(!1)}>
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${be}"></path></svg>
                 </button>
              </div>
              <div class="sd-content" style="overflow-y: auto;">
                 <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
                    ${[...r.entries()].map(([e,r])=>R`
                       <div style="aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; position: relative;"
                            @click=${()=>t.onSelectLibraryImage(e)}>
                          <img src="${e}" style="width: 100%; height: 100%; object-fit: cover;" />

                          <!-- Info Overlay -->
                          <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 8px; font-size: 0.75rem; color: white;">
                             ${r.map((e,t)=>R`
                                <div style="${t<r.length-1?"margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);":""}">
                                   <div style="font-weight: 700;">Strain: ${e.strain}</div>
                                   <div style="opacity: 0.9;">Pheno: ${e.phenotype||"N/A"}</div>
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
     `}static renderCropOverlay(e,t){const r=e.editorState;if(!r.image)return Z;const i=r.image_crop_meta||{x:50,y:50,scale:1};return R`
       <div class="crop-overlay">
          <h3 style="color:white; margin-bottom:20px;">Adjust Image</h3>
          <div class="crop-viewport"
               @wheel=${e=>{e.preventDefault();const r=-.001*e.deltaY,a=Math.min(Math.max(i.scale+r,1),5);t.onEditorChange("image_crop_meta",{...i,scale:a})}}
               @mousedown=${e=>{const r=e.clientX,a=e.clientY,s=i.x,n=i.y,o=e=>{const o=(r-e.clientX)*(.2/i.scale),l=(a-e.clientY)*(.2/i.scale);let c=Math.min(Math.max(s+o,0),100),d=Math.min(Math.max(n+l,0),100);t.onEditorChange("image_crop_meta",{...i,x:c,y:d})},l=()=>{window.removeEventListener("mousemove",o),window.removeEventListener("mouseup",l)};window.addEventListener("mousemove",o),window.addEventListener("mouseup",l)}}
               @dragstart=${e=>e.preventDefault()}>
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
                    @input=${e=>t.onEditorChange("image_crop_meta",{...i,scale:parseFloat(e.target.value)})} />

             <div style="display:flex; gap:12px; margin-top:12px;">
                <button class="md3-button tonal" style="flex:1" @click=${()=>t.onToggleCropMode(!1)}>Done</button>
             </div>
             <div style="text-align:center; font-size:0.8rem; color:#888; margin-top:8px;">
                Drag to pan • Scroll to zoom
             </div>
          </div>
       </div>
    `}static renderStrainBrowseView(e,t){const r=(e.searchQuery||"").toLowerCase(),i=e.strains.filter(e=>e.strain.toLowerCase().includes(r)||e.breeder&&e.breeder.toLowerCase().includes(r)||e.phenotype&&e.phenotype.toLowerCase().includes(r));return R`
      <div class="sd-header">
         <h2 class="sd-title">Strain Library</h2>
         <button class="sd-close-btn" @click=${t.onClose}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${be}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
         <!-- SEARCH & FILTER -->
         <div class="search-bar-container">
            <div class="search-input-wrapper">
               <svg viewBox="0 0 24 24"><path d="${Ae}"></path></svg>
               <input
                  type="text"
                  class="search-bar-input"
                  placeholder="Search Strains by Name, Breeder..."
                  .value=${e.searchQuery||""}
                  @input=${e=>t.onSearch(e.target.value)}
               />
            </div>
            <div class="filter-chips">
               <!-- Placeholder Chips -->
               <div class="filter-chip">
                  <span>Sativa Dom</span>
                  <svg style="width:16px;height:16px;fill:currentColor;cursor:pointer" viewBox="0 0 24 24"><path d="${be}"></path></svg>
               </div>
               <div class="filter-chip">
                  <span>Under 60 Days</span>
                  <svg style="width:16px;height:16px;fill:currentColor;cursor:pointer" viewBox="0 0 24 24"><path d="${be}"></path></svg>
               </div>
               <a class="clear-link">Clear All</a>
            </div>
         </div>

         <!-- GRID -->
         <div class="sd-grid">
            ${i.map(e=>this.renderStrainCard(e,t))}
         </div>

         ${0===i.length?R`
            <div style="text-align:center; padding: 40px; color: var(--text-secondary);">
               <svg style="width:48px;height:48px;fill:currentColor; opacity:0.5;" viewBox="0 0 24 24"><path d="${Ae}"></path></svg>
               <p>No strains found matching "${r}"</p>
            </div>
         `:Z}
      </div>

      <div class="sd-footer">
         <button class="sd-btn secondary" @click=${t.onOpenImportDialog}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${we}"></path></svg>
            Import Strains
         </button>
         <button class="sd-btn secondary" @click=${t.onExportStrains}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"}"></path></svg>
            Export Strains
         </button>
         <button class="sd-btn primary" @click=${()=>t.onSwitchView("editor")}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Me}"></path></svg>
            New Strain
         </button>
      </div>
    `}static renderStrainCard(e,t){let r=ke,i=e.type||"Unknown";const a=(e.type||"").toLowerCase();a.includes("indica")?r=Ie:a.includes("sativa")?r=Ne:a.includes("hybrid")?r=Ee:(a.includes("ruderalis")||a.includes("auto"))&&(r=ke);const s=e.image?rs.getCropStyle(e.image,e.image_crop_meta):"";return R`
       <div class="strain-card" @click=${()=>t.onSwitchView("editor",e)}>
          <div class="sc-thumb" style="${e.image?s+"; background-repeat: no-repeat; background-position: center; background-size: cover;":""}">
             ${e.image?e.image_crop_meta?R`<div style="width:100%; height:100%; ${s}; background-repeat: no-repeat;"></div>`:R`<img src="${e.image}" alt="${e.strain}" />`:R`<svg style="width:48px;height:48px;opacity:0.2;fill:currentColor;" viewBox="0 0 24 24"><path d="${me}"></path></svg>`}
             <div class="sc-actions">
                <button class="sc-action-btn" @click=${r=>{r.stopPropagation(),t.onRemoveStrain(e.key)}}>
                   <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${$e}"></path></svg>
                </button>
             </div>
          </div>
          <div class="sc-content">
             <h3 class="sc-title">${e.strain} ${e.phenotype?`(${e.phenotype})`:""}</h3>
             <div class="sc-type-row" style="flex-wrap: wrap;">
                <div style="display:flex; align-items:center; gap:6px; width: 100%;">
                   <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${r}"></path></svg>
                   <span>${i}</span>
                </div>
                ${a.includes("hybrid")?R`
                   <div class="hg-container" title="Indica: ${e.indica_percentage||0}% | Sativa: ${e.sativa_percentage||0}%">
                      <div class="hg-labels">
                         <span>Indica: ${e.indica_percentage||0}%</span>
                         <span>Sativa: ${e.sativa_percentage||0}%</span>
                      </div>
                      <div class="hg-bar-track" style="cursor: default;">
                         <div class="hg-bar-indica" style="width: ${e.indica_percentage||0}%"></div>
                         <div class="hg-bar-sativa"></div>

                         <div class="hg-tick" style="left: 25%"></div>
                         <div class="hg-tick" style="left: 50%"></div>
                         <div class="hg-tick" style="left: 75%"></div>
                      </div>
                      <div class="hg-legend-container">
                         <span class="hg-legend-label start">0%</span>
                         <span class="hg-legend-label" style="left: 25%">25%</span>
                         <span class="hg-legend-label" style="left: 50%">50%</span>
                         <span class="hg-legend-label" style="left: 75%">75%</span>
                         <span class="hg-legend-label end">100%</span>
                      </div>
                   </div>
                `:Z}
             </div>
             <div class="sc-meta">
                ${e.flowering_days_min?R`<span>Flowering: ${e.flowering_days_min}-${e.flowering_days_max||"?"} Days</span>`:Z}
                ${e.breeder?R`<span>Breeder: ${e.breeder}</span>`:Z}
             </div>
          </div>
       </div>
     `}static renderStrainEditorView(e,t){const r=e.editorState||{},i=!!r.strain&&e.strains.some(e=>e.strain===r.strain&&e.phenotype===r.phenotype),a=(e,r)=>t.onEditorChange(e,r),s=[...new Set(e.strains.map(e=>e.strain).filter(Boolean))].sort(),n=[...new Set(e.strains.map(e=>e.breeder).filter(Boolean))].sort();return R`
      <datalist id="strain-suggestions">
         ${s.map(e=>R`<option value="${e}"></option>`)}
      </datalist>
      <datalist id="breeder-suggestions">
         ${n.map(e=>R`<option value="${e}"></option>`)}
      </datalist>

      <div class="sd-header">
         <div style="display:flex; align-items:center; gap:16px;">
            <button class="sd-btn secondary" style="padding: 8px 12px;" @click=${()=>t.onSwitchView("browse")}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"}"></path></svg>
               Back
            </button>
            <h2 class="sd-title">${i?"Edit Strain":"Add New Strain"}</h2>
         </div>
         <button class="sd-close-btn" @click=${t.onClose}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${be}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
         <div class="editor-layout">
            <!-- LEFT COL: IDENTITY -->
            <div class="editor-col">
               <div class="photo-upload-area"
                    @click=${e=>{const t=e.target;t.closest(".crop-btn")||t.closest(".select-library-btn")||e.currentTarget.querySelector("input")?.click()}}
                    @dragover=${e=>{e.preventDefault(),e.dataTransfer.dropEffect="copy"}}
                    @drop=${e=>{e.preventDefault();const t=e.dataTransfer?.files[0];t&&es.compressImage(t).then(e=>a("image",e)).catch(e=>console.error("Error compressing image:",e))}}>

                  <button class="select-library-btn" @click=${e=>{e.stopPropagation(),t.onToggleImageSelector(!0)}}>
                      <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Oe}"></path></svg>
                      Select from Library
                  </button>

                  ${r.image?R`
                     ${r.image_crop_meta?R`<div style="width:100%; height:100%; border-radius:10px; ${rs.getCropStyle(r.image,r.image_crop_meta)}; background-repeat: no-repeat;"></div>`:R`<img src="${r.image}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" />`}

                     <div style="position:absolute; bottom:8px; right:8px; display:flex; gap:8px;">
                         <button class="crop-btn"
                                 style="background:rgba(0,0,0,0.6); border:none; padding:6px; border-radius:50%; cursor:pointer; color:white;"
                                 @click=${e=>{e.stopPropagation(),t.onToggleCropMode(!0)}}
                                 title="Crop Image">
                            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${_e}"></path></svg>
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
                         @change=${e=>{const t=e.target.files?.[0];t&&es.compressImage(t).then(e=>a("image",e)).catch(e=>console.error("Error compressing image:",e))}} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Strain Name *</label>
                  <input type="text" class="sd-input" list="strain-suggestions" .value=${r.strain} @input=${e=>a("strain",e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Phenotype</label>
                  <input type="text" class="sd-input" placeholder="e.g. #1 (Optional)" .value=${r.phenotype} @input=${e=>a("phenotype",e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Breeder/Seedbank</label>
                  <input type="text" class="sd-input" list="breeder-suggestions" .value=${r.breeder} @input=${e=>a("breeder",e.target.value)} />
               </div>
            </div>

            <!-- RIGHT COL: GENETICS -->
            <div class="editor-col">
               <div class="sd-form-group">
                  <label class="sd-label">Type *</label>
                  <div class="type-selector-grid">
                     ${["Indica","Sativa","Hybrid","Ruderalis"].map(e=>{let t=ke;"Indica"===e&&(t=Ie),"Sativa"===e&&(t=Ne),"Hybrid"===e&&(t=Ee);const i=(r.type||"").toLowerCase()===e.toLowerCase();return R`
                           <div class="type-option ${i?"active":""}"
                                @click=${()=>a("type",e)}>
                              <svg viewBox="0 0 24 24"><path d="${t}"></path></svg>
                              <span class="type-label">${e}</span>
                           </div>
                        `})}
                  </div>
               </div>

               ${"hybrid"===(r.type||"").toLowerCase()?R`
                  <div class="sd-form-group">
                     <label class="sd-label">Hybrid Composition (%)</label>
                     <div class="hg-container" style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">

                        <!-- Header / Inputs -->
                        <div class="hg-labels">
                           <div class="hg-input-label">
                              <span>Indica:</span>
                              <input class="hg-num-input" type="number" min="0" max="100"
                                 .value=${r.indica_percentage||0}
                                 @input=${e=>{let t=Math.floor(parseFloat(e.target.value))||0;t<0&&(t=0),t>100&&(t=100),a("indica_percentage",t),a("sativa_percentage",100-t)}} />
                              <span>%</span>
                           </div>

                           <div class="hg-input-label">
                              <span>Sativa:</span>
                              <input class="hg-num-input" type="number" min="0" max="100"
                                 .value=${r.sativa_percentage||0}
                                 @input=${e=>{let t=Math.floor(parseFloat(e.target.value))||0;t<0&&(t=0),t>100&&(t=100),a("sativa_percentage",t),a("indica_percentage",100-t)}} />
                              <span>%</span>
                           </div>
                        </div>

                        <!-- Bar -->
                        <div class="hg-bar-track"
                             @click=${e=>{const t=e.currentTarget.getBoundingClientRect(),r=e.clientX-t.left,i=t.width;let s=Math.round(r/i*100);s<0&&(s=0),s>100&&(s=100),a("indica_percentage",s),a("sativa_percentage",100-s)}}>
                           <div class="hg-bar-indica" style="width: ${r.indica_percentage||0}%"></div>
                           <div class="hg-bar-sativa"></div>

                           <div class="hg-tick" style="left: 25%"></div>
                           <div class="hg-tick" style="left: 50%"></div>
                           <div class="hg-tick" style="left: 75%"></div>
                        </div>

                        <!-- Legend -->
                        <div class="hg-legend-container">
                           <span class="hg-legend-label start">0%</span>
                           <span class="hg-legend-label" style="left: 25%">25%</span>
                           <span class="hg-legend-label" style="left: 50%">50%</span>
                           <span class="hg-legend-label" style="left: 75%">75%</span>
                           <span class="hg-legend-label end">100%</span>
                        </div>

                        <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:4px; text-align:center;">
                           Click bar or edit values to adjust
                        </div>
                     </div>
                  </div>
               `:Z}

               <div class="sd-form-group">
                  <label class="sd-label">Flowering Time (Days)</label>
                  <div style="display:flex; gap:16px;">
                     <input type="number" class="sd-input" placeholder="Min" .value=${r.flowering_min} @input=${e=>a("flowering_min",e.target.value)} />
                     <input type="number" class="sd-input" placeholder="Max" .value=${r.flowering_max} @input=${e=>a("flowering_max",e.target.value)} />
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Lineage</label>
                  <input type="text" class="sd-input" .value=${r.lineage} @input=${e=>a("lineage",e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Sex</label>
                  <div style="display:flex; gap:20px; padding: 8px 0;">
                     ${["Feminized","Regular"].map(e=>R`
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white;">
                           <input type="radio" name="sex_radio"
                                  .checked=${r.sex===e}
                                  @change=${()=>a("sex",e)}
                                  style="accent-color: var(--accent-green); transform: scale(1.2);" />
                           ${e}
                        </label>
                     `)}
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Description</label>
                  <textarea class="sd-textarea" .value=${r.description} @input=${e=>a("description",e.target.value)}></textarea>
               </div>
            </div>
         </div>
      </div>

      <div class="sd-footer">
         <button class="sd-btn secondary" @click=${()=>t.onSwitchView("browse")}>
            Cancel
         </button>
         <button class="sd-btn primary" @click=${t.onAddStrain}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${fe}"></path></svg>
            Save Strain
         </button>
      </div>
    `}static renderMD3TextInput(e,t,r){return R`
      <div class="md3-input-group">
        <label class="md3-label">${e}</label>
        <input
          type="text"
          class="md3-input"
          .value=${t}
          @input=${e=>r(e.target.value)}
        />
      </div>
    `}static renderMD3SelectInput(e,t,r,i){return R`
      <div class="md3-input-group">
        <label class="md3-label">${e}</label>
        <select
          class="md3-input"
          .value=${t}
          @change=${e=>i(e.target.value)}
        >
          <option value="">Select...</option>
          ${r.map(e=>R`<option value="${e}" ?selected=${e===t}>${e}</option>`)}
        </select>
      </div>
    `}static renderMD3NumberInput(e,t,r){return R`
      <div class="md3-input-group">
        <label class="md3-label">${e}</label>
        <input
          type="number"
          class="md3-input"
          min="1"
          .value=${t}
          @input=${e=>r(e.target.value)}
        />
      </div>
    `}static renderMD3DateInput(e,t,r){const i=es.toDateTimeLocal(t);return R`
      <div class="md3-input-group">
        <label class="md3-label">${e}</label>
        <input
          type="datetime-local"
          class="md3-input"
          .value=${i}
          @input=${e=>r(e.target.value)}
        />
      </div>
    `}static renderTextInput(e,t,r){return R`
      <div class="form-group">
        <label>${e}</label>
        <input 
          type="text" 
          class="form-input"
          .value=${t}
          @input=${e=>r(e.target.value)}
        />
      </div>
    `}static renderNumberInput(e,t,r){return R`
      <div class="form-group">
        <label>${e}</label>
        <input 
          type="number" 
          class="form-input"
          min="1"
          .value=${t}
          @input=${e=>r(e.target.value)}
        />
      </div>
    `}static renderDateTimeInput(e,t,r,i){return R`
      <div class="form-group">
        <label>
          <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
            <path d="${t}"></path>
          </svg>
          ${e}
        </label>
        <input 
          type="datetime-local" 
          class="form-input"
          .value=${r}
          @input=${e=>i(e.target.value)}
        />
      </div>
    `}static renderPlantStatsMD3(e){return e.attributes?.veg_days||e.attributes?.flower_days||e.attributes?.dry_days||e.attributes?.cure_days?R`
      <div class="detail-card">
        <h3>Current Progress</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
           ${e.attributes?.veg_days?R`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-veg);">${e.attributes.veg_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Veg Days</span>
             </div>
           `:""}
           ${e.attributes?.flower_days?R`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-flower);">${e.attributes.flower_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Flower Days</span>
             </div>
           `:""}
           ${e.attributes?.dry_days?R`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-dry);">${e.attributes.dry_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Drying Days</span>
             </div>
           `:""}
           ${e.attributes?.cure_days?R`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-cure);">${e.attributes.cure_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Curing Days</span>
             </div>
           `:""}
        </div>
      </div>
    `:R``}static renderPlantStats(e){return this.renderPlantStatsMD3(e)}static renderConfigDialog(e,t,r){if(!e?.open)return R``;const i=e.currentTab;return R`
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
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${xe}"></path></svg>
              </div>
              <h2 class="config-title">Configuration</h2>
              <div style="flex:1"></div>
              <button class="md3-button text" @click=${r.onClose} style="min-width: auto; padding: 8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${be}"></path></svg>
              </button>
           </div>

           <!-- Tabs -->
           <div class="config-tabs">
              <div class="config-tab ${"add_growspace"===i?"active":""}"
                   @click=${()=>r.onSwitchTab("add_growspace")}>
                 <svg viewBox="0 0 24 24"><path d="${Oe}"></path></svg>
                 Add Growspace
              </div>
              <div class="config-tab ${"environment"===i?"active":""}"
                   @click=${()=>r.onSwitchTab("environment")}>
                 <svg viewBox="0 0 24 24"><path d="${Le}"></path></svg>
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
              ${"add_growspace"===i?this.renderAddGrowspaceTab(e,r):Z}
              ${"environment"===i?this.renderEnvironmentTab(e,t,r):Z}
              ${"global"===i?this.renderGlobalTab(e,r):Z}
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
    `}static renderAddGrowspaceTab(e,t){const r=e.addGrowspaceData;return R`
      <div style="display:flex; flex-direction:column; gap:20px;">
         <div class="detail-card">
            <h3>New Growspace Details</h3>
            ${this.renderMD3TextInput("Growspace Name",r.name,e=>t.onAddGrowspaceChange("name",e))}
            <div style="display:flex; gap:16px;">
               ${this.renderMD3NumberInput("Rows",r.rows,e=>t.onAddGrowspaceChange("rows",parseInt(e)))}
               ${this.renderMD3NumberInput("Plants per Row",r.plants_per_row,e=>t.onAddGrowspaceChange("plants_per_row",parseInt(e)))}
            </div>
            ${this.renderMD3TextInput("Notification Service (Optional)",r.notification_service,e=>t.onAddGrowspaceChange("notification_service",e))}
         </div>
      </div>
    `}static renderEnvironmentTab(e,t,r){const i=e.environmentData,a=Object.entries(t).map(([e,t])=>({id:e,name:t}));return R`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Select Target</h3>
             <div class="md3-input-group">
                <label class="md3-label">Growspace</label>
                <select class="md3-input" .value=${i.selectedGrowspaceId} @change=${e=>r.onEnvChange("selectedGrowspaceId",e.target.value)}>
                   <option value="">Select...</option>
                   ${a.map(e=>R`<option value="${e.id}">${e.name}</option>`)}
                </select>
             </div>
          </div>

          <div class="detail-card">
             <h3>Sensors</h3>
             ${this.renderMD3TextInput("Temperature Sensor ID",i.temp_sensor,e=>r.onEnvChange("temp_sensor",e))}
             ${this.renderMD3TextInput("Humidity Sensor ID",i.humidity_sensor,e=>r.onEnvChange("humidity_sensor",e))}
             ${this.renderMD3TextInput("VPD Sensor ID",i.vpd_sensor,e=>r.onEnvChange("vpd_sensor",e))}
          </div>

          <div class="detail-card">
             <h3>Optional</h3>
             ${this.renderMD3TextInput("CO2 Sensor ID",i.co2_sensor,e=>r.onEnvChange("co2_sensor",e))}
             ${this.renderMD3TextInput("Light Sensor/State ID",i.light_sensor,e=>r.onEnvChange("light_sensor",e))}
             ${this.renderMD3TextInput("Fan Switch ID",i.fan_switch,e=>r.onEnvChange("fan_switch",e))}
          </div>
       </div>
    `}static renderGlobalTab(e,t){const r=e.globalData;return R`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Global Environment</h3>
             ${this.renderMD3TextInput("Weather Entity ID",r.weather_entity,e=>t.onGlobalChange("weather_entity",e))}
          </div>
          <div class="detail-card">
             <h3>Lung Room</h3>
             ${this.renderMD3TextInput("Lung Room Temp Sensor",r.lung_room_temp,e=>t.onGlobalChange("lung_room_temp",e))}
             ${this.renderMD3TextInput("Lung Room Humidity Sensor",r.lung_room_humidity,e=>t.onGlobalChange("lung_room_humidity",e))}
          </div>
       </div>
    `}static renderGrowMasterDialog(e,t,r,i){if(!e?.open)return R``;const a=t?"#FF9800":"#4CAF50",s=r?`Ask the ${r}`:"Ask the Grow Master";return R`
      <ha-dialog
        open
        @closed=${i.onClose}
        hideActions
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <style>
           .gm-container {
              background: #1a1a1a;
              color: #fff;
              width: 500px;
              max-width: 90vw;
              border-radius: 24px;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              font-family: 'Roboto', sans-serif;
              border: 1px solid rgba(255,255,255,0.1);
           }
           .gm-header {
              background: #2d2d2d;
              padding: 20px 24px;
              display: flex;
              align-items: center;
              gap: 16px;
              border-bottom: 1px solid rgba(255,255,255,0.1);
           }
           .gm-content {
              padding: 24px;
              display: flex;
              flex-direction: column;
              gap: 20px;
              overflow-y: auto;
              max-height: 70vh;
           }
           .gm-response-box {
              background: rgba(255,255,255,0.05);
              border: 2px solid ${a};
              border-radius: 16px;
              padding: 20px;
              line-height: 1.6;
              font-size: 0.95rem;
              white-space: pre-wrap;
              position: relative;
           }
           .gm-loading {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 40px;
              color: var(--secondary-text-color);
              gap: 12px;
           }
           @keyframes spin { 100% { transform: rotate(360deg); } }
           .spinner {
              animation: spin 1s linear infinite;
              width: 24px;
              height: 24px;
           }
        </style>

        <div class="gm-container">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: ${a}">
                 <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ge}"></path></svg>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">${s}</h2>
                 <div style="font-size:0.8rem; color:var(--secondary-text-color); margin-top:4px;">
                    ${t?"Warning: Plant Stress Detected":"All systems normal"}
                 </div>
              </div>
              <button class="md3-button text" @click=${i.onClose} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${be}"></path></svg>
              </button>
           </div>

           <div class="gm-content">
              <!-- Input Area -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Question</label>
                 <textarea
                    class="sd-textarea"
                    placeholder="Ask about this growspace..."
                    .value=${e.userQuery}
                    @input=${e=>i.onQueryChange(e.target.value)}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div style="display:flex; justify-content:flex-end;">
                 <button
                    class="md3-button primary"
                    @click=${i.onAnalyze}
                    ?disabled=${e.isLoading}
                    style="opacity: ${e.isLoading?.7:1}"
                 >
                    ${e.isLoading?"Analyzing...":"Analyze Environment"}
                 </button>
              </div>

              <!-- Response Area -->
              ${e.isLoading?R`
                 <div class="gm-loading">
                    <svg class="spinner" viewBox="0 0 24 24"><path d="${"M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"}" fill="currentColor"></path></svg>
                    <span>Consulting the archives...</span>
                 </div>
              `:Z}

              ${!e.isLoading&&e.response?R`
                 <div class="gm-response-box">
                    ${e.response}
                 </div>
              `:Z}
           </div>
        </div>
      </ha-dialog>
    `}}let is=class extends oe{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._strainLibraryDialog=null,this._configDialog=null,this._growMasterDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1,this._historyData=null,this._lightCycleCollapsed=!0,this._activeEnvGraphs=new Set,this._tooltip=null,this._handleTakeClone=e=>{const t=e.attributes?.plant_id||e.entity_id.replace("sensor.","");this.hass.callService("growspace_manager","take_clone",{mother_plant_id:t}).then(()=>{console.log(`Clone taken from ${e.attributes?.strain||"plant"}`)}).catch(e=>{console.error(`Failed to take clone: ${e.message}`)})},this.clonePlant=(e,t)=>{const r=e.attributes?.plant_id||e.entity_id.replace("sensor.",""),i=t;this.hass.callService("growspace_manager","take_clone",{mother_plant_id:r,num_clones:i}).then(()=>{console.log(`Clone taken from ${e.attributes?.strain||"plant"}`)}).catch(e=>{console.error(`Failed to take clone: ${e.message}`)})}}firstUpdated(){this.dataService=new ts(this.hass),this.initializeSelectedDevice(),this._fetchHistory()}updated(e){super.updated(e),e.has("selectedDevice")&&this._fetchHistory()}async _fetchHistory(){if(!this.hass||!this.selectedDevice)return;const e=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);if(!e)return;let t=e.name.toLowerCase().replace(/\s+/g,"_");e.overview_entity_id&&(t=e.overview_entity_id.replace("sensor.",""));let r=`binary_sensor.${t}_optimal_conditions`;"cure"===t?r="binary_sensor.cure_optimal_curing":"dry"===t&&(r="binary_sensor.dry_optimal_drying");const i=new Date,a=new Date(i.getTime()-864e5);try{const e=await this.dataService.getHistory(r,a,i);this._historyData=e}catch(e){console.error("Failed to fetch history",e)}}initializeSelectedDevice(){const e=this.dataService.getGrowspaceDevices();if(e.length&&!this.selectedDevice){if(this._config?.default_growspace){const t=e.find(e=>e.device_id===this._config.default_growspace||e.name===this._config.default_growspace);if(t)return void(this.selectedDevice=t.device_id)}this.selectedDevice=e[0].device_id}}static async getConfigElement(){await Promise.resolve().then(function(){return ss});return document.createElement("growspace-manager-card-editor")}static getStubConfig(){return{default_growspace:"4x4",compact:!0}}setConfig(e){if(!e)throw new Error("Invalid configuration");this._config=e,void 0!==this._config.compact&&(this._isCompactView=this._config.compact)}getCardSize(){return 4}_handleDeviceChange(e){const t=e.target;this.selectedDevice=t.value}_handlePlantClick(e){this._plantOverviewDialog={open:!0,plant:e,editedAttributes:{...e.attributes}}}getHaDateTimeString(){const e=this.hass.config.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone;return Qa.now().setZone(e).toFormat("yyyy-LL-dd'T'HH:mm")}_openAddPlantDialog(e,t){const r=this.getHaDateTimeString(),i=this.dataService.getStrainLibrary(),a=i.length>0?i[0].strain:"",s=i.length>0?i[0].phenotype:"";this._addPlantDialog={open:!0,row:e,col:t,strain:a,phenotype:s,veg_start:r,flower_start:r}}async _confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const{row:e,col:t,strain:r,phenotype:i,veg_start:a,flower_start:s}=this._addPlantDialog;try{const n={growspace_id:this.selectedDevice,row:e+1,col:t+1,strain:r,phenotype:i,veg_start:es.formatDateForBackend(a)??es.formatDateForBackend(es.getCurrentDateTime()),flower_start:es.formatDateForBackend(s)??es.formatDateForBackend(es.getCurrentDateTime())};console.log("Adding plant to growspace:",this.selectedDevice,n),console.log("Adding plant:",n),await this.dataService.addPlant(n),this._addPlantDialog=null}catch(e){console.error("Error adding plant:",e)}}async _updatePlant(){if(!this._plantOverviewDialog)return;const{plant:e,editedAttributes:t}=this._plantOverviewDialog,r={plant_id:e.attributes?.plant_id||e.entity_id.replace("sensor.","")},i=["seedling_start","mother_start","clone_start","veg_start","flower_start","dry_start","cure_start"];["strain","phenotype","row","col",...i].forEach(e=>{if(void 0!==t[e]&&null!==t[e])if(i.includes(e)){const i=es.formatDateForBackend(String(t[e]));i&&(r[e]=i)}else r[e]=t[e]});try{await this.dataService.updatePlant(r),this._plantOverviewDialog=null}catch(e){console.error("Error updating plant:",e)}}async _handleDeletePlant(e){if(confirm("Are you sure you want to delete this plant?"))try{await this.dataService.removePlant(e),this._plantOverviewDialog=null}catch(e){console.error("Error deleting plant:",e)}}async _movePlantToNextStage(e){if(!this._plantOverviewDialog?.plant)return void console.error("No plant found in overview dialog");const t=this._plantOverviewDialog.plant,r=t.attributes?.stage;let i="";const a=new Set(["mother","flower","dry","cure"]);if(r&&a.has(r)){"flower"===r?i="dry":"dry"===r?i="cure":"mother"===r?i="clone":(console.error("Unknown stage, cannot move plant",i),i="error");try{const e=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.dataService.harvestPlant(e,i),this._plantOverviewDialog=null}catch(e){console.error("Error moving plant to next stage:",e)}}else alert("Plant must be in mother or flower or dry or cure stage to move. stage is "+r)}async _harvestPlant(e){await this._movePlantToNextStage(e)}async _finishDryingPlant(e){await this._movePlantToNextStage(e)}_openStrainLibraryDialog(){const e=this.dataService.getStrainLibrary();this._strainLibraryDialog={open:!0,view:"browse",strains:e,searchQuery:"",editorState:this._createEmptyEditorState()}}_createEmptyEditorState(){return{strain:"",phenotype:"",breeder:"",type:"",flowering_min:"",flowering_max:"",lineage:"",sex:"",description:"",image:"",image_crop_meta:void 0}}_switchStrainView(e,t){this._strainLibraryDialog&&(this._strainLibraryDialog.view=e,this._strainLibraryDialog.isCropping=!1,"editor"===e&&(this._strainLibraryDialog.editorState=t?{strain:t.strain,phenotype:t.phenotype||"",breeder:t.breeder||"",type:t.type||"",flowering_min:t.flowering_days_min?.toString()||"",flowering_max:t.flowering_days_max?.toString()||"",lineage:t.lineage||"",sex:t.sex||"",description:t.description||"",image:t.image||"",image_crop_meta:t.image_crop_meta,sativa_percentage:t.sativa_percentage,indica_percentage:t.indica_percentage}:this._createEmptyEditorState()),this.requestUpdate())}_handleStrainEditorChange(e,t){this._strainLibraryDialog&&this._strainLibraryDialog.editorState&&(this._strainLibraryDialog.editorState[e]=t,this.requestUpdate())}_toggleCropMode(e){this._strainLibraryDialog&&(this._strainLibraryDialog.isCropping=e,this.requestUpdate())}_toggleImageSelector(e){this._strainLibraryDialog&&(this._strainLibraryDialog.isImageSelectorOpen=e,this.requestUpdate())}_handleSelectLibraryImage(e){if(this._strainLibraryDialog&&this._strainLibraryDialog.editorState){this._strainLibraryDialog.editorState.image=e;const t=this._strainLibraryDialog.strains.find(t=>t.image===e&&!!t.image_crop_meta);t&&t.image_crop_meta?this._strainLibraryDialog.editorState.image_crop_meta={...t.image_crop_meta}:this._strainLibraryDialog.editorState.image_crop_meta=void 0,this._strainLibraryDialog.isImageSelectorOpen=!1,this.requestUpdate()}}_toggleLightCycle(){this._lightCycleCollapsed=!this._lightCycleCollapsed}_toggleEnvGraph(e){const t=new Set(this._activeEnvGraphs);t.has(e)?t.delete(e):t.add(e),this._activeEnvGraphs=t,this.requestUpdate()}_handleGraphHover(e,t,r,i,a){const s=e.clientX-i.left,n=i.width,o=new Date,l=new Date(o.getTime()-864e5).getTime(),c=l+s/n*(o.getTime()-l);let d=r[0],u=Math.abs(c-d.time);for(let e=1;e<r.length;e++){const t=Math.abs(c-r[e].time);t<u&&(u=t,d=r[e])}const h=new Date(c).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).toLowerCase();let p=`${d.value} ${a}`;"state"===a&&(p=1===d.value?"ON":"OFF"),this._tooltip={id:t,x:s,time:h,value:p}}renderEnvGraph(e,t,r,i){if(!this._historyData||0===this._historyData.length)return R``;const a=[...this._historyData].sort((e,t)=>new Date(e.last_changed).getTime()-new Date(t.last_changed).getTime()),s=new Date,n=new Date(s.getTime()-864e5),o=[];if(a.forEach(t=>{const r=new Date(t.last_changed).getTime();if(r<n.getTime())return;const i=((e,t)=>{if(e&&e.attributes)return void 0!==e.attributes[t]?e.attributes[t]:e.attributes.observations&&"object"==typeof e.attributes.observations?e.attributes.observations[t]:void 0})(t,e);void 0===i||isNaN(parseFloat(i))||o.push({time:r,value:parseFloat(i)})}),o.length<2)return R``;const l=Math.min(...o.map(e=>e.value)),c=Math.max(...o.map(e=>e.value)),d=c-l||1,u=l-.1*d,h=c+.1*d-u,p=o.map(e=>[(e.time-n.getTime())/864e5*1e3,100-(e.value-u)/h*100]),g=`M ${p.map(e=>`${e[0]},${e[1]}`).join(" L ")}`;return R`
      <div class="gs-light-cycle-card" style="margin-top: 12px; border: 1px solid ${t}40;">
         <div class="gs-light-header-row" @click=${()=>this._toggleEnvGraph(e)}>
             <div class="gs-light-title" style="font-size: 1.2rem;">
                 <div class="gs-icon-box" style="color: ${t}; background: ${t}10; border-color: ${t}30; width: 36px; height: 36px;">
                      <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ae}"></path></svg>
                 </div>
                 <div>
                    <div>${r}</div>
                    <div class="gs-light-subtitle">24H HISTORY • ${l.toFixed(1)} - ${c.toFixed(1)} ${i}</div>
                 </div>
             </div>
             <div style="opacity: 0.7;">
                <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ve}"></path></svg>
             </div>
         </div>

         <div class="gs-chart-container" style="height: 100px;"
              @mousemove=${t=>{const r=t.currentTarget.getBoundingClientRect();this._handleGraphHover(t,e,o,r,i)}}
              @mouseleave=${()=>this._tooltip=null}>

             ${this._tooltip&&this._tooltip.id===e?R`
                 <div class="gs-cursor-line" style="left: ${this._tooltip.x}px;"></div>
                 <div class="gs-tooltip" style="left: ${this._tooltip.x}px;">
                    <div class="time">${this._tooltip.time}</div>
                    <div>${this._tooltip.value}</div>
                 </div>
             `:""}

             <svg class="gs-chart-svg" viewBox="0 0 1000 100" preserveAspectRatio="none">
                 <defs>
                     <linearGradient id="grad-${e}" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" style="stop-color:${t};stop-opacity:0.5" />
                         <stop offset="100%" style="stop-color:${t};stop-opacity:0" />
                     </linearGradient>
                 </defs>
                 <path class="chart-line" d="${g}" style="stroke: ${t};" />
                 <path class="chart-gradient-fill" d="${g} V 100 H 0 Z" style="fill: url(#grad-${e});" />
             </svg>
             <div class="chart-markers">
                <span>-24H</span>
                <span>NOW</span>
             </div>
         </div>
      </div>
    `}_setStrainSearchQuery(e){this._strainLibraryDialog&&(this._strainLibraryDialog.searchQuery=e,this.requestUpdate())}_toggleAddStrainForm(){}_promptClearAll(){}_cancelClearAll(){}async _addStrain(){if(!this._strainLibraryDialog?.editorState?.strain)return;const e=this._strainLibraryDialog.editorState,t={strain:e.strain,phenotype:e.phenotype,breeder:e.breeder,type:e.type,flowering_days_min:e.flowering_min?parseInt(e.flowering_min):void 0,flowering_days_max:e.flowering_max?parseInt(e.flowering_max):void 0,lineage:e.lineage,sex:e.sex,description:e.description,image:e.image,image_crop_meta:e.image_crop_meta,sativa_percentage:e.sativa_percentage,indica_percentage:e.indica_percentage};try{await this.dataService.addStrain(t);const r=`${e.strain}|${e.phenotype||"default"}`,i={key:r,strain:e.strain,phenotype:e.phenotype,breeder:e.breeder,type:e.type,flowering_days_min:t.flowering_days_min,flowering_days_max:t.flowering_days_max,lineage:e.lineage,sex:e.sex,description:e.description,image:e.image,image_crop_meta:e.image_crop_meta,sativa_percentage:e.sativa_percentage,indica_percentage:e.indica_percentage};this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e.key!==r),this._strainLibraryDialog.strains.push(i),this._switchStrainView("browse")}catch(e){console.error("Error adding strain:",e)}}async _removeStrain(e){if(this._strainLibraryDialog)try{const t=e.split("|"),r=t[0],i=t.length>1&&"default"!==t[1]?t[1]:void 0;await this.dataService.removeStrain(r,i),this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(t=>t.key!==e),this.requestUpdate()}catch(e){console.error("Error removing strain:",e)}}async _clearStrains(){await this.dataService.clearStrainLibrary(),this._strainLibraryDialog&&(this._strainLibraryDialog.strains=[],this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate())}async _handleExportLibrary(){const e=await this.hass.connection.subscribeEvents(t=>{t.data&&t.data.url&&(this._downloadFile(t.data.url),e())},"growspace_manager_strain_library_exported");try{await this.hass.callService("growspace_manager","export_strain_library")}catch(t){console.error("Failed to call export service",t),e()}}_downloadFile(e){const t=document.createElement("a");t.style.display="none",t.href=e,t.download=e.split("/").pop()||"export.zip",document.body.appendChild(t),t.click(),document.body.removeChild(t)}_openImportDialog(){this._strainLibraryDialog&&(this._strainLibraryDialog.importDialog={open:!0,replace:!1},this.requestUpdate())}_handleImportDialogChange(e){this._strainLibraryDialog&&this._strainLibraryDialog.importDialog&&(void 0!==e.open&&(this._strainLibraryDialog.importDialog.open=e.open),void 0!==e.replace&&(this._strainLibraryDialog.importDialog.replace=e.replace),this.requestUpdate())}async _performImport(){if(!this._strainLibraryDialog?.importDialog)return;const e=this._strainLibraryDialog.importDialog.replace,t=document.createElement("input");t.type="file",t.accept=".zip",t.onchange=async t=>{const r=t.target.files?.[0];if(r)try{const t=await this.dataService.importStrainLibrary(r,e);alert(`Import successful! ${t.imported_count||""} strains imported.`),this._strainLibraryDialog&&this._strainLibraryDialog.importDialog&&(this._strainLibraryDialog.importDialog.open=!1),this.requestUpdate()}catch(e){console.error("Import failed:",e),alert(`Import failed: ${e.message}`)}},t.click()}updateGrid(){this.dataService=new ts(this.hass),this.requestUpdate()}_handleDragStart(e,t){this._draggedPlant=t,e.dataTransfer?.setData("text/plain",JSON.stringify({id:t.entity_id}));e.target.classList.add("dragging")}_handleDragEnd(e){e.target.classList.remove("dragging")}_handleDragOver(e){e.preventDefault()}async _handleDrop(e,t,r,i){if(e.preventDefault(),!this._draggedPlant||!this.selectedDevice)return;const a=this._draggedPlant;this._draggedPlant=null;try{if(i){const e=a.attributes.plant_id||a.entity_id.replace("sensor.",""),t=i.attributes.plant_id||i.entity_id.replace("sensor.","");await this.hass.callService("growspace_manager","switch_plants",{plant1_id:e,plant2_id:t}),this.updateGrid()}else await this._movePlant(a,t,r)}catch(e){console.error("Error during drag-and-drop:",e)}}async _movePlant(e,t,r){try{const i=e.attributes?.plant_id||e.entity_id.replace("sensor.","");await this.dataService.updatePlant({plant_id:i,row:t,col:r})}catch(e){console.error("Error moving plant:",e)}}_moveClonePlant(e,t){this.hass.callService("growspace_manager","move_clone",{plant_id:e.attributes.plant_id,target_growspace_id:t}).then(()=>{console.log(`Moved clone ${e.attributes.friendly_name} to ${t}`),this._plantOverviewDialog=null}).catch(e=>{console.error("Error moving clone:",e)})}_openConfigDialog(){this._configDialog={open:!0,currentTab:"add_growspace",addGrowspaceData:{name:"",rows:3,plants_per_row:3,notification_service:""},environmentData:{selectedGrowspaceId:"",temp_sensor:"",humidity_sensor:"",vpd_sensor:"",co2_sensor:"",light_sensor:"",fan_switch:""},globalData:{weather_entity:"",lung_room_temp:"",lung_room_humidity:""}}}_handleAddGrowspaceSubmit(){if(!this._configDialog)return;const e=this._configDialog.addGrowspaceData;e.name?this.dataService.addGrowspace(e).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(e=>alert(`Error: ${e.message}`)):alert("Name is required")}_handleEnvSubmit(){if(!this._configDialog)return;const e=this._configDialog.environmentData;e.selectedGrowspaceId&&e.temp_sensor&&e.humidity_sensor&&e.vpd_sensor?this.dataService.configureGrowspaceSensors({growspace_id:e.selectedGrowspaceId,temperature_sensor:e.temp_sensor,humidity_sensor:e.humidity_sensor,vpd_sensor:e.vpd_sensor,co2_sensor:e.co2_sensor||void 0,light_sensor:e.light_sensor||void 0,fan_switch:e.fan_switch||void 0}).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(e=>alert(`Error: ${e.message}`)):alert("Growspace and required sensors (Temp, Hum, VPD) are mandatory")}_handleGlobalSubmit(){if(!this._configDialog)return;const e=this._configDialog.globalData;this.dataService.configureGlobalSettings(e).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(e=>alert(`Error: ${e.message}`))}_openGrowMasterDialog(){this.selectedDevice&&(this._growMasterDialog={open:!0,growspaceId:this.selectedDevice,userQuery:"",isLoading:!1,response:null})}async _handleAskAdvice(){if(this._growMasterDialog&&this._growMasterDialog.userQuery){this._growMasterDialog.isLoading=!0,this._growMasterDialog.response=null,this.requestUpdate();try{const e=await this.dataService.askGrowAdvice(this._growMasterDialog.growspaceId,this._growMasterDialog.userQuery);this._growMasterDialog&&(this._growMasterDialog.response=e.response)}catch(e){this._growMasterDialog&&(this._growMasterDialog.response=`Error: ${e.message||"Failed to get advice."}`)}finally{this._growMasterDialog&&(this._growMasterDialog.isLoading=!1,this.requestUpdate())}}}render(){if(!this.hass)return R`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;this.dataService=new ts(this.hass);const e=this.dataService.getGrowspaceDevices();if(!e.length)return R`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;if(!this._defaultApplied&&this._config?.default_growspace){const t=e.find(e=>e.device_id===this._config.default_growspace||e.name===this._config.default_growspace);t&&(this.selectedDevice=t.device_id),this._defaultApplied=!0}this.selectedDevice&&e.find(e=>e.device_id===this.selectedDevice)||(this.selectedDevice=e[0].device_id);const t=e.find(e=>e.device_id===this.selectedDevice);if(!t)return R`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;const r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;r&&Object.entries(r).forEach(([e,t])=>{});const i=es.calculateEffectiveRows(t),{grid:a}=es.createGridLayout(t.plants,i,t.plants_per_row),s=t.plants_per_row>6,n=this.dataService.getStrainLibrary();return R`
      <ha-card class=${s?"wide-growspace":""}>
        <div class="unified-growspace-card">
          ${this.renderHeader(e)}
          ${this._isCompactView?"":this.renderGrowspaceHeader(t)}
          ${this.renderGrid(a,i,t.plants_per_row,n)}
        </div>
      </ha-card>
      
      ${this.renderDialogs()}
    `}renderGrowspaceHeader(e){const t=es.getDominantStage(e.plants),r=this.dataService.getGrowspaceDevices();let i=e.name.toLowerCase().replace(/\s+/g,"_");e.overview_entity_id&&(i=e.overview_entity_id.replace("sensor.",""));let a=`binary_sensor.${i}_optimal_conditions`;const s="cure"===i,n="dry"===i;s?a="binary_sensor.cure_optimal_curing":n&&(a="binary_sensor.dry_optimal_drying");const o=this.hass.states[a],l=(e,t)=>{if(e&&e.attributes)return void 0!==e.attributes[t]?e.attributes[t]:e.attributes.observations&&"object"==typeof e.attributes.observations?e.attributes.observations[t]:void 0},c=l(o,"temperature"),d=l(o,"humidity"),u=l(o,"vpd"),h=s||n,p=h?void 0:l(o,"co2"),g=l(o,"is_lights_on"),m=!h&&null!=g,f=!0===g;let v="",y="--:--",b="--:--",w="",x="";const _=e.plants.some(e=>"flower"===e.attributes.stage),$=_?"12/12 Cycle":"18/6 Cycle";let S=[];if(this._historyData&&this._historyData.length>0){const e=[...this._historyData].sort((e,t)=>new Date(e.last_changed).getTime()-new Date(t.last_changed).getTime()),t=new Date,r=new Date(t.getTime()-864e5),i=1e3,a=100,s=[];let n=e.length>0?!0!==l(e[0],"is_lights_on"):f;e.forEach(e=>{const t=new Date(e.last_changed).getTime(),i=!0===l(e,"is_lights_on");t>=r.getTime()&&S.push({time:t,state:i})}),n=S.length>0?!S[0].state:f,s.push([0,n?0:a]),S.forEach(e=>{const t=(e.time-r.getTime())/864e5*i;s.push([t,n?0:a]),n=e.state,s.push([t,n?0:a])}),s.push([i,n?0:a]),v=`M ${s.map(e=>`${e[0]},${e[1]}`).join(" L ")}`;const o=[...e].reverse(),c=o.find(e=>!0===l(e,"is_lights_on"));if(c){const e=new Date(c.last_changed);y=e.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).replace(/ [AP]M/,""),w=e.toLocaleTimeString([],{hour12:!0}).slice(-2)}const d=o.find(e=>!1===l(e,"is_lights_on"));if(d){const e=new Date(d.last_changed);b=e.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).replace(/ [AP]M/,""),x=e.toLocaleTimeString([],{hour12:!0}).slice(-2)}}return R`
      <div class="gs-stats-container">
         <div class="gs-header-top">
            <div class="gs-title-group">
               <!-- Title as Dropdown if no default is set -->
               ${this._config?.default_growspace?R`
                 <h3 class="gs-title">${e.name}</h3>
               `:R`
                 <select class="growspace-select-header" .value=${this.selectedDevice||""} @change=${this._handleDeviceChange}>
                    ${r.map(e=>R`<option value="${e.device_id}">${e.name}</option>`)}
                 </select>
               `}

               ${t?R`
               <div class="gs-stage-chip">
                 <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${es.getPlantStageIcon(t.stage)}"></path></svg>
                 ${t.stage.charAt(0).toUpperCase()+t.stage.slice(1)} • Day ${t.days}
               </div>
               `:""}
            </div>

            <div class="gs-stats-chips">
                ${void 0!==c?R`
                   <div class="stat-chip ${this._activeEnvGraphs.has("temperature")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("temperature")}>
                     <svg viewBox="0 0 24 24"><path d="${Le}"></path></svg>${c}°C
                   </div>`:""}
                ${void 0!==d?R`
                   <div class="stat-chip ${this._activeEnvGraphs.has("humidity")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("humidity")}>
                     <svg viewBox="0 0 24 24"><path d="${"M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z"}"></path></svg>${d}%
                   </div>`:""}
                ${void 0!==u?R`
                   <div class="stat-chip ${this._activeEnvGraphs.has("vpd")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("vpd")}>
                     <svg viewBox="0 0 24 24"><path d="${"M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20M6.5 18H18.5Q19.55 18 20.27 17.27 21 16.55 21 15.5 21 14.45 20.27 13.73 19.55 13 18.5 13H17V11Q17 8.93 15.54 7.46 14.08 6 12 6 9.93 6 8.46 7.46 7 8.93 7 11H6.5Q5.05 11 4.03 12.03 3 13.05 3 14.5 3 15.95 4.03 17 5.05 18 6.5 18M12 12Z"}"></path></svg>${u} kPa
                   </div>`:""}
                ${void 0!==p?R`
                   <div class="stat-chip ${this._activeEnvGraphs.has("co2")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("co2")}>
                     <svg viewBox="0 0 24 24"><path d="${"M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z"}"></path></svg>${p} ppm
                   </div>`:""}

                ${this._isCompactView?"":R`
                   <div class="stat-chip" @click=${this._openStrainLibraryDialog} title="Strain Library">
                      <svg viewBox="0 0 24 24"><path d="${Se}"></path></svg>
                      Strains
                   </div>

                   <div class="stat-chip" @click=${this._openConfigDialog} title="Configure">
                      <svg viewBox="0 0 24 24"><path d="${xe}"></path></svg>
                      Config
                   </div>

                   <div class="stat-chip" @click=${()=>this._isCompactView=!0} title="Switch to Compact Mode">
                       <svg viewBox="0 0 24 24"><path d="${Ae}"></path></svg>
                       Compact
                   </div>

                   <div class="stat-chip" @click=${this._openGrowMasterDialog} title="Ask the Grow Master">
                       <svg viewBox="0 0 24 24"><path d="${ge}"></path></svg>
                       Ask AI
                   </div>
                `}
            </div>
         </div>

         <!-- Nested Light Cycle Card -->
         ${m?R`
         <div class="gs-light-cycle-card ${this._lightCycleCollapsed?"collapsed":""}">
            <div class="gs-light-header-row" @click=${()=>this._toggleLightCycle()}>
                <div class="gs-light-title">
                    <div class="gs-icon-box">
                       <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ne}"></path></svg>
                    </div>
                    <div>
                       <div>Light Cycle</div>
                       ${this._lightCycleCollapsed?"":R`<div class="gs-light-subtitle">24H HISTORY</div>`}
                    </div>
                </div>

                ${o?R`
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div>
                        <div class="light-status-chip ${f?"on":"off"}">
                           <div class="light-status-text">
                               <div class="status-dot"></div>
                               ${f?"ON":"OFF"}
                           </div>
                        </div>
                        ${this._lightCycleCollapsed?"":R`<div class="target-cycle-text">Target: ${$}</div>`}
                    </div>
                    <div class="rotate-icon ${this._lightCycleCollapsed?"":"expanded"}" style="opacity: 0.7;">
                        <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ve}"></path></svg>
                    </div>
                </div>
                `:""}
            </div>

            ${this._lightCycleCollapsed?"":R`
            <div class="gs-chart-container"
                @mousemove=${e=>{const t=e.currentTarget.getBoundingClientRect(),r=new Date,i=new Date(r.getTime()-864e5),a=S.map(e=>({time:e.time,value:e.state?1:0}));0===a.length||(a[0].time,i.getTime()),this._handleGraphHover(e,"light-cycle",a,t,"state")}}
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
                    <path class="chart-line" d="${v}" />
                    <path class="chart-gradient-fill" d="${v} V 100 H 0 Z" />
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
                            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ne}"></path></svg>
                        </div>
                        <div class="ac-text">
                            <h4>LIGHT ON</h4>
                            <div class="time">${y} <span>${w}</span></div>
                        </div>
                    </div>
                    <div class="ac-arrow">
                        <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
                    </div>
                </div>

                <div class="action-card">
                    <div class="ac-content">
                        <div class="ac-icon off">
                            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ie}"></path></svg>
                        </div>
                        <div class="ac-text">
                            <h4>LIGHT OFF</h4>
                            <div class="time">${b} <span>${x}</span></div>
                        </div>
                    </div>
                    <div class="ac-arrow">
                         <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
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
    `}renderHeader(e){return this._isCompactView||this._config?.title?(e.find(e=>e.device_id===this.selectedDevice),R`
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
              ${e.map(e=>R`<option value="${e.device_id}">${e.name}</option>`)}
            </select>
          `:R`
            <label for="device-select">Growspace:</label>
            <select 
              id="device-select" 
              class="growspace-select"
              .value=${this.selectedDevice||""} 
              @change=${this._handleDeviceChange}
            >
              ${e.map(e=>R`<option value="${e.device_id}">${e.name}</option>`)}
            </select>
          `}
        </div>

        <div style="display: flex; gap: var(--spacing-sm); align-items: center;">
          <div class="view-toggle">
            <input 
              type="checkbox" 
              id="compact-view" 
              .checked=${this._isCompactView}
              @change=${e=>this._isCompactView=e.target.checked}
            >
            <label for="compact-view">Compact</label>
          </div>
          
          <button class="action-button" @click=${this._openStrainLibraryDialog}>
            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
              <path d="${Se}"></path>
            </svg>
            Strains
          </button>
        </div>
        `:""}
      </div>
    `):R``}renderGrid(e,t,r,i){const a=r>5,s=a?"":`grid-template-columns: repeat(${r}, minmax(0, 1fr)); grid-template-rows: repeat(${t}, 1fr);`;return R`
      <div class="grid ${this._isCompactView?"compact":""} ${a?"force-list-view":""}"
           style="${s}">
        ${e.flat().map((e,t)=>{const a=Math.floor(t/r)+1,s=t%r+1;return e?this.renderPlantSlot(e,a,s,i):this.renderEmptySlot(a,s)})}
      </div>
    `}renderEmptySlot(e,t){return R`
      <div 
        class="plant-card-empty"
        style="grid-row: ${e}; grid-column: ${t}" 
        @click=${()=>this._openAddPlantDialog(e-1,t-1)}
        @dragover=${this._handleDragOver}
        @drop=${r=>this._handleDrop(r,e,t,null)}
      >
        <div class="plant-header">
          <svg style="width: 48px; height: 48px; opacity: 0.5; fill: currentColor;" viewBox="0 0 24 24">
            <path d="${Me}"></path>
          </svg>
        </div>
        <div style="font-weight: 500; opacity: 0.8;">Add Plant</div>
      </div>
    `}renderPlantSlot(e,t,r,i){const a=es.getPlantStageColor(e.state),s=e.attributes?.strain,n=e.attributes?.phenotype;let o;if(s){const e=i.find(e=>e.strain===s&&e.phenotype===n);if(e&&e.image)o=e.image;else{const e=i.find(e=>e.strain===s&&(!e.phenotype||"default"===e.phenotype));if(e&&e.image)o=e.image;else if(!o){const e=i.find(e=>e.strain===s&&e.image);e&&(o=e.image)}}}const l=o?`background-image: url('${o}');`:"";return R`
      <div 
        class="plant-card-rich"
        style="grid-row: ${t}; grid-column: ${r}; --stage-color: ${a}" 
        draggable="true"
        @dragstart=${t=>this._handleDragStart(t,e)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${i=>this._handleDrop(i,t,r,e)}
        @click=${()=>this._handlePlantClick(e)}
      >
        ${o?R`<div class="plant-card-bg" style="${l}"></div>
                          <div class="plant-card-overlay"></div>`:""}

        <div class="plant-card-content">
            <div class="pc-info">
                <div class="pc-strain-name" title="${e.attributes?.strain||""}">
                    ${e.attributes?.strain||"Unknown Strain"}
                </div>
                ${e.attributes?.phenotype?R`<div class="pc-pheno">${e.attributes.phenotype}</div>`:""}
                <div class="pc-stage">
                    ${e.state||"Unknown"}
                </div>
            </div>

            <div class="pc-stats">
               ${this.renderPlantDaysRich(e)}
            </div>
        </div>
      </div>
    `}renderPlantDaysRich(e){const t=[{days:e.attributes?.seedling_days,icon:Te,title:"Seedling",stage:"seedling"},{days:e.attributes?.mother_days,icon:Te,title:"Mother",stage:"mother"},{days:e.attributes?.clone_days,icon:Te,title:"Clone",stage:"clone"},{days:e.attributes?.veg_days,icon:Te,title:"Veg",stage:"vegetative"},{days:e.attributes?.flower_days,icon:Ce,title:"Flower",stage:"flower"},{days:e.attributes?.dry_days,icon:De,title:"Dry",stage:"dry"},{days:e.attributes?.cure_days,icon:me,title:"Cure",stage:"cure"}].filter(e=>void 0!==e.days&&null!==e.days),r=t.filter(e=>e.days),i=(e.state||"").toLowerCase(),a="veg"===i?"vegetative":i;return R`
        ${r.map(e=>{const t=es.getPlantStageColor(e.stage),r=e.stage===a;return R`
                <div class="pc-stat-item ${r?"current-stage":""}">
                    <svg style="color: ${t};" viewBox="0 0 24 24"><path d="${e.icon}"></path></svg>
                    <div class="pc-stat-text">${e.days}d</div>
                </div>
            `})}
    `}renderDialogs(){const e=this.dataService?.getStrainLibrary()||[],t={},r=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;return r&&Object.entries(r).forEach(([e,r])=>{t[e]=r}),R`
      ${rs.renderAddPlantDialog(this._addPlantDialog,e,{onClose:()=>this._addPlantDialog=null,onConfirm:()=>this._confirmAddPlant(),onStrainChange:t=>{if(this._addPlantDialog){this._addPlantDialog.strain=t;const r=e.find(e=>e.strain===t);r&&r.phenotype?this._addPlantDialog.phenotype=r.phenotype:this._addPlantDialog.phenotype="",this.requestUpdate()}},onPhenotypeChange:e=>{this._addPlantDialog&&(this._addPlantDialog.phenotype=e)},onVegStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.veg_start=e)},onFlowerStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.flower_start=e)},onRowChange:e=>{if(this._addPlantDialog){const t=parseInt(e);!isNaN(t)&&t>0&&(this._addPlantDialog.row=t-1,this.requestUpdate())}},onColChange:e=>{if(this._addPlantDialog){const t=parseInt(e);!isNaN(t)&&t>0&&(this._addPlantDialog.col=t-1,this.requestUpdate())}}})}

      ${rs.renderPlantOverviewDialog(this._plantOverviewDialog,t,{onClose:()=>this._plantOverviewDialog=null,onUpdate:()=>{this._updatePlant()},onDelete:e=>{this._handleDeletePlant(e)},onHarvest:e=>{this._harvestPlant(e)},onClone:(e,t)=>{this.clonePlant(e,t)},onTakeClone:(e,t)=>{this.clonePlant(e,t)},onMoveClone:(e,t)=>{this.hass.callService("growspace_manager","move_clone",{plant_id:e.attributes.plant_id,target_growspace_id:t}).then(()=>{console.log(`Clone ${e.attributes.friendly_name} moved to ${t}`),this._plantOverviewDialog=null}).catch(e=>{console.error("Error moving clone:",e)})},onFinishDrying:e=>{this._finishDryingPlant(e)},_harvestPlant:this._harvestPlant.bind(this),_finishDryingPlant:this._finishDryingPlant.bind(this),onAttributeChange:(e,t)=>{this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes[e]=t)}})}

      ${rs.renderStrainLibraryDialog(this._strainLibraryDialog,{onClose:()=>this._strainLibraryDialog=null,onAddStrain:()=>this._addStrain(),onRemoveStrain:e=>this._removeStrain(e),onClearAll:()=>this._clearStrains(),onEditorChange:(e,t)=>this._handleStrainEditorChange(e,t),onSwitchView:(e,t)=>this._switchStrainView(e,t),onSearch:e=>this._setStrainSearchQuery(e),onToggleCropMode:e=>this._toggleCropMode(e),onToggleImageSelector:e=>this._toggleImageSelector(e),onSelectLibraryImage:e=>this._handleSelectLibraryImage(e),onExportStrains:()=>this._handleExportLibrary(),onOpenImportDialog:()=>this._openImportDialog(),onImportDialogChange:e=>this._handleImportDialogChange(e),onConfirmImport:()=>this._performImport()})}

      ${rs.renderConfigDialog(this._configDialog,t,{onClose:()=>this._configDialog=null,onSwitchTab:e=>{this._configDialog&&(this._configDialog.currentTab=e,this.requestUpdate())},onAddGrowspaceChange:(e,t)=>{this._configDialog&&(this._configDialog.addGrowspaceData[e]=t,this.requestUpdate())},onAddGrowspaceSubmit:()=>this._handleAddGrowspaceSubmit(),onEnvChange:(e,t)=>{this._configDialog&&(this._configDialog.environmentData[e]=t,this.requestUpdate())},onEnvSubmit:()=>this._handleEnvSubmit(),onGlobalChange:(e,t)=>{this._configDialog&&(this._configDialog.globalData[e]=t,this.requestUpdate())},onGlobalSubmit:()=>this._handleGlobalSubmit()})}

    ${this._growMasterDialog?(()=>{let e,t=!1;if(this.selectedDevice&&this.hass){const e=this.selectedDevice,r=[`binary_sensor.${e}_plants_under_stress`,`binary_sensor.${e}_stress`,`binary_sensor.growspace_manager_${e}_stress`];for(const e of r){const r=this.hass.states[e];if(r&&"on"===r.state){t=!0;break}}}if(this.hass){const t=this.hass.states["sensor.growspace_manager"];t&&t.attributes&&t.attributes.ai_settings&&(e=t.attributes.personality||t.attributes.ai_settings.personality)}return rs.renderGrowMasterDialog(this._growMasterDialog,t,e,{onClose:()=>this._growMasterDialog=null,onQueryChange:e=>{this._growMasterDialog&&(this._growMasterDialog.userQuery=e,this.requestUpdate())},onAnalyze:()=>this._handleAskAdvice()})})():""}
    `}};is.styles=[Xa,o`
      :host {
        display: block;
        font-family: 'Roboto', sans-serif;
        color: var(--growspace-card-text);
      }

      /* Rich Card Style */
      .plant-card-rich {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        border-radius: 16px;
        overflow: hidden;
        /* Default background if no image */
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        aspect-ratio: 1;
      }

      .plant-card-rich:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .plant-card-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-size: cover;
        z-index: 0;
      }

      .plant-card-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.3) 100%);
        z-index: 1;
      }

      .plant-card-content {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        gap: 16px;
        height: 100%;
        padding: 16px;
        box-sizing: border-box;
      }

      .pc-info {
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: center;
      }

      .pc-strain-name {
        font-size: 1.1rem;
        font-weight: 700;
        color: #fff;
        text-shadow: 0 2px 4px rgba(0,0,0,0.8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .pc-pheno {
        font-size: 0.9rem;
        color: rgba(255,255,255,0.7);
        font-weight: 500;
      }

      .pc-stage {
        font-size: 1rem;
        font-weight: 600;
        margin-top: 8px;
        color: var(--stage-color);
        text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        text-transform: capitalize;
      }

      .pc-stats {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 0 12px;
        box-sizing: border-box;
      }

      .pc-stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .pc-stat-item svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
      }

      .pc-stat-text {
        font-size: 0.85rem;
        font-weight: 500;
        color: #fff;
      }

      /* Empty Slot Redesign */
      .plant-card-empty {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.02);
        border: 2px dashed rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        color: rgba(255,255,255,0.3);
        transition: all 0.2s;
        cursor: pointer;
        min-height: 100px;
        aspect-ratio: 1;
        gap: 12px;
      }

      .plant-card-empty:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.3);
        color: rgba(255,255,255,0.8);
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

      /* Allow Grid Items to Scale Down (Fix 5-col Overflow) */
      .plant-card-rich, .plant-card-empty {
         min-width: 0;
      }

      /* Force List View for Wide Grids on Desktop */
      .grid.force-list-view {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          /* Remove grid template */
          grid-template-columns: 1fr !important;
          grid-template-rows: auto !important;
      }

      .grid.force-list-view .plant-card-rich {
          min-height: auto;
          aspect-ratio: unset;
          flex-direction: row;
          align-items: center;
          padding: 12px;
          gap: 12px;
      }

      .grid.force-list-view .plant-card-bg {
           position: relative;
           width: 64px;
           height: 64px;
           border-radius: 8px;
           flex-shrink: 0;
           background-color: rgba(0,0,0,0.2);
      }

      .grid.force-list-view .plant-card-overlay {
           display: none;
      }

      .grid.force-list-view .plant-card-content {
           flex-direction: row;
           padding: 0;
           align-items: center;
           width: 100%;
           justify-content: space-between;
           gap: 8px;
      }

      .grid.force-list-view .pc-info {
           margin-top: 0;
           align-items: flex-start;
           text-align: left;
           flex: 1;
           gap: 2px;
      }

      .grid.force-list-view .pc-strain-name {
           font-size: 1rem;
      }

      .grid.force-list-view .pc-pheno {
           font-size: 0.85rem;
      }

      .grid.force-list-view .pc-stage {
           margin-top: 2px;
           font-size: 0.85rem;
      }

      .grid.force-list-view .pc-stats {
           width: auto;
           padding: 0;
           gap: 12px;
           flex-shrink: 0;
      }

      .grid.force-list-view .pc-stat-item svg {
           width: 20px;
           height: 20px;
      }

      .grid.force-list-view .plant-card-empty {
           min-height: 80px;
           aspect-ratio: unset;
           flex-direction: row;
           justify-content: flex-start;
           padding: 0 24px;
           gap: 16px;
      }

      @media (max-width: 600px) {
        .unified-growspace-card {
            padding: 12px;
        }
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

        /* Mobile List View for Rich Cards */
        .plant-card-rich {
          width: unset;
          min-height: auto;
          aspect-ratio: unset;
          flex-direction: row;
          align-items: center;
          padding: 12px;
          gap: 12px;
        }

        .plant-card-bg {
           /* Turn background into a thumbnail on mobile */
           position: relative;
           width: 64px;
           height: 64px;
           border-radius: 8px;
           flex-shrink: 0;
           background-color: rgba(0,0,0,0.2);
        }

        .plant-card-overlay {
           display: none;
        }

        .plant-card-content {
           flex: 1;
           min-width: 0;
           flex-direction: row;
           padding: 0;
           align-items: center;
           justify-content: space-between;
           gap: 8px;
        }

        .pc-info {
           margin-top: 0;
           align-items: flex-start;
           text-align: left;
           flex: 1;
           gap: 2px;
        }

        .pc-strain-name {
           font-size: 0.9rem;
        }

        .pc-pheno {
           font-size: 0.8rem;
        }

        .pc-stage {
           margin-top: 2px;
           font-size: 0.8rem;
        }

        .pc-stats {
           width: auto;
           padding: 0;
           gap: 12px;
           flex-shrink: 0;
        }

        .pc-stat-item svg {
           width: 20px;
           height: 20px;
        }

        /* Hide non-current stages on mobile */
        .pc-stat-item:not(.current-stage) {
           display: none;
        }

        /* Empty Slot in List View */
        .plant-card-empty {
           min-height: 80px;
           aspect-ratio: unset;
           flex-direction: row;
           justify-content: flex-start;
           padding: 0 24px;
           gap: 16px;
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
    `],e([pe(),t("design:type",Object)],is.prototype,"_addPlantDialog",void 0),e([pe(),t("design:type",Object)],is.prototype,"_defaultApplied",void 0),e([pe(),t("design:type",Object)],is.prototype,"_plantOverviewDialog",void 0),e([pe(),t("design:type",Object)],is.prototype,"_strainLibraryDialog",void 0),e([pe(),t("design:type",Object)],is.prototype,"_configDialog",void 0),e([pe(),t("design:type",Object)],is.prototype,"_growMasterDialog",void 0),e([pe(),t("design:type",Object)],is.prototype,"selectedDevice",void 0),e([pe(),t("design:type",Object)],is.prototype,"_draggedPlant",void 0),e([pe(),t("design:type",Boolean)],is.prototype,"_isCompactView",void 0),e([pe(),t("design:type",Object)],is.prototype,"_historyData",void 0),e([pe(),t("design:type",Boolean)],is.prototype,"_lightCycleCollapsed",void 0),e([pe(),t("design:type",Set)],is.prototype,"_activeEnvGraphs",void 0),e([pe(),t("design:type",Object)],is.prototype,"_tooltip",void 0),e([he({attribute:!1}),t("design:type",Object)],is.prototype,"hass",void 0),e([he({attribute:!1}),t("design:type",Object)],is.prototype,"_config",void 0),is=e([ce("growspace-manager-card")],is);let as=class extends oe{constructor(){super(...arguments),this._growspaceOptions=[]}setConfig(e){this._config=e,this._loadGrowspaces()}updated(e){e.has("hass")&&this.hass&&(this._loadGrowspaces(),this._subscribeToSensorUpdates())}disconnectedCallback(){super.disconnectedCallback(),this._unsubStateChanged&&(this._unsubStateChanged(),this._unsubStateChanged=void 0)}_subscribeToSensorUpdates(){this.hass&&!this._unsubStateChanged&&(this._unsubStateChanged=this.hass.connection.subscribeEvents(e=>{const t=e.data.new_state;"sensor.growspaces_list"===t?.entity_id&&(Array.isArray(t.attributes?.growspaces)?this._growspaceOptions=t.attributes.growspaces:this._growspaceOptions=[])},"state_changed"))}_loadGrowspaces(){if(!this.hass)return;const e=this.hass.states["sensor.growspaces_list"];if(e&&e.attributes?.growspaces){const t=e.attributes.growspaces;this._growspaceOptions=Object.values(t)}else this._growspaceOptions=[]}render(){return this._config?R`
      <div class="form-group">
        <label>Default Growspace</label>
        <select
          .value=${this._config.default_growspace??""}
          @change=${e=>this._valueChanged("default_growspace",e.target.value)}
        >
          <option value="">Select a growspace</option>
          ${0===this._growspaceOptions.length?R`<option disabled>No growspaces found</option>`:this._growspaceOptions.map(e=>R`<option value="${e}">${e}</option>`)}
        </select>
      </div>
    `:R``}_valueChanged(e,t){if(!this._config)return;const r={...this._config,[e]:t};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:r},bubbles:!0,composed:!0}))}};as.styles=o`
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
  `,e([he({attribute:!1}),t("design:type",Object)],as.prototype,"hass",void 0),e([he({attribute:!1}),t("design:type",Object)],as.prototype,"_config",void 0),e([pe(),t("design:type",Array)],as.prototype,"_growspaceOptions",void 0),as=e([ce("growspace-manager-card-editor")],as);var ss=Object.freeze({__proto__:null,get GrowspaceManagerCardEditor(){return as}});export{is as GrowspaceManagerCard};
