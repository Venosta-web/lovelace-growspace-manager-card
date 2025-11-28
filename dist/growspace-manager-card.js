function e(e,t,i,r){var a,n=arguments.length,s=n<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(e,t,i,r);else for(var o=e.length-1;o>=0;o--)(a=e[o])&&(s=(n<3?a(s):n>3?a(t,i,s):a(t,i))||s);return n>3&&s&&Object.defineProperty(t,i,s),s}function t(e,t){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(e,t)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const i=globalThis,r=i.ShadowRoot&&(void 0===i.ShadyCSS||i.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,a=Symbol(),n=new WeakMap;class s{constructor(e,t,i){if(this._$cssResult$=!0,i!==a)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(r&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=n.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&n.set(t,e))}return e}toString(){return this.cssText}}const o=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[r+1],e[0]);return new s(i,e,a)},l=r?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new s("string"==typeof e?e:e+"",void 0,a))(t)})(e):e,{is:c,defineProperty:d,getOwnPropertyDescriptor:p,getOwnPropertyNames:h,getOwnPropertySymbols:u,getPrototypeOf:g}=Object,m=globalThis,f=m.trustedTypes,v=f?f.emptyScript:"",y=m.reactiveElementPolyfillSupport,b=(e,t)=>e,w={toAttribute(e,t){switch(t){case Boolean:e=e?v:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},x=(e,t)=>!c(e,t),_={attribute:!0,type:String,converter:w,reflect:!1,useDefault:!1,hasChanged:x};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;class $ extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=_){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),r=this.getPropertyDescriptor(e,i,t);void 0!==r&&d(this.prototype,e,r)}}static getPropertyDescriptor(e,t,i){const{get:r,set:a}=p(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){const n=r?.call(this);a?.call(this,t),this.requestUpdate(e,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??_}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const e=g(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const e=this.properties,t=[...h(e),...u(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(l(e))}else void 0!==e&&t.push(l(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,t)=>{if(r)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const r of t){const t=document.createElement("style"),a=i.litNonce;void 0!==a&&t.setAttribute("nonce",a),t.textContent=r.cssText,e.appendChild(t)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,i);if(void 0!==r&&!0===i.reflect){const a=(void 0!==i.converter?.toAttribute?i.converter:w).toAttribute(t,i.type);this._$Em=e,null==a?this.removeAttribute(r):this.setAttribute(r,a),this._$Em=null}}_$AK(e,t){const i=this.constructor,r=i._$Eh.get(e);if(void 0!==r&&this._$Em!==r){const e=i.getPropertyOptions(r),a="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:w;this._$Em=r;const n=a.fromAttribute(t,e.type);this[r]=n??this._$Ej?.get(r)??n,this._$Em=null}}requestUpdate(e,t,i){if(void 0!==e){const r=this.constructor,a=this[e];if(i??=r.getPropertyOptions(e),!((i.hasChanged??x)(a,t)||i.useDefault&&i.reflect&&a===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:r,wrapped:a},n){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,n??t??this[e]),!0!==a||void 0!==n)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,r=this[t];!0!==e||this._$AL.has(t)||void 0===r||this.C(t,void 0,i,r)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}}$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[b("elementProperties")]=new Map,$[b("finalized")]=new Map,y?.({ReactiveElement:$}),(m.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const D=globalThis,S=D.trustedTypes,C=S?S.createPolicy("lit-html",{createHTML:e=>e}):void 0,k="$lit$",A=`lit$${Math.random().toFixed(9).slice(2)}$`,M="?"+A,T=`<${M}>`,E=document,L=()=>E.createComment(""),O=e=>null===e||"object"!=typeof e&&"function"!=typeof e,I=Array.isArray,N="[ \t\n\f\r]",P=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,V=/-->/g,z=/>/g,H=RegExp(`>|${N}(?:([^\\s"'>=/]+)(${N}*=${N}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),F=/'/g,R=/"/g,G=/^(?:script|style|textarea|title)$/i,j=(e=>(t,...i)=>({_$litType$:e,strings:t,values:i}))(1),U=Symbol.for("lit-noChange"),Z=Symbol.for("lit-nothing"),B=new WeakMap,q=E.createTreeWalker(E,129);function W(e,t){if(!I(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(t):t}const Y=(e,t)=>{const i=e.length-1,r=[];let a,n=2===t?"<svg>":3===t?"<math>":"",s=P;for(let t=0;t<i;t++){const i=e[t];let o,l,c=-1,d=0;for(;d<i.length&&(s.lastIndex=d,l=s.exec(i),null!==l);)d=s.lastIndex,s===P?"!--"===l[1]?s=V:void 0!==l[1]?s=z:void 0!==l[2]?(G.test(l[2])&&(a=RegExp("</"+l[2],"g")),s=H):void 0!==l[3]&&(s=H):s===H?">"===l[0]?(s=a??P,c=-1):void 0===l[1]?c=-2:(c=s.lastIndex-l[2].length,o=l[1],s=void 0===l[3]?H:'"'===l[3]?R:F):s===R||s===F?s=H:s===V||s===z?s=P:(s=H,a=void 0);const p=s===H&&e[t+1].startsWith("/>")?" ":"";n+=s===P?i+T:c>=0?(r.push(o),i.slice(0,c)+k+i.slice(c)+A+p):i+A+(-2===c?t:p)}return[W(e,n+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),r]};class J{constructor({strings:e,_$litType$:t},i){let r;this.parts=[];let a=0,n=0;const s=e.length-1,o=this.parts,[l,c]=Y(e,t);if(this.el=J.createElement(l,i),q.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(r=q.nextNode())&&o.length<s;){if(1===r.nodeType){if(r.hasAttributes())for(const e of r.getAttributeNames())if(e.endsWith(k)){const t=c[n++],i=r.getAttribute(e).split(A),s=/([.?@])?(.*)/.exec(t);o.push({type:1,index:a,name:s[2],strings:i,ctor:"."===s[1]?te:"?"===s[1]?ie:"@"===s[1]?re:ee}),r.removeAttribute(e)}else e.startsWith(A)&&(o.push({type:6,index:a}),r.removeAttribute(e));if(G.test(r.tagName)){const e=r.textContent.split(A),t=e.length-1;if(t>0){r.textContent=S?S.emptyScript:"";for(let i=0;i<t;i++)r.append(e[i],L()),q.nextNode(),o.push({type:2,index:++a});r.append(e[t],L())}}}else if(8===r.nodeType)if(r.data===M)o.push({type:2,index:a});else{let e=-1;for(;-1!==(e=r.data.indexOf(A,e+1));)o.push({type:7,index:a}),e+=A.length-1}a++}}static createElement(e,t){const i=E.createElement("template");return i.innerHTML=e,i}}function Q(e,t,i=e,r){if(t===U)return t;let a=void 0!==r?i._$Co?.[r]:i._$Cl;const n=O(t)?void 0:t._$litDirective$;return a?.constructor!==n&&(a?._$AO?.(!1),void 0===n?a=void 0:(a=new n(e),a._$AT(e,i,r)),void 0!==r?(i._$Co??=[])[r]=a:i._$Cl=a),void 0!==a&&(t=Q(e,a._$AS(e,t.values),a,r)),t}class K{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,r=(e?.creationScope??E).importNode(t,!0);q.currentNode=r;let a=q.nextNode(),n=0,s=0,o=i[0];for(;void 0!==o;){if(n===o.index){let t;2===o.type?t=new X(a,a.nextSibling,this,e):1===o.type?t=new o.ctor(a,o.name,o.strings,this,e):6===o.type&&(t=new ae(a,this,e)),this._$AV.push(t),o=i[++s]}n!==o?.index&&(a=q.nextNode(),n++)}return q.currentNode=E,r}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,r){this.type=2,this._$AH=Z,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=Q(this,e,t),O(e)?e===Z||null==e||""===e?(this._$AH!==Z&&this._$AR(),this._$AH=Z):e!==this._$AH&&e!==U&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>I(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==Z&&O(this._$AH)?this._$AA.nextSibling.data=e:this.T(E.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,r="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=J.createElement(W(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===r)this._$AH.p(t);else{const e=new K(r,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=B.get(e.strings);return void 0===t&&B.set(e.strings,t=new J(e)),t}k(e){I(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,r=0;for(const a of e)r===t.length?t.push(i=new X(this.O(L()),this.O(L()),this,this.options)):i=t[r],i._$AI(a),r++;r<t.length&&(this._$AR(i&&i._$AB.nextSibling,r),t.length=r)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=e.nextSibling;e.remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,r,a){this.type=1,this._$AH=Z,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=a,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=Z}_$AI(e,t=this,i,r){const a=this.strings;let n=!1;if(void 0===a)e=Q(this,e,t,0),n=!O(e)||e!==this._$AH&&e!==U,n&&(this._$AH=e);else{const r=e;let s,o;for(e=a[0],s=0;s<a.length-1;s++)o=Q(this,r[i+s],t,s),o===U&&(o=this._$AH[s]),n||=!O(o)||o!==this._$AH[s],o===Z?e=Z:e!==Z&&(e+=(o??"")+a[s+1]),this._$AH[s]=o}n&&!r&&this.j(e)}j(e){e===Z?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===Z?void 0:e}}class ie extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==Z)}}class re extends ee{constructor(e,t,i,r,a){super(e,t,i,r,a),this.type=5}_$AI(e,t=this){if((e=Q(this,e,t,0)??Z)===U)return;const i=this._$AH,r=e===Z&&i!==Z||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,a=e!==Z&&(i===Z||r);r&&this.element.removeEventListener(this.name,this,i),a&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ae{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){Q(this,e)}}const ne=D.litHtmlPolyfillSupport;ne?.(J,X),(D.litHtmlVersions??=[]).push("3.3.1");const se=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class oe extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const r=i?.renderBefore??t;let a=r._$litPart$;if(void 0===a){const e=i?.renderBefore??null;r._$litPart$=a=new X(t.insertBefore(L(),e),e,void 0,i??{})}return a._$AI(e),a})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return U}}oe._$litElement$=!0,oe.finalized=!0,se.litElementHydrateSupport?.({LitElement:oe});const le=se.litElementPolyfillSupport;le?.({LitElement:oe}),(se.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ce=e=>(t,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)},de={attribute:!0,type:String,converter:w,reflect:!1,hasChanged:x},pe=(e=de,t,i)=>{const{kind:r,metadata:a}=i;let n=globalThis.litPropertyMetadata.get(a);if(void 0===n&&globalThis.litPropertyMetadata.set(a,n=new Map),"setter"===r&&((e=Object.create(e)).wrapped=!0),n.set(i.name,e),"accessor"===r){const{name:r}=i;return{set(i){const a=t.get.call(this);t.set.call(this,i),this.requestUpdate(r,a,e)},init(t){return void 0!==t&&this.C(r,void 0,e,t),t}}}if("setter"===r){const{name:r}=i;return function(i){const a=this[r];t.call(this,i),this.requestUpdate(r,a,e)}}throw Error("Unsupported decorator location: "+r)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function he(e){return(t,i)=>"object"==typeof i?pe(e,t,i):((e,t,i)=>{const r=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),r?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ue(e){return he({...e,state:!0,attribute:!1})}var ge="M21.33,12.91C21.42,14.46 20.71,15.95 19.44,16.86L20.21,18.35C20.44,18.8 20.47,19.33 20.27,19.8C20.08,20.27 19.69,20.64 19.21,20.8L18.42,21.05C18.25,21.11 18.06,21.14 17.88,21.14C17.37,21.14 16.89,20.91 16.56,20.5L14.44,18C13.55,17.85 12.71,17.47 12,16.9C11.5,17.05 11,17.13 10.5,17.13C9.62,17.13 8.74,16.86 8,16.34C7.47,16.5 6.93,16.57 6.38,16.56C5.59,16.57 4.81,16.41 4.08,16.11C2.65,15.47 1.7,14.07 1.65,12.5C1.57,11.78 1.69,11.05 2,10.39C1.71,9.64 1.68,8.82 1.93,8.06C2.3,7.11 3,6.32 3.87,5.82C4.45,4.13 6.08,3 7.87,3.12C9.47,1.62 11.92,1.46 13.7,2.75C14.12,2.64 14.56,2.58 15,2.58C16.36,2.55 17.65,3.15 18.5,4.22C20.54,4.75 22,6.57 22.08,8.69C22.13,9.8 21.83,10.89 21.22,11.82C21.29,12.18 21.33,12.54 21.33,12.91M16.33,11.5C16.9,11.57 17.35,12 17.35,12.57A1,1 0 0,1 16.35,13.57H15.72C15.4,14.47 14.84,15.26 14.1,15.86C14.35,15.95 14.61,16 14.87,16.07C20,16 19.4,12.87 19.4,12.82C19.34,11.39 18.14,10.27 16.71,10.33A1,1 0 0,1 15.71,9.33A1,1 0 0,1 16.71,8.33C17.94,8.36 19.12,8.82 20.04,9.63C20.09,9.34 20.12,9.04 20.12,8.74C20.06,7.5 19.5,6.42 17.25,6.21C16,3.25 12.85,4.89 12.85,5.81V5.81C12.82,6.04 13.06,6.53 13.1,6.56A1,1 0 0,1 14.1,7.56C14.1,8.11 13.65,8.56 13.1,8.56V8.56C12.57,8.54 12.07,8.34 11.67,8C11.19,8.31 10.64,8.5 10.07,8.56V8.56C9.5,8.61 9.03,8.21 9,7.66C8.92,7.1 9.33,6.61 9.88,6.56C10.04,6.54 10.82,6.42 10.82,5.79V5.79C10.82,5.13 11.07,4.5 11.5,4C10.58,3.75 9.59,4.08 8.59,5.29C6.75,5 6,5.25 5.45,7.2C4.5,7.67 4,8 3.78,9C4.86,8.78 5.97,8.87 7,9.25C7.5,9.44 7.78,10 7.59,10.54C7.4,11.06 6.82,11.32 6.3,11.13C5.57,10.81 4.75,10.79 4,11.07C3.68,11.34 3.68,11.9 3.68,12.34C3.68,13.08 4.05,13.77 4.68,14.17C5.21,14.44 5.8,14.58 6.39,14.57C6.24,14.31 6.11,14.04 6,13.76C5.81,13.22 6.1,12.63 6.64,12.44C7.18,12.25 7.77,12.54 7.96,13.08C8.36,14.22 9.38,15 10.58,15.13C11.95,15.06 13.17,14.25 13.77,13C14,11.62 15.11,11.5 16.33,11.5M18.33,18.97L17.71,17.67L17,17.83L18,19.08L18.33,18.97M13.68,10.36C13.7,9.83 13.3,9.38 12.77,9.33C12.06,9.29 11.37,9.53 10.84,10C10.27,10.58 9.97,11.38 10,12.19A1,1 0 0,0 11,13.19C11.57,13.19 12,12.74 12,12.19C12,11.92 12.07,11.65 12.23,11.43C12.35,11.33 12.5,11.28 12.66,11.28C13.21,11.31 13.68,10.9 13.68,10.36Z",me="M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z",fe="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",ve="M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z",ye="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",be="M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20M6.5 18H18.5Q19.55 18 20.27 17.27 21 16.55 21 15.5 21 14.45 20.27 13.73 19.55 13 18.5 13H17V11Q17 8.93 15.54 7.46 14.08 6 12 6 9.93 6 8.46 7.46 7 8.93 7 11H6.5Q5.05 11 4.03 12.03 3 13.05 3 14.5 3 15.95 4.03 17 5.05 18 6.5 18M12 12Z",we="M11 20H6.5Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20H13V12.85L14.6 14.4L16 13L12 9L8 13L9.4 14.4L11 12.85Z",xe="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",_e="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z",$e="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",De="M4,2H6V4C6,5.44 6.68,6.61 7.88,7.78C8.74,8.61 9.89,9.41 11.09,10.2L9.26,11.39C8.27,10.72 7.31,10 6.5,9.21C5.07,7.82 4,6.1 4,4V2M18,2H20V4C20,6.1 18.93,7.82 17.5,9.21C16.09,10.59 14.29,11.73 12.54,12.84C10.79,13.96 9.09,15.05 7.88,16.22C6.68,17.39 6,18.56 6,20V22H4V20C4,17.9 5.07,16.18 6.5,14.79C7.91,13.41 9.71,12.27 11.46,11.16C13.21,10.04 14.91,8.95 16.12,7.78C17.32,6.61 18,5.44 18,4V2M14.74,12.61C15.73,13.28 16.69,14 17.5,14.79C18.93,16.18 20,17.9 20,20V22H18V20C18,18.56 17.32,17.39 16.12,16.22C15.26,15.39 14.11,14.59 12.91,13.8L14.74,12.61M7,3H17V4L16.94,4.5H7.06L7,4V3M7.68,6H16.32C16.08,6.34 15.8,6.69 15.42,7.06L14.91,7.5H9.07L8.58,7.06C8.2,6.69 7.92,6.34 7.68,6M9.09,16.5H14.93L15.42,16.94C15.8,17.31 16.08,17.66 16.32,18H7.68C7.92,17.66 8.2,17.31 8.58,16.94L9.09,16.5M7.06,19.5H16.94L17,20V21H7V20L7.06,19.5Z",Se="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",Ce="M22 9A4.32 4.32 0 0 1 19.78 8.45A3.4 3.4 0 0 0 18 8V7A4.32 4.32 0 0 1 20.22 7.55A3.4 3.4 0 0 0 22 8M22 6A3.4 3.4 0 0 1 20.22 5.55A4.32 4.32 0 0 0 18 5V6A3.4 3.4 0 0 1 19.78 6.45A4.32 4.32 0 0 0 22 7M22 10A3.4 3.4 0 0 1 20.22 9.55A4.32 4.32 0 0 0 18 9V10A3.4 3.4 0 0 1 19.78 10.45A4.32 4.32 0 0 0 22 11M10 12.73A70.39 70.39 0 0 0 17 11V4S10.5 2 7.5 2A5.5 5.5 0 0 0 6.12 12.82L7 19H8A3 3 0 0 0 9.46 21.33A3.15 3.15 0 0 1 11 24H12A4.12 4.12 0 0 0 10.09 20.55C9.39 20 9 19.63 9 19H10M7.5 10A2.5 2.5 0 1 1 10 7.5A2.5 2.5 0 0 1 7.5 10Z",ke="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z",Ae="M12,6A6,6 0 0,1 18,12C18,14.22 16.79,16.16 15,17.2V19A1,1 0 0,1 14,20H10A1,1 0 0,1 9,19V17.2C7.21,16.16 6,14.22 6,12A6,6 0 0,1 12,6M14,21V22A1,1 0 0,1 13,23H11A1,1 0 0,1 10,22V21H14M20,11H23V13H20V11M1,11H4V13H1V11M13,1V4H11V1H13M4.92,3.5L7.05,5.64L5.63,7.05L3.5,4.93L4.92,3.5M16.95,5.63L19.07,3.5L20.5,4.93L18.37,7.05L16.95,5.63Z",Me="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z",Te="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",Ee="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",Le="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",Oe="M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z",Ie="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z",Ne="M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z",Pe="M8 13C6.14 13 4.59 14.28 4.14 16H2V18H4.14C4.59 19.72 6.14 21 8 21S11.41 19.72 11.86 18H22V16H11.86C11.41 14.28 9.86 13 8 13M8 19C6.9 19 6 18.1 6 17C6 15.9 6.9 15 8 15S10 15.9 10 17C10 18.1 9.1 19 8 19M19.86 6C19.41 4.28 17.86 3 16 3S12.59 4.28 12.14 6H2V8H12.14C12.59 9.72 14.14 11 16 11S19.41 9.72 19.86 8H22V6H19.86M16 9C14.9 9 14 8.1 14 7C14 5.9 14.9 5 16 5S18 5.9 18 7C18 8.1 17.1 9 16 9Z",Ve="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z",ze="M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z",He="M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z",Fe="M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z",Re="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z",Ge="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z";class je extends Error{}class Ue extends je{constructor(e){super(`Invalid DateTime: ${e.toMessage()}`)}}class Ze extends je{constructor(e){super(`Invalid Interval: ${e.toMessage()}`)}}class Be extends je{constructor(e){super(`Invalid Duration: ${e.toMessage()}`)}}class qe extends je{}class We extends je{constructor(e){super(`Invalid unit ${e}`)}}class Ye extends je{}class Je extends je{constructor(){super("Zone is an abstract class")}}const Qe="numeric",Ke="short",Xe="long",et={year:Qe,month:Qe,day:Qe},tt={year:Qe,month:Ke,day:Qe},it={year:Qe,month:Ke,day:Qe,weekday:Ke},rt={year:Qe,month:Xe,day:Qe},at={year:Qe,month:Xe,day:Qe,weekday:Xe},nt={hour:Qe,minute:Qe},st={hour:Qe,minute:Qe,second:Qe},ot={hour:Qe,minute:Qe,second:Qe,timeZoneName:Ke},lt={hour:Qe,minute:Qe,second:Qe,timeZoneName:Xe},ct={hour:Qe,minute:Qe,hourCycle:"h23"},dt={hour:Qe,minute:Qe,second:Qe,hourCycle:"h23"},pt={hour:Qe,minute:Qe,second:Qe,hourCycle:"h23",timeZoneName:Ke},ht={hour:Qe,minute:Qe,second:Qe,hourCycle:"h23",timeZoneName:Xe},ut={year:Qe,month:Qe,day:Qe,hour:Qe,minute:Qe},gt={year:Qe,month:Qe,day:Qe,hour:Qe,minute:Qe,second:Qe},mt={year:Qe,month:Ke,day:Qe,hour:Qe,minute:Qe},ft={year:Qe,month:Ke,day:Qe,hour:Qe,minute:Qe,second:Qe},vt={year:Qe,month:Ke,day:Qe,weekday:Ke,hour:Qe,minute:Qe},yt={year:Qe,month:Xe,day:Qe,hour:Qe,minute:Qe,timeZoneName:Ke},bt={year:Qe,month:Xe,day:Qe,hour:Qe,minute:Qe,second:Qe,timeZoneName:Ke},wt={year:Qe,month:Xe,day:Qe,weekday:Xe,hour:Qe,minute:Qe,timeZoneName:Xe},xt={year:Qe,month:Xe,day:Qe,weekday:Xe,hour:Qe,minute:Qe,second:Qe,timeZoneName:Xe};class _t{get type(){throw new Je}get name(){throw new Je}get ianaName(){return this.name}get isUniversal(){throw new Je}offsetName(e,t){throw new Je}formatOffset(e,t){throw new Je}offset(e){throw new Je}equals(e){throw new Je}get isValid(){throw new Je}}let $t=null;class Dt extends _t{static get instance(){return null===$t&&($t=new Dt),$t}get type(){return"system"}get name(){return(new Intl.DateTimeFormat).resolvedOptions().timeZone}get isUniversal(){return!1}offsetName(e,{format:t,locale:i}){return Ui(e,t,i)}formatOffset(e,t){return Wi(this.offset(e),t)}offset(e){return-new Date(e).getTimezoneOffset()}equals(e){return"system"===e.type}get isValid(){return!0}}const St=new Map;const Ct={year:0,month:1,day:2,era:3,hour:4,minute:5,second:6};const kt=new Map;class At extends _t{static create(e){let t=kt.get(e);return void 0===t&&kt.set(e,t=new At(e)),t}static resetCache(){kt.clear(),St.clear()}static isValidSpecifier(e){return this.isValidZone(e)}static isValidZone(e){if(!e)return!1;try{return new Intl.DateTimeFormat("en-US",{timeZone:e}).format(),!0}catch(e){return!1}}constructor(e){super(),this.zoneName=e,this.valid=At.isValidZone(e)}get type(){return"iana"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(e,{format:t,locale:i}){return Ui(e,t,i,this.name)}formatOffset(e,t){return Wi(this.offset(e),t)}offset(e){if(!this.valid)return NaN;const t=new Date(e);if(isNaN(t))return NaN;const i=function(e){let t=St.get(e);return void 0===t&&(t=new Intl.DateTimeFormat("en-US",{hour12:!1,timeZone:e,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",era:"short"}),St.set(e,t)),t}(this.name);let[r,a,n,s,o,l,c]=i.formatToParts?function(e,t){const i=e.formatToParts(t),r=[];for(let e=0;e<i.length;e++){const{type:t,value:a}=i[e],n=Ct[t];"era"===t?r[n]=a:$i(n)||(r[n]=parseInt(a,10))}return r}(i,t):function(e,t){const i=e.format(t).replace(/\u200E/g,""),r=/(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(i),[,a,n,s,o,l,c,d]=r;return[s,a,n,o,l,c,d]}(i,t);"BC"===s&&(r=1-Math.abs(r));let d=+t;const p=d%1e3;return d-=p>=0?p:1e3+p,(Fi({year:r,month:a,day:n,hour:24===o?0:o,minute:l,second:c,millisecond:0})-d)/6e4}equals(e){return"iana"===e.type&&e.name===this.name}get isValid(){return this.valid}}let Mt={};const Tt=new Map;function Et(e,t={}){const i=JSON.stringify([e,t]);let r=Tt.get(i);return void 0===r&&(r=new Intl.DateTimeFormat(e,t),Tt.set(i,r)),r}const Lt=new Map;const Ot=new Map;let It=null;const Nt=new Map;function Pt(e){let t=Nt.get(e);return void 0===t&&(t=new Intl.DateTimeFormat(e).resolvedOptions(),Nt.set(e,t)),t}const Vt=new Map;function zt(e,t,i,r){const a=e.listingMode();return"error"===a?null:"en"===a?i(t):r(t)}class Ht{constructor(e,t,i){this.padTo=i.padTo||0,this.floor=i.floor||!1;const{padTo:r,floor:a,...n}=i;if(!t||Object.keys(n).length>0){const t={useGrouping:!1,...i};i.padTo>0&&(t.minimumIntegerDigits=i.padTo),this.inf=function(e,t={}){const i=JSON.stringify([e,t]);let r=Lt.get(i);return void 0===r&&(r=new Intl.NumberFormat(e,t),Lt.set(i,r)),r}(e,t)}}format(e){if(this.inf){const t=this.floor?Math.floor(e):e;return this.inf.format(t)}return Li(this.floor?Math.floor(e):Pi(e,3),this.padTo)}}class Ft{constructor(e,t,i){let r;if(this.opts=i,this.originalZone=void 0,this.opts.timeZone)this.dt=e;else if("fixed"===e.zone.type){const t=e.offset/60*-1,i=t>=0?`Etc/GMT+${t}`:`Etc/GMT${t}`;0!==e.offset&&At.create(i).valid?(r=i,this.dt=e):(r="UTC",this.dt=0===e.offset?e:e.setZone("UTC").plus({minutes:e.offset}),this.originalZone=e.zone)}else"system"===e.zone.type?this.dt=e:"iana"===e.zone.type?(this.dt=e,r=e.zone.name):(r="UTC",this.dt=e.setZone("UTC").plus({minutes:e.offset}),this.originalZone=e.zone);const a={...this.opts};a.timeZone=a.timeZone||r,this.dtf=Et(t,a)}format(){return this.originalZone?this.formatToParts().map(({value:e})=>e).join(""):this.dtf.format(this.dt.toJSDate())}formatToParts(){const e=this.dtf.formatToParts(this.dt.toJSDate());return this.originalZone?e.map(e=>{if("timeZoneName"===e.type){const t=this.originalZone.offsetName(this.dt.ts,{locale:this.dt.locale,format:this.opts.timeZoneName});return{...e,value:t}}return e}):e}resolvedOptions(){return this.dtf.resolvedOptions()}}class Rt{constructor(e,t,i){this.opts={style:"long",...i},!t&&Ci()&&(this.rtf=function(e,t={}){const{base:i,...r}=t,a=JSON.stringify([e,r]);let n=Ot.get(a);return void 0===n&&(n=new Intl.RelativeTimeFormat(e,t),Ot.set(a,n)),n}(e,i))}format(e,t){return this.rtf?this.rtf.format(e,t):function(e,t,i="always",r=!1){const a={years:["year","yr."],quarters:["quarter","qtr."],months:["month","mo."],weeks:["week","wk."],days:["day","day","days"],hours:["hour","hr."],minutes:["minute","min."],seconds:["second","sec."]},n=-1===["hours","minutes","seconds"].indexOf(e);if("auto"===i&&n){const i="days"===e;switch(t){case 1:return i?"tomorrow":`next ${a[e][0]}`;case-1:return i?"yesterday":`last ${a[e][0]}`;case 0:return i?"today":`this ${a[e][0]}`}}const s=Object.is(t,-0)||t<0,o=Math.abs(t),l=1===o,c=a[e],d=r?l?c[1]:c[2]||c[1]:l?a[e][0]:e;return s?`${o} ${d} ago`:`in ${o} ${d}`}(t,e,this.opts.numeric,"long"!==this.opts.style)}formatToParts(e,t){return this.rtf?this.rtf.formatToParts(e,t):[]}}const Gt={firstDay:1,minimalDays:4,weekend:[6,7]};class jt{static fromOpts(e){return jt.create(e.locale,e.numberingSystem,e.outputCalendar,e.weekSettings,e.defaultToEN)}static create(e,t,i,r,a=!1){const n=e||oi.defaultLocale,s=n||(a?"en-US":It||(It=(new Intl.DateTimeFormat).resolvedOptions().locale,It)),o=t||oi.defaultNumberingSystem,l=i||oi.defaultOutputCalendar,c=Ti(r)||oi.defaultWeekSettings;return new jt(s,o,l,c,n)}static resetCache(){It=null,Tt.clear(),Lt.clear(),Ot.clear(),Nt.clear(),Vt.clear()}static fromObject({locale:e,numberingSystem:t,outputCalendar:i,weekSettings:r}={}){return jt.create(e,t,i,r)}constructor(e,t,i,r,a){const[n,s,o]=function(e){const t=e.indexOf("-x-");-1!==t&&(e=e.substring(0,t));const i=e.indexOf("-u-");if(-1===i)return[e];{let t,r;try{t=Et(e).resolvedOptions(),r=e}catch(a){const n=e.substring(0,i);t=Et(n).resolvedOptions(),r=n}const{numberingSystem:a,calendar:n}=t;return[r,a,n]}}(e);this.locale=n,this.numberingSystem=t||s||null,this.outputCalendar=i||o||null,this.weekSettings=r,this.intl=function(e,t,i){return i||t?(e.includes("-u-")||(e+="-u"),i&&(e+=`-ca-${i}`),t&&(e+=`-nu-${t}`),e):e}(this.locale,this.numberingSystem,this.outputCalendar),this.weekdaysCache={format:{},standalone:{}},this.monthsCache={format:{},standalone:{}},this.meridiemCache=null,this.eraCache={},this.specifiedLocale=a,this.fastNumbersCached=null}get fastNumbers(){var e;return null==this.fastNumbersCached&&(this.fastNumbersCached=(!(e=this).numberingSystem||"latn"===e.numberingSystem)&&("latn"===e.numberingSystem||!e.locale||e.locale.startsWith("en")||"latn"===Pt(e.locale).numberingSystem)),this.fastNumbersCached}listingMode(){const e=this.isEnglish(),t=!(null!==this.numberingSystem&&"latn"!==this.numberingSystem||null!==this.outputCalendar&&"gregory"!==this.outputCalendar);return e&&t?"en":"intl"}clone(e){return e&&0!==Object.getOwnPropertyNames(e).length?jt.create(e.locale||this.specifiedLocale,e.numberingSystem||this.numberingSystem,e.outputCalendar||this.outputCalendar,Ti(e.weekSettings)||this.weekSettings,e.defaultToEN||!1):this}redefaultToEN(e={}){return this.clone({...e,defaultToEN:!0})}redefaultToSystem(e={}){return this.clone({...e,defaultToEN:!1})}months(e,t=!1){return zt(this,e,Xi,()=>{const i="ja"===this.intl||this.intl.startsWith("ja-"),r=(t&=!i)?{month:e,day:"numeric"}:{month:e},a=t?"format":"standalone";if(!this.monthsCache[a][e]){const t=i?e=>this.dtFormatter(e,r).format():e=>this.extract(e,r,"month");this.monthsCache[a][e]=function(e){const t=[];for(let i=1;i<=12;i++){const r=nn.utc(2009,i,1);t.push(e(r))}return t}(t)}return this.monthsCache[a][e]})}weekdays(e,t=!1){return zt(this,e,rr,()=>{const i=t?{weekday:e,year:"numeric",month:"long",day:"numeric"}:{weekday:e},r=t?"format":"standalone";return this.weekdaysCache[r][e]||(this.weekdaysCache[r][e]=function(e){const t=[];for(let i=1;i<=7;i++){const r=nn.utc(2016,11,13+i);t.push(e(r))}return t}(e=>this.extract(e,i,"weekday"))),this.weekdaysCache[r][e]})}meridiems(){return zt(this,void 0,()=>ar,()=>{if(!this.meridiemCache){const e={hour:"numeric",hourCycle:"h12"};this.meridiemCache=[nn.utc(2016,11,13,9),nn.utc(2016,11,13,19)].map(t=>this.extract(t,e,"dayperiod"))}return this.meridiemCache})}eras(e){return zt(this,e,lr,()=>{const t={era:e};return this.eraCache[e]||(this.eraCache[e]=[nn.utc(-40,1,1),nn.utc(2017,1,1)].map(e=>this.extract(e,t,"era"))),this.eraCache[e]})}extract(e,t,i){const r=this.dtFormatter(e,t).formatToParts().find(e=>e.type.toLowerCase()===i);return r?r.value:null}numberFormatter(e={}){return new Ht(this.intl,e.forceSimple||this.fastNumbers,e)}dtFormatter(e,t={}){return new Ft(e,this.intl,t)}relFormatter(e={}){return new Rt(this.intl,this.isEnglish(),e)}listFormatter(e={}){return function(e,t={}){const i=JSON.stringify([e,t]);let r=Mt[i];return r||(r=new Intl.ListFormat(e,t),Mt[i]=r),r}(this.intl,e)}isEnglish(){return"en"===this.locale||"en-us"===this.locale.toLowerCase()||Pt(this.intl).locale.startsWith("en-us")}getWeekSettings(){return this.weekSettings?this.weekSettings:ki()?function(e){let t=Vt.get(e);if(!t){const i=new Intl.Locale(e);t="getWeekInfo"in i?i.getWeekInfo():i.weekInfo,"minimalDays"in t||(t={...Gt,...t}),Vt.set(e,t)}return t}(this.locale):Gt}getStartOfWeek(){return this.getWeekSettings().firstDay}getMinDaysInFirstWeek(){return this.getWeekSettings().minimalDays}getWeekendDays(){return this.getWeekSettings().weekend}equals(e){return this.locale===e.locale&&this.numberingSystem===e.numberingSystem&&this.outputCalendar===e.outputCalendar}toString(){return`Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`}}let Ut=null;class Zt extends _t{static get utcInstance(){return null===Ut&&(Ut=new Zt(0)),Ut}static instance(e){return 0===e?Zt.utcInstance:new Zt(e)}static parseSpecifier(e){if(e){const t=e.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);if(t)return new Zt(Zi(t[1],t[2]))}return null}constructor(e){super(),this.fixed=e}get type(){return"fixed"}get name(){return 0===this.fixed?"UTC":`UTC${Wi(this.fixed,"narrow")}`}get ianaName(){return 0===this.fixed?"Etc/UTC":`Etc/GMT${Wi(-this.fixed,"narrow")}`}offsetName(){return this.name}formatOffset(e,t){return Wi(this.fixed,t)}get isUniversal(){return!0}offset(){return this.fixed}equals(e){return"fixed"===e.type&&e.fixed===this.fixed}get isValid(){return!0}}class Bt extends _t{constructor(e){super(),this.zoneName=e}get type(){return"invalid"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(){return null}formatOffset(){return""}offset(){return NaN}equals(){return!1}get isValid(){return!1}}function qt(e,t){if($i(e)||null===e)return t;if(e instanceof _t)return e;if(function(e){return"string"==typeof e}(e)){const i=e.toLowerCase();return"default"===i?t:"local"===i||"system"===i?Dt.instance:"utc"===i||"gmt"===i?Zt.utcInstance:Zt.parseSpecifier(i)||At.create(e)}return Di(e)?Zt.instance(e):"object"==typeof e&&"offset"in e&&"function"==typeof e.offset?e:new Bt(e)}const Wt={arab:"[٠-٩]",arabext:"[۰-۹]",bali:"[᭐-᭙]",beng:"[০-৯]",deva:"[०-९]",fullwide:"[０-９]",gujr:"[૦-૯]",hanidec:"[〇|一|二|三|四|五|六|七|八|九]",khmr:"[០-៩]",knda:"[೦-೯]",laoo:"[໐-໙]",limb:"[᥆-᥏]",mlym:"[൦-൯]",mong:"[᠐-᠙]",mymr:"[၀-၉]",orya:"[୦-୯]",tamldec:"[௦-௯]",telu:"[౦-౯]",thai:"[๐-๙]",tibt:"[༠-༩]",latn:"\\d"},Yt={arab:[1632,1641],arabext:[1776,1785],bali:[6992,7001],beng:[2534,2543],deva:[2406,2415],fullwide:[65296,65303],gujr:[2790,2799],khmr:[6112,6121],knda:[3302,3311],laoo:[3792,3801],limb:[6470,6479],mlym:[3430,3439],mong:[6160,6169],mymr:[4160,4169],orya:[2918,2927],tamldec:[3046,3055],telu:[3174,3183],thai:[3664,3673],tibt:[3872,3881]},Jt=Wt.hanidec.replace(/[\[|\]]/g,"").split("");const Qt=new Map;function Kt({numberingSystem:e},t=""){const i=e||"latn";let r=Qt.get(i);void 0===r&&(r=new Map,Qt.set(i,r));let a=r.get(t);return void 0===a&&(a=new RegExp(`${Wt[i]}${t}`),r.set(t,a)),a}let Xt,ei=()=>Date.now(),ti="system",ii=null,ri=null,ai=null,ni=60,si=null;class oi{static get now(){return ei}static set now(e){ei=e}static set defaultZone(e){ti=e}static get defaultZone(){return qt(ti,Dt.instance)}static get defaultLocale(){return ii}static set defaultLocale(e){ii=e}static get defaultNumberingSystem(){return ri}static set defaultNumberingSystem(e){ri=e}static get defaultOutputCalendar(){return ai}static set defaultOutputCalendar(e){ai=e}static get defaultWeekSettings(){return si}static set defaultWeekSettings(e){si=Ti(e)}static get twoDigitCutoffYear(){return ni}static set twoDigitCutoffYear(e){ni=e%100}static get throwOnInvalid(){return Xt}static set throwOnInvalid(e){Xt=e}static resetCaches(){jt.resetCache(),At.resetCache(),nn.resetCache(),Qt.clear()}}class li{constructor(e,t){this.reason=e,this.explanation=t}toMessage(){return this.explanation?`${this.reason}: ${this.explanation}`:this.reason}}const ci=[0,31,59,90,120,151,181,212,243,273,304,334],di=[0,31,60,91,121,152,182,213,244,274,305,335];function pi(e,t){return new li("unit out of range",`you specified ${t} (of type ${typeof t}) as a ${e}, which is invalid`)}function hi(e,t,i){const r=new Date(Date.UTC(e,t-1,i));e<100&&e>=0&&r.setUTCFullYear(r.getUTCFullYear()-1900);const a=r.getUTCDay();return 0===a?7:a}function ui(e,t,i){return i+(Vi(e)?di:ci)[t-1]}function gi(e,t){const i=Vi(e)?di:ci,r=i.findIndex(e=>e<t);return{month:r+1,day:t-i[r]}}function mi(e,t){return(e-t+7)%7+1}function fi(e,t=4,i=1){const{year:r,month:a,day:n}=e,s=ui(r,a,n),o=mi(hi(r,a,n),i);let l,c=Math.floor((s-o+14-t)/7);return c<1?(l=r-1,c=Gi(l,t,i)):c>Gi(r,t,i)?(l=r+1,c=1):l=r,{weekYear:l,weekNumber:c,weekday:o,...Yi(e)}}function vi(e,t=4,i=1){const{weekYear:r,weekNumber:a,weekday:n}=e,s=mi(hi(r,1,t),i),o=zi(r);let l,c=7*a+n-s-7+t;c<1?(l=r-1,c+=zi(l)):c>o?(l=r+1,c-=zi(r)):l=r;const{month:d,day:p}=gi(l,c);return{year:l,month:d,day:p,...Yi(e)}}function yi(e){const{year:t,month:i,day:r}=e;return{year:t,ordinal:ui(t,i,r),...Yi(e)}}function bi(e){const{year:t,ordinal:i}=e,{month:r,day:a}=gi(t,i);return{year:t,month:r,day:a,...Yi(e)}}function wi(e,t){if(!$i(e.localWeekday)||!$i(e.localWeekNumber)||!$i(e.localWeekYear)){if(!$i(e.weekday)||!$i(e.weekNumber)||!$i(e.weekYear))throw new qe("Cannot mix locale-based week fields with ISO-based week fields");return $i(e.localWeekday)||(e.weekday=e.localWeekday),$i(e.localWeekNumber)||(e.weekNumber=e.localWeekNumber),$i(e.localWeekYear)||(e.weekYear=e.localWeekYear),delete e.localWeekday,delete e.localWeekNumber,delete e.localWeekYear,{minDaysInFirstWeek:t.getMinDaysInFirstWeek(),startOfWeek:t.getStartOfWeek()}}return{minDaysInFirstWeek:4,startOfWeek:1}}function xi(e){const t=Si(e.year),i=Ei(e.month,1,12),r=Ei(e.day,1,Hi(e.year,e.month));return t?i?!r&&pi("day",e.day):pi("month",e.month):pi("year",e.year)}function _i(e){const{hour:t,minute:i,second:r,millisecond:a}=e,n=Ei(t,0,23)||24===t&&0===i&&0===r&&0===a,s=Ei(i,0,59),o=Ei(r,0,59),l=Ei(a,0,999);return n?s?o?!l&&pi("millisecond",a):pi("second",r):pi("minute",i):pi("hour",t)}function $i(e){return void 0===e}function Di(e){return"number"==typeof e}function Si(e){return"number"==typeof e&&e%1==0}function Ci(){try{return"undefined"!=typeof Intl&&!!Intl.RelativeTimeFormat}catch(e){return!1}}function ki(){try{return"undefined"!=typeof Intl&&!!Intl.Locale&&("weekInfo"in Intl.Locale.prototype||"getWeekInfo"in Intl.Locale.prototype)}catch(e){return!1}}function Ai(e,t,i){if(0!==e.length)return e.reduce((e,r)=>{const a=[t(r),r];return e&&i(e[0],a[0])===e[0]?e:a},null)[1]}function Mi(e,t){return Object.prototype.hasOwnProperty.call(e,t)}function Ti(e){if(null==e)return null;if("object"!=typeof e)throw new Ye("Week settings must be an object");if(!Ei(e.firstDay,1,7)||!Ei(e.minimalDays,1,7)||!Array.isArray(e.weekend)||e.weekend.some(e=>!Ei(e,1,7)))throw new Ye("Invalid week settings");return{firstDay:e.firstDay,minimalDays:e.minimalDays,weekend:Array.from(e.weekend)}}function Ei(e,t,i){return Si(e)&&e>=t&&e<=i}function Li(e,t=2){let i;return i=e<0?"-"+(""+-e).padStart(t,"0"):(""+e).padStart(t,"0"),i}function Oi(e){return $i(e)||null===e||""===e?void 0:parseInt(e,10)}function Ii(e){return $i(e)||null===e||""===e?void 0:parseFloat(e)}function Ni(e){if(!$i(e)&&null!==e&&""!==e){const t=1e3*parseFloat("0."+e);return Math.floor(t)}}function Pi(e,t,i="round"){const r=10**t;switch(i){case"expand":return e>0?Math.ceil(e*r)/r:Math.floor(e*r)/r;case"trunc":return Math.trunc(e*r)/r;case"round":return Math.round(e*r)/r;case"floor":return Math.floor(e*r)/r;case"ceil":return Math.ceil(e*r)/r;default:throw new RangeError(`Value rounding ${i} is out of range`)}}function Vi(e){return e%4==0&&(e%100!=0||e%400==0)}function zi(e){return Vi(e)?366:365}function Hi(e,t){const i=function(e,t){return e-t*Math.floor(e/t)}(t-1,12)+1;return 2===i?Vi(e+(t-i)/12)?29:28:[31,null,31,30,31,30,31,31,30,31,30,31][i-1]}function Fi(e){let t=Date.UTC(e.year,e.month-1,e.day,e.hour,e.minute,e.second,e.millisecond);return e.year<100&&e.year>=0&&(t=new Date(t),t.setUTCFullYear(e.year,e.month-1,e.day)),+t}function Ri(e,t,i){return-mi(hi(e,1,t),i)+t-1}function Gi(e,t=4,i=1){const r=Ri(e,t,i),a=Ri(e+1,t,i);return(zi(e)-r+a)/7}function ji(e){return e>99?e:e>oi.twoDigitCutoffYear?1900+e:2e3+e}function Ui(e,t,i,r=null){const a=new Date(e),n={hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"};r&&(n.timeZone=r);const s={timeZoneName:t,...n},o=new Intl.DateTimeFormat(i,s).formatToParts(a).find(e=>"timezonename"===e.type.toLowerCase());return o?o.value:null}function Zi(e,t){let i=parseInt(e,10);Number.isNaN(i)&&(i=0);const r=parseInt(t,10)||0;return 60*i+(i<0||Object.is(i,-0)?-r:r)}function Bi(e){const t=Number(e);if("boolean"==typeof e||""===e||!Number.isFinite(t))throw new Ye(`Invalid unit value ${e}`);return t}function qi(e,t){const i={};for(const r in e)if(Mi(e,r)){const a=e[r];if(null==a)continue;i[t(r)]=Bi(a)}return i}function Wi(e,t){const i=Math.trunc(Math.abs(e/60)),r=Math.trunc(Math.abs(e%60)),a=e>=0?"+":"-";switch(t){case"short":return`${a}${Li(i,2)}:${Li(r,2)}`;case"narrow":return`${a}${i}${r>0?`:${r}`:""}`;case"techie":return`${a}${Li(i,2)}${Li(r,2)}`;default:throw new RangeError(`Value format ${t} is out of range for property format`)}}function Yi(e){return function(e,t){return t.reduce((t,i)=>(t[i]=e[i],t),{})}(e,["hour","minute","second","millisecond"])}const Ji=["January","February","March","April","May","June","July","August","September","October","November","December"],Qi=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],Ki=["J","F","M","A","M","J","J","A","S","O","N","D"];function Xi(e){switch(e){case"narrow":return[...Ki];case"short":return[...Qi];case"long":return[...Ji];case"numeric":return["1","2","3","4","5","6","7","8","9","10","11","12"];case"2-digit":return["01","02","03","04","05","06","07","08","09","10","11","12"];default:return null}}const er=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],tr=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],ir=["M","T","W","T","F","S","S"];function rr(e){switch(e){case"narrow":return[...ir];case"short":return[...tr];case"long":return[...er];case"numeric":return["1","2","3","4","5","6","7"];default:return null}}const ar=["AM","PM"],nr=["Before Christ","Anno Domini"],sr=["BC","AD"],or=["B","A"];function lr(e){switch(e){case"narrow":return[...or];case"short":return[...sr];case"long":return[...nr];default:return null}}function cr(e,t){let i="";for(const r of e)r.literal?i+=r.val:i+=t(r.val);return i}const dr={D:et,DD:tt,DDD:rt,DDDD:at,t:nt,tt:st,ttt:ot,tttt:lt,T:ct,TT:dt,TTT:pt,TTTT:ht,f:ut,ff:mt,fff:yt,ffff:wt,F:gt,FF:ft,FFF:bt,FFFF:xt};class pr{static create(e,t={}){return new pr(e,t)}static parseFormat(e){let t=null,i="",r=!1;const a=[];for(let n=0;n<e.length;n++){const s=e.charAt(n);"'"===s?((i.length>0||r)&&a.push({literal:r||/^\s+$/.test(i),val:""===i?"'":i}),t=null,i="",r=!r):r||s===t?i+=s:(i.length>0&&a.push({literal:/^\s+$/.test(i),val:i}),i=s,t=s)}return i.length>0&&a.push({literal:r||/^\s+$/.test(i),val:i}),a}static macroTokenToFormatOpts(e){return dr[e]}constructor(e,t){this.opts=t,this.loc=e,this.systemLoc=null}formatWithSystemDefault(e,t){null===this.systemLoc&&(this.systemLoc=this.loc.redefaultToSystem());return this.systemLoc.dtFormatter(e,{...this.opts,...t}).format()}dtFormatter(e,t={}){return this.loc.dtFormatter(e,{...this.opts,...t})}formatDateTime(e,t){return this.dtFormatter(e,t).format()}formatDateTimeParts(e,t){return this.dtFormatter(e,t).formatToParts()}formatInterval(e,t){return this.dtFormatter(e.start,t).dtf.formatRange(e.start.toJSDate(),e.end.toJSDate())}resolvedOptions(e,t){return this.dtFormatter(e,t).resolvedOptions()}num(e,t=0,i=void 0){if(this.opts.forceSimple)return Li(e,t);const r={...this.opts};return t>0&&(r.padTo=t),i&&(r.signDisplay=i),this.loc.numberFormatter(r).format(e)}formatDateTimeFromString(e,t){const i="en"===this.loc.listingMode(),r=this.loc.outputCalendar&&"gregory"!==this.loc.outputCalendar,a=(t,i)=>this.loc.extract(e,t,i),n=t=>e.isOffsetFixed&&0===e.offset&&t.allowZ?"Z":e.isValid?e.zone.formatOffset(e.ts,t.format):"",s=()=>i?function(e){return ar[e.hour<12?0:1]}(e):a({hour:"numeric",hourCycle:"h12"},"dayperiod"),o=(t,r)=>i?function(e,t){return Xi(t)[e.month-1]}(e,t):a(r?{month:t}:{month:t,day:"numeric"},"month"),l=(t,r)=>i?function(e,t){return rr(t)[e.weekday-1]}(e,t):a(r?{weekday:t}:{weekday:t,month:"long",day:"numeric"},"weekday"),c=t=>{const i=pr.macroTokenToFormatOpts(t);return i?this.formatWithSystemDefault(e,i):t},d=t=>i?function(e,t){return lr(t)[e.year<0?0:1]}(e,t):a({era:t},"era");return cr(pr.parseFormat(t),t=>{switch(t){case"S":return this.num(e.millisecond);case"u":case"SSS":return this.num(e.millisecond,3);case"s":return this.num(e.second);case"ss":return this.num(e.second,2);case"uu":return this.num(Math.floor(e.millisecond/10),2);case"uuu":return this.num(Math.floor(e.millisecond/100));case"m":return this.num(e.minute);case"mm":return this.num(e.minute,2);case"h":return this.num(e.hour%12==0?12:e.hour%12);case"hh":return this.num(e.hour%12==0?12:e.hour%12,2);case"H":return this.num(e.hour);case"HH":return this.num(e.hour,2);case"Z":return n({format:"narrow",allowZ:this.opts.allowZ});case"ZZ":return n({format:"short",allowZ:this.opts.allowZ});case"ZZZ":return n({format:"techie",allowZ:this.opts.allowZ});case"ZZZZ":return e.zone.offsetName(e.ts,{format:"short",locale:this.loc.locale});case"ZZZZZ":return e.zone.offsetName(e.ts,{format:"long",locale:this.loc.locale});case"z":return e.zoneName;case"a":return s();case"d":return r?a({day:"numeric"},"day"):this.num(e.day);case"dd":return r?a({day:"2-digit"},"day"):this.num(e.day,2);case"c":case"E":return this.num(e.weekday);case"ccc":return l("short",!0);case"cccc":return l("long",!0);case"ccccc":return l("narrow",!0);case"EEE":return l("short",!1);case"EEEE":return l("long",!1);case"EEEEE":return l("narrow",!1);case"L":return r?a({month:"numeric",day:"numeric"},"month"):this.num(e.month);case"LL":return r?a({month:"2-digit",day:"numeric"},"month"):this.num(e.month,2);case"LLL":return o("short",!0);case"LLLL":return o("long",!0);case"LLLLL":return o("narrow",!0);case"M":return r?a({month:"numeric"},"month"):this.num(e.month);case"MM":return r?a({month:"2-digit"},"month"):this.num(e.month,2);case"MMM":return o("short",!1);case"MMMM":return o("long",!1);case"MMMMM":return o("narrow",!1);case"y":return r?a({year:"numeric"},"year"):this.num(e.year);case"yy":return r?a({year:"2-digit"},"year"):this.num(e.year.toString().slice(-2),2);case"yyyy":return r?a({year:"numeric"},"year"):this.num(e.year,4);case"yyyyyy":return r?a({year:"numeric"},"year"):this.num(e.year,6);case"G":return d("short");case"GG":return d("long");case"GGGGG":return d("narrow");case"kk":return this.num(e.weekYear.toString().slice(-2),2);case"kkkk":return this.num(e.weekYear,4);case"W":return this.num(e.weekNumber);case"WW":return this.num(e.weekNumber,2);case"n":return this.num(e.localWeekNumber);case"nn":return this.num(e.localWeekNumber,2);case"ii":return this.num(e.localWeekYear.toString().slice(-2),2);case"iiii":return this.num(e.localWeekYear,4);case"o":return this.num(e.ordinal);case"ooo":return this.num(e.ordinal,3);case"q":return this.num(e.quarter);case"qq":return this.num(e.quarter,2);case"X":return this.num(Math.floor(e.ts/1e3));case"x":return this.num(e.ts);default:return c(t)}})}formatDurationFromString(e,t){const i="negativeLargestOnly"===this.opts.signMode?-1:1,r=e=>{switch(e[0]){case"S":return"milliseconds";case"s":return"seconds";case"m":return"minutes";case"h":return"hours";case"d":return"days";case"w":return"weeks";case"M":return"months";case"y":return"years";default:return null}},a=pr.parseFormat(t),n=a.reduce((e,{literal:t,val:i})=>t?e:e.concat(i),[]),s=e.shiftTo(...n.map(r).filter(e=>e));return cr(a,((e,t)=>a=>{const n=r(a);if(n){const r=t.isNegativeDuration&&n!==t.largestUnit?i:1;let s;return s="negativeLargestOnly"===this.opts.signMode&&n!==t.largestUnit?"never":"all"===this.opts.signMode?"always":"auto",this.num(e.get(n)*r,a.length,s)}return a})(s,{isNegativeDuration:s<0,largestUnit:Object.keys(s.values)[0]}))}}const hr=/[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;function ur(...e){const t=e.reduce((e,t)=>e+t.source,"");return RegExp(`^${t}$`)}function gr(...e){return t=>e.reduce(([e,i,r],a)=>{const[n,s,o]=a(t,r);return[{...e,...n},s||i,o]},[{},null,1]).slice(0,2)}function mr(e,...t){if(null==e)return[null,null];for(const[i,r]of t){const t=i.exec(e);if(t)return r(t)}return[null,null]}function fr(...e){return(t,i)=>{const r={};let a;for(a=0;a<e.length;a++)r[e[a]]=Oi(t[i+a]);return[r,null,i+a]}}const vr=/(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/,yr=/(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/,br=RegExp(`${yr.source}${`(?:${vr.source}?(?:\\[(${hr.source})\\])?)?`}`),wr=RegExp(`(?:[Tt]${br.source})?`),xr=fr("weekYear","weekNumber","weekDay"),_r=fr("year","ordinal"),$r=RegExp(`${yr.source} ?(?:${vr.source}|(${hr.source}))?`),Dr=RegExp(`(?: ${$r.source})?`);function Sr(e,t,i){const r=e[t];return $i(r)?i:Oi(r)}function Cr(e,t){return[{hours:Sr(e,t,0),minutes:Sr(e,t+1,0),seconds:Sr(e,t+2,0),milliseconds:Ni(e[t+3])},null,t+4]}function kr(e,t){const i=!e[t]&&!e[t+1],r=Zi(e[t+1],e[t+2]);return[{},i?null:Zt.instance(r),t+3]}function Ar(e,t){return[{},e[t]?At.create(e[t]):null,t+1]}const Mr=RegExp(`^T?${yr.source}$`),Tr=/^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;function Er(e){const[t,i,r,a,n,s,o,l,c]=e,d="-"===t[0],p=l&&"-"===l[0],h=(e,t=!1)=>void 0!==e&&(t||e&&d)?-e:e;return[{years:h(Ii(i)),months:h(Ii(r)),weeks:h(Ii(a)),days:h(Ii(n)),hours:h(Ii(s)),minutes:h(Ii(o)),seconds:h(Ii(l),"-0"===l),milliseconds:h(Ni(c),p)}]}const Lr={GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function Or(e,t,i,r,a,n,s){const o={year:2===t.length?ji(Oi(t)):Oi(t),month:Qi.indexOf(i)+1,day:Oi(r),hour:Oi(a),minute:Oi(n)};return s&&(o.second=Oi(s)),e&&(o.weekday=e.length>3?er.indexOf(e)+1:tr.indexOf(e)+1),o}const Ir=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;function Nr(e){const[,t,i,r,a,n,s,o,l,c,d,p]=e,h=Or(t,a,r,i,n,s,o);let u;return u=l?Lr[l]:c?0:Zi(d,p),[h,new Zt(u)]}const Pr=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,Vr=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,zr=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;function Hr(e){const[,t,i,r,a,n,s,o]=e;return[Or(t,a,r,i,n,s,o),Zt.utcInstance]}function Fr(e){const[,t,i,r,a,n,s,o]=e;return[Or(t,o,i,r,a,n,s),Zt.utcInstance]}const Rr=ur(/([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,wr),Gr=ur(/(\d{4})-?W(\d\d)(?:-?(\d))?/,wr),jr=ur(/(\d{4})-?(\d{3})/,wr),Ur=ur(br),Zr=gr(function(e,t){return[{year:Sr(e,t),month:Sr(e,t+1,1),day:Sr(e,t+2,1)},null,t+3]},Cr,kr,Ar),Br=gr(xr,Cr,kr,Ar),qr=gr(_r,Cr,kr,Ar),Wr=gr(Cr,kr,Ar);const Yr=gr(Cr);const Jr=ur(/(\d{4})-(\d\d)-(\d\d)/,Dr),Qr=ur($r),Kr=gr(Cr,kr,Ar);const Xr="Invalid Duration",ea={weeks:{days:7,hours:168,minutes:10080,seconds:604800,milliseconds:6048e5},days:{hours:24,minutes:1440,seconds:86400,milliseconds:864e5},hours:{minutes:60,seconds:3600,milliseconds:36e5},minutes:{seconds:60,milliseconds:6e4},seconds:{milliseconds:1e3}},ta={years:{quarters:4,months:12,weeks:52,days:365,hours:8760,minutes:525600,seconds:31536e3,milliseconds:31536e6},quarters:{months:3,weeks:13,days:91,hours:2184,minutes:131040,seconds:7862400,milliseconds:78624e5},months:{weeks:4,days:30,hours:720,minutes:43200,seconds:2592e3,milliseconds:2592e6},...ea},ia=365.2425,ra=30.436875,aa={years:{quarters:4,months:12,weeks:52.1775,days:ia,hours:8765.82,minutes:525949.2,seconds:525949.2*60,milliseconds:525949.2*60*1e3},quarters:{months:3,weeks:13.044375,days:91.310625,hours:2191.455,minutes:131487.3,seconds:525949.2*60/4,milliseconds:7889237999.999999},months:{weeks:4.3481250000000005,days:ra,hours:730.485,minutes:43829.1,seconds:2629746,milliseconds:2629746e3},...ea},na=["years","quarters","months","weeks","days","hours","minutes","seconds","milliseconds"],sa=na.slice(0).reverse();function oa(e,t,i=!1){const r={values:i?t.values:{...e.values,...t.values||{}},loc:e.loc.clone(t.loc),conversionAccuracy:t.conversionAccuracy||e.conversionAccuracy,matrix:t.matrix||e.matrix};return new pa(r)}function la(e,t){let i=t.milliseconds??0;for(const r of sa.slice(1))t[r]&&(i+=t[r]*e[r].milliseconds);return i}function ca(e,t){const i=la(e,t)<0?-1:1;na.reduceRight((r,a)=>{if($i(t[a]))return r;if(r){const n=t[r]*i,s=e[a][r],o=Math.floor(n/s);t[a]+=o*i,t[r]-=o*s*i}return a},null),na.reduce((i,r)=>{if($i(t[r]))return i;if(i){const a=t[i]%1;t[i]-=a,t[r]+=a*e[i][r]}return r},null)}function da(e){const t={};for(const[i,r]of Object.entries(e))0!==r&&(t[i]=r);return t}class pa{constructor(e){const t="longterm"===e.conversionAccuracy||!1;let i=t?aa:ta;e.matrix&&(i=e.matrix),this.values=e.values,this.loc=e.loc||jt.create(),this.conversionAccuracy=t?"longterm":"casual",this.invalid=e.invalid||null,this.matrix=i,this.isLuxonDuration=!0}static fromMillis(e,t){return pa.fromObject({milliseconds:e},t)}static fromObject(e,t={}){if(null==e||"object"!=typeof e)throw new Ye("Duration.fromObject: argument expected to be an object, got "+(null===e?"null":typeof e));return new pa({values:qi(e,pa.normalizeUnit),loc:jt.fromObject(t),conversionAccuracy:t.conversionAccuracy,matrix:t.matrix})}static fromDurationLike(e){if(Di(e))return pa.fromMillis(e);if(pa.isDuration(e))return e;if("object"==typeof e)return pa.fromObject(e);throw new Ye(`Unknown duration argument ${e} of type ${typeof e}`)}static fromISO(e,t){const[i]=function(e){return mr(e,[Tr,Er])}(e);return i?pa.fromObject(i,t):pa.invalid("unparsable",`the input "${e}" can't be parsed as ISO 8601`)}static fromISOTime(e,t){const[i]=function(e){return mr(e,[Mr,Yr])}(e);return i?pa.fromObject(i,t):pa.invalid("unparsable",`the input "${e}" can't be parsed as ISO 8601`)}static invalid(e,t=null){if(!e)throw new Ye("need to specify a reason the Duration is invalid");const i=e instanceof li?e:new li(e,t);if(oi.throwOnInvalid)throw new Be(i);return new pa({invalid:i})}static normalizeUnit(e){const t={year:"years",years:"years",quarter:"quarters",quarters:"quarters",month:"months",months:"months",week:"weeks",weeks:"weeks",day:"days",days:"days",hour:"hours",hours:"hours",minute:"minutes",minutes:"minutes",second:"seconds",seconds:"seconds",millisecond:"milliseconds",milliseconds:"milliseconds"}[e?e.toLowerCase():e];if(!t)throw new We(e);return t}static isDuration(e){return e&&e.isLuxonDuration||!1}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}toFormat(e,t={}){const i={...t,floor:!1!==t.round&&!1!==t.floor};return this.isValid?pr.create(this.loc,i).formatDurationFromString(this,e):Xr}toHuman(e={}){if(!this.isValid)return Xr;const t=!1!==e.showZeros,i=na.map(i=>{const r=this.values[i];return $i(r)||0===r&&!t?null:this.loc.numberFormatter({style:"unit",unitDisplay:"long",...e,unit:i.slice(0,-1)}).format(r)}).filter(e=>e);return this.loc.listFormatter({type:"conjunction",style:e.listStyle||"narrow",...e}).format(i)}toObject(){return this.isValid?{...this.values}:{}}toISO(){if(!this.isValid)return null;let e="P";return 0!==this.years&&(e+=this.years+"Y"),0===this.months&&0===this.quarters||(e+=this.months+3*this.quarters+"M"),0!==this.weeks&&(e+=this.weeks+"W"),0!==this.days&&(e+=this.days+"D"),0===this.hours&&0===this.minutes&&0===this.seconds&&0===this.milliseconds||(e+="T"),0!==this.hours&&(e+=this.hours+"H"),0!==this.minutes&&(e+=this.minutes+"M"),0===this.seconds&&0===this.milliseconds||(e+=Pi(this.seconds+this.milliseconds/1e3,3)+"S"),"P"===e&&(e+="T0S"),e}toISOTime(e={}){if(!this.isValid)return null;const t=this.toMillis();if(t<0||t>=864e5)return null;e={suppressMilliseconds:!1,suppressSeconds:!1,includePrefix:!1,format:"extended",...e,includeOffset:!1};return nn.fromMillis(t,{zone:"UTC"}).toISOTime(e)}toJSON(){return this.toISO()}toString(){return this.toISO()}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Duration { values: ${JSON.stringify(this.values)} }`:`Duration { Invalid, reason: ${this.invalidReason} }`}toMillis(){return this.isValid?la(this.matrix,this.values):NaN}valueOf(){return this.toMillis()}plus(e){if(!this.isValid)return this;const t=pa.fromDurationLike(e),i={};for(const e of na)(Mi(t.values,e)||Mi(this.values,e))&&(i[e]=t.get(e)+this.get(e));return oa(this,{values:i},!0)}minus(e){if(!this.isValid)return this;const t=pa.fromDurationLike(e);return this.plus(t.negate())}mapUnits(e){if(!this.isValid)return this;const t={};for(const i of Object.keys(this.values))t[i]=Bi(e(this.values[i],i));return oa(this,{values:t},!0)}get(e){return this[pa.normalizeUnit(e)]}set(e){if(!this.isValid)return this;return oa(this,{values:{...this.values,...qi(e,pa.normalizeUnit)}})}reconfigure({locale:e,numberingSystem:t,conversionAccuracy:i,matrix:r}={}){return oa(this,{loc:this.loc.clone({locale:e,numberingSystem:t}),matrix:r,conversionAccuracy:i})}as(e){return this.isValid?this.shiftTo(e).get(e):NaN}normalize(){if(!this.isValid)return this;const e=this.toObject();return ca(this.matrix,e),oa(this,{values:e},!0)}rescale(){if(!this.isValid)return this;return oa(this,{values:da(this.normalize().shiftToAll().toObject())},!0)}shiftTo(...e){if(!this.isValid)return this;if(0===e.length)return this;e=e.map(e=>pa.normalizeUnit(e));const t={},i={},r=this.toObject();let a;for(const n of na)if(e.indexOf(n)>=0){a=n;let e=0;for(const t in i)e+=this.matrix[t][n]*i[t],i[t]=0;Di(r[n])&&(e+=r[n]);const s=Math.trunc(e);t[n]=s,i[n]=(1e3*e-1e3*s)/1e3}else Di(r[n])&&(i[n]=r[n]);for(const e in i)0!==i[e]&&(t[a]+=e===a?i[e]:i[e]/this.matrix[a][e]);return ca(this.matrix,t),oa(this,{values:t},!0)}shiftToAll(){return this.isValid?this.shiftTo("years","months","weeks","days","hours","minutes","seconds","milliseconds"):this}negate(){if(!this.isValid)return this;const e={};for(const t of Object.keys(this.values))e[t]=0===this.values[t]?0:-this.values[t];return oa(this,{values:e},!0)}removeZeros(){if(!this.isValid)return this;return oa(this,{values:da(this.values)},!0)}get years(){return this.isValid?this.values.years||0:NaN}get quarters(){return this.isValid?this.values.quarters||0:NaN}get months(){return this.isValid?this.values.months||0:NaN}get weeks(){return this.isValid?this.values.weeks||0:NaN}get days(){return this.isValid?this.values.days||0:NaN}get hours(){return this.isValid?this.values.hours||0:NaN}get minutes(){return this.isValid?this.values.minutes||0:NaN}get seconds(){return this.isValid?this.values.seconds||0:NaN}get milliseconds(){return this.isValid?this.values.milliseconds||0:NaN}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}equals(e){if(!this.isValid||!e.isValid)return!1;if(!this.loc.equals(e.loc))return!1;function t(e,t){return void 0===e||0===e?void 0===t||0===t:e===t}for(const i of na)if(!t(this.values[i],e.values[i]))return!1;return!0}}const ha="Invalid Interval";class ua{constructor(e){this.s=e.start,this.e=e.end,this.invalid=e.invalid||null,this.isLuxonInterval=!0}static invalid(e,t=null){if(!e)throw new Ye("need to specify a reason the Interval is invalid");const i=e instanceof li?e:new li(e,t);if(oi.throwOnInvalid)throw new Ze(i);return new ua({invalid:i})}static fromDateTimes(e,t){const i=sn(e),r=sn(t),a=function(e,t){return e&&e.isValid?t&&t.isValid?t<e?ua.invalid("end before start",`The end of an interval must be after its start, but you had start=${e.toISO()} and end=${t.toISO()}`):null:ua.invalid("missing or invalid end"):ua.invalid("missing or invalid start")}(i,r);return null==a?new ua({start:i,end:r}):a}static after(e,t){const i=pa.fromDurationLike(t),r=sn(e);return ua.fromDateTimes(r,r.plus(i))}static before(e,t){const i=pa.fromDurationLike(t),r=sn(e);return ua.fromDateTimes(r.minus(i),r)}static fromISO(e,t){const[i,r]=(e||"").split("/",2);if(i&&r){let e,a,n,s;try{e=nn.fromISO(i,t),a=e.isValid}catch(r){a=!1}try{n=nn.fromISO(r,t),s=n.isValid}catch(r){s=!1}if(a&&s)return ua.fromDateTimes(e,n);if(a){const i=pa.fromISO(r,t);if(i.isValid)return ua.after(e,i)}else if(s){const e=pa.fromISO(i,t);if(e.isValid)return ua.before(n,e)}}return ua.invalid("unparsable",`the input "${e}" can't be parsed as ISO 8601`)}static isInterval(e){return e&&e.isLuxonInterval||!1}get start(){return this.isValid?this.s:null}get end(){return this.isValid?this.e:null}get lastDateTime(){return this.isValid&&this.e?this.e.minus(1):null}get isValid(){return null===this.invalidReason}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}length(e="milliseconds"){return this.isValid?this.toDuration(e).get(e):NaN}count(e="milliseconds",t){if(!this.isValid)return NaN;const i=this.start.startOf(e,t);let r;return r=t?.useLocaleWeeks?this.end.reconfigure({locale:i.locale}):this.end,r=r.startOf(e,t),Math.floor(r.diff(i,e).get(e))+(r.valueOf()!==this.end.valueOf())}hasSame(e){return!!this.isValid&&(this.isEmpty()||this.e.minus(1).hasSame(this.s,e))}isEmpty(){return this.s.valueOf()===this.e.valueOf()}isAfter(e){return!!this.isValid&&this.s>e}isBefore(e){return!!this.isValid&&this.e<=e}contains(e){return!!this.isValid&&(this.s<=e&&this.e>e)}set({start:e,end:t}={}){return this.isValid?ua.fromDateTimes(e||this.s,t||this.e):this}splitAt(...e){if(!this.isValid)return[];const t=e.map(sn).filter(e=>this.contains(e)).sort((e,t)=>e.toMillis()-t.toMillis()),i=[];let{s:r}=this,a=0;for(;r<this.e;){const e=t[a]||this.e,n=+e>+this.e?this.e:e;i.push(ua.fromDateTimes(r,n)),r=n,a+=1}return i}splitBy(e){const t=pa.fromDurationLike(e);if(!this.isValid||!t.isValid||0===t.as("milliseconds"))return[];let i,{s:r}=this,a=1;const n=[];for(;r<this.e;){const e=this.start.plus(t.mapUnits(e=>e*a));i=+e>+this.e?this.e:e,n.push(ua.fromDateTimes(r,i)),r=i,a+=1}return n}divideEqually(e){return this.isValid?this.splitBy(this.length()/e).slice(0,e):[]}overlaps(e){return this.e>e.s&&this.s<e.e}abutsStart(e){return!!this.isValid&&+this.e===+e.s}abutsEnd(e){return!!this.isValid&&+e.e===+this.s}engulfs(e){return!!this.isValid&&(this.s<=e.s&&this.e>=e.e)}equals(e){return!(!this.isValid||!e.isValid)&&(this.s.equals(e.s)&&this.e.equals(e.e))}intersection(e){if(!this.isValid)return this;const t=this.s>e.s?this.s:e.s,i=this.e<e.e?this.e:e.e;return t>=i?null:ua.fromDateTimes(t,i)}union(e){if(!this.isValid)return this;const t=this.s<e.s?this.s:e.s,i=this.e>e.e?this.e:e.e;return ua.fromDateTimes(t,i)}static merge(e){const[t,i]=e.sort((e,t)=>e.s-t.s).reduce(([e,t],i)=>t?t.overlaps(i)||t.abutsStart(i)?[e,t.union(i)]:[e.concat([t]),i]:[e,i],[[],null]);return i&&t.push(i),t}static xor(e){let t=null,i=0;const r=[],a=e.map(e=>[{time:e.s,type:"s"},{time:e.e,type:"e"}]),n=Array.prototype.concat(...a).sort((e,t)=>e.time-t.time);for(const e of n)i+="s"===e.type?1:-1,1===i?t=e.time:(t&&+t!==+e.time&&r.push(ua.fromDateTimes(t,e.time)),t=null);return ua.merge(r)}difference(...e){return ua.xor([this].concat(e)).map(e=>this.intersection(e)).filter(e=>e&&!e.isEmpty())}toString(){return this.isValid?`[${this.s.toISO()} – ${this.e.toISO()})`:ha}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`:`Interval { Invalid, reason: ${this.invalidReason} }`}toLocaleString(e=et,t={}){return this.isValid?pr.create(this.s.loc.clone(t),e).formatInterval(this):ha}toISO(e){return this.isValid?`${this.s.toISO(e)}/${this.e.toISO(e)}`:ha}toISODate(){return this.isValid?`${this.s.toISODate()}/${this.e.toISODate()}`:ha}toISOTime(e){return this.isValid?`${this.s.toISOTime(e)}/${this.e.toISOTime(e)}`:ha}toFormat(e,{separator:t=" – "}={}){return this.isValid?`${this.s.toFormat(e)}${t}${this.e.toFormat(e)}`:ha}toDuration(e,t){return this.isValid?this.e.diff(this.s,e,t):pa.invalid(this.invalidReason)}mapEndpoints(e){return ua.fromDateTimes(e(this.s),e(this.e))}}class ga{static hasDST(e=oi.defaultZone){const t=nn.now().setZone(e).set({month:12});return!e.isUniversal&&t.offset!==t.set({month:6}).offset}static isValidIANAZone(e){return At.isValidZone(e)}static normalizeZone(e){return qt(e,oi.defaultZone)}static getStartOfWeek({locale:e=null,locObj:t=null}={}){return(t||jt.create(e)).getStartOfWeek()}static getMinimumDaysInFirstWeek({locale:e=null,locObj:t=null}={}){return(t||jt.create(e)).getMinDaysInFirstWeek()}static getWeekendWeekdays({locale:e=null,locObj:t=null}={}){return(t||jt.create(e)).getWeekendDays().slice()}static months(e="long",{locale:t=null,numberingSystem:i=null,locObj:r=null,outputCalendar:a="gregory"}={}){return(r||jt.create(t,i,a)).months(e)}static monthsFormat(e="long",{locale:t=null,numberingSystem:i=null,locObj:r=null,outputCalendar:a="gregory"}={}){return(r||jt.create(t,i,a)).months(e,!0)}static weekdays(e="long",{locale:t=null,numberingSystem:i=null,locObj:r=null}={}){return(r||jt.create(t,i,null)).weekdays(e)}static weekdaysFormat(e="long",{locale:t=null,numberingSystem:i=null,locObj:r=null}={}){return(r||jt.create(t,i,null)).weekdays(e,!0)}static meridiems({locale:e=null}={}){return jt.create(e).meridiems()}static eras(e="short",{locale:t=null}={}){return jt.create(t,null,"gregory").eras(e)}static features(){return{relative:Ci(),localeWeek:ki()}}}function ma(e,t){const i=e=>e.toUTC(0,{keepLocalTime:!0}).startOf("day").valueOf(),r=i(t)-i(e);return Math.floor(pa.fromMillis(r).as("days"))}function fa(e,t,i,r){let[a,n,s,o]=function(e,t,i){const r=[["years",(e,t)=>t.year-e.year],["quarters",(e,t)=>t.quarter-e.quarter+4*(t.year-e.year)],["months",(e,t)=>t.month-e.month+12*(t.year-e.year)],["weeks",(e,t)=>{const i=ma(e,t);return(i-i%7)/7}],["days",ma]],a={},n=e;let s,o;for(const[l,c]of r)i.indexOf(l)>=0&&(s=l,a[l]=c(e,t),o=n.plus(a),o>t?(a[l]--,(e=n.plus(a))>t&&(o=e,a[l]--,e=n.plus(a))):e=o);return[e,a,o,s]}(e,t,i);const l=t-a,c=i.filter(e=>["hours","minutes","seconds","milliseconds"].indexOf(e)>=0);0===c.length&&(s<t&&(s=a.plus({[o]:1})),s!==a&&(n[o]=(n[o]||0)+l/(s-a)));const d=pa.fromObject(n,r);return c.length>0?pa.fromMillis(l,r).shiftTo(...c).plus(d):d}function va(e,t=e=>e){return{regex:e,deser:([e])=>t(function(e){let t=parseInt(e,10);if(isNaN(t)){t="";for(let i=0;i<e.length;i++){const r=e.charCodeAt(i);if(-1!==e[i].search(Wt.hanidec))t+=Jt.indexOf(e[i]);else for(const e in Yt){const[i,a]=Yt[e];r>=i&&r<=a&&(t+=r-i)}}return parseInt(t,10)}return t}(e))}}const ya=`[ ${String.fromCharCode(160)}]`,ba=new RegExp(ya,"g");function wa(e){return e.replace(/\./g,"\\.?").replace(ba,ya)}function xa(e){return e.replace(/\./g,"").replace(ba," ").toLowerCase()}function _a(e,t){return null===e?null:{regex:RegExp(e.map(wa).join("|")),deser:([i])=>e.findIndex(e=>xa(i)===xa(e))+t}}function $a(e,t){return{regex:e,deser:([,e,t])=>Zi(e,t),groups:t}}function Da(e){return{regex:e,deser:([e])=>e}}const Sa={year:{"2-digit":"yy",numeric:"yyyyy"},month:{numeric:"M","2-digit":"MM",short:"MMM",long:"MMMM"},day:{numeric:"d","2-digit":"dd"},weekday:{short:"EEE",long:"EEEE"},dayperiod:"a",dayPeriod:"a",hour12:{numeric:"h","2-digit":"hh"},hour24:{numeric:"H","2-digit":"HH"},minute:{numeric:"m","2-digit":"mm"},second:{numeric:"s","2-digit":"ss"},timeZoneName:{long:"ZZZZZ",short:"ZZZ"}};let Ca=null;function ka(e,t){return Array.prototype.concat(...e.map(e=>function(e,t){if(e.literal)return e;const i=Ta(pr.macroTokenToFormatOpts(e.val),t);return null==i||i.includes(void 0)?e:i}(e,t)))}class Aa{constructor(e,t){if(this.locale=e,this.format=t,this.tokens=ka(pr.parseFormat(t),e),this.units=this.tokens.map(t=>function(e,t){const i=Kt(t),r=Kt(t,"{2}"),a=Kt(t,"{3}"),n=Kt(t,"{4}"),s=Kt(t,"{6}"),o=Kt(t,"{1,2}"),l=Kt(t,"{1,3}"),c=Kt(t,"{1,6}"),d=Kt(t,"{1,9}"),p=Kt(t,"{2,4}"),h=Kt(t,"{4,6}"),u=e=>{return{regex:RegExp((t=e.val,t.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"))),deser:([e])=>e,literal:!0};var t},g=(g=>{if(e.literal)return u(g);switch(g.val){case"G":return _a(t.eras("short"),0);case"GG":return _a(t.eras("long"),0);case"y":return va(c);case"yy":case"kk":return va(p,ji);case"yyyy":case"kkkk":return va(n);case"yyyyy":return va(h);case"yyyyyy":return va(s);case"M":case"L":case"d":case"H":case"h":case"m":case"q":case"s":case"W":return va(o);case"MM":case"LL":case"dd":case"HH":case"hh":case"mm":case"qq":case"ss":case"WW":return va(r);case"MMM":return _a(t.months("short",!0),1);case"MMMM":return _a(t.months("long",!0),1);case"LLL":return _a(t.months("short",!1),1);case"LLLL":return _a(t.months("long",!1),1);case"o":case"S":return va(l);case"ooo":case"SSS":return va(a);case"u":return Da(d);case"uu":return Da(o);case"uuu":case"E":case"c":return va(i);case"a":return _a(t.meridiems(),0);case"EEE":return _a(t.weekdays("short",!1),1);case"EEEE":return _a(t.weekdays("long",!1),1);case"ccc":return _a(t.weekdays("short",!0),1);case"cccc":return _a(t.weekdays("long",!0),1);case"Z":case"ZZ":return $a(new RegExp(`([+-]${o.source})(?::(${r.source}))?`),2);case"ZZZ":return $a(new RegExp(`([+-]${o.source})(${r.source})?`),2);case"z":return Da(/[a-z_+-/]{1,256}?/i);case" ":return Da(/[^\S\n\r]/);default:return u(g)}})(e)||{invalidReason:"missing Intl.DateTimeFormat.formatToParts support"};return g.token=e,g}(t,e)),this.disqualifyingUnit=this.units.find(e=>e.invalidReason),!this.disqualifyingUnit){const[e,t]=function(e){const t=e.map(e=>e.regex).reduce((e,t)=>`${e}(${t.source})`,"");return[`^${t}$`,e]}(this.units);this.regex=RegExp(e,"i"),this.handlers=t}}explainFromTokens(e){if(this.isValid){const[t,i]=function(e,t,i){const r=e.match(t);if(r){const e={};let t=1;for(const a in i)if(Mi(i,a)){const n=i[a],s=n.groups?n.groups+1:1;!n.literal&&n.token&&(e[n.token.val[0]]=n.deser(r.slice(t,t+s))),t+=s}return[r,e]}return[r,{}]}(e,this.regex,this.handlers),[r,a,n]=i?function(e){let t,i=null;$i(e.z)||(i=At.create(e.z)),$i(e.Z)||(i||(i=new Zt(e.Z)),t=e.Z),$i(e.q)||(e.M=3*(e.q-1)+1),$i(e.h)||(e.h<12&&1===e.a?e.h+=12:12===e.h&&0===e.a&&(e.h=0)),0===e.G&&e.y&&(e.y=-e.y),$i(e.u)||(e.S=Ni(e.u));const r=Object.keys(e).reduce((t,i)=>{const r=(e=>{switch(e){case"S":return"millisecond";case"s":return"second";case"m":return"minute";case"h":case"H":return"hour";case"d":return"day";case"o":return"ordinal";case"L":case"M":return"month";case"y":return"year";case"E":case"c":return"weekday";case"W":return"weekNumber";case"k":return"weekYear";case"q":return"quarter";default:return null}})(i);return r&&(t[r]=e[i]),t},{});return[r,i,t]}(i):[null,null,void 0];if(Mi(i,"a")&&Mi(i,"H"))throw new qe("Can't include meridiem when specifying 24-hour format");return{input:e,tokens:this.tokens,regex:this.regex,rawMatches:t,matches:i,result:r,zone:a,specificOffset:n}}return{input:e,tokens:this.tokens,invalidReason:this.invalidReason}}get isValid(){return!this.disqualifyingUnit}get invalidReason(){return this.disqualifyingUnit?this.disqualifyingUnit.invalidReason:null}}function Ma(e,t,i){return new Aa(e,i).explainFromTokens(t)}function Ta(e,t){if(!e)return null;const i=pr.create(t,e).dtFormatter((Ca||(Ca=nn.fromMillis(1555555555555)),Ca)),r=i.formatToParts(),a=i.resolvedOptions();return r.map(t=>function(e,t,i){const{type:r,value:a}=e;if("literal"===r){const e=/^\s+$/.test(a);return{literal:!e,val:e?" ":a}}const n=t[r];let s=r;"hour"===r&&(s=null!=t.hour12?t.hour12?"hour12":"hour24":null!=t.hourCycle?"h11"===t.hourCycle||"h12"===t.hourCycle?"hour12":"hour24":i.hour12?"hour12":"hour24");let o=Sa[s];if("object"==typeof o&&(o=o[n]),o)return{literal:!1,val:o}}(t,e,a))}const Ea="Invalid DateTime",La=864e13;function Oa(e){return new li("unsupported zone",`the zone "${e.name}" is not supported`)}function Ia(e){return null===e.weekData&&(e.weekData=fi(e.c)),e.weekData}function Na(e){return null===e.localWeekData&&(e.localWeekData=fi(e.c,e.loc.getMinDaysInFirstWeek(),e.loc.getStartOfWeek())),e.localWeekData}function Pa(e,t){const i={ts:e.ts,zone:e.zone,c:e.c,o:e.o,loc:e.loc,invalid:e.invalid};return new nn({...i,...t,old:i})}function Va(e,t,i){let r=e-60*t*1e3;const a=i.offset(r);if(t===a)return[r,t];r-=60*(a-t)*1e3;const n=i.offset(r);return a===n?[r,a]:[e-60*Math.min(a,n)*1e3,Math.max(a,n)]}function za(e,t){const i=new Date(e+=60*t*1e3);return{year:i.getUTCFullYear(),month:i.getUTCMonth()+1,day:i.getUTCDate(),hour:i.getUTCHours(),minute:i.getUTCMinutes(),second:i.getUTCSeconds(),millisecond:i.getUTCMilliseconds()}}function Ha(e,t,i){return Va(Fi(e),t,i)}function Fa(e,t){const i=e.o,r=e.c.year+Math.trunc(t.years),a=e.c.month+Math.trunc(t.months)+3*Math.trunc(t.quarters),n={...e.c,year:r,month:a,day:Math.min(e.c.day,Hi(r,a))+Math.trunc(t.days)+7*Math.trunc(t.weeks)},s=pa.fromObject({years:t.years-Math.trunc(t.years),quarters:t.quarters-Math.trunc(t.quarters),months:t.months-Math.trunc(t.months),weeks:t.weeks-Math.trunc(t.weeks),days:t.days-Math.trunc(t.days),hours:t.hours,minutes:t.minutes,seconds:t.seconds,milliseconds:t.milliseconds}).as("milliseconds"),o=Fi(n);let[l,c]=Va(o,i,e.zone);return 0!==s&&(l+=s,c=e.zone.offset(l)),{ts:l,o:c}}function Ra(e,t,i,r,a,n){const{setZone:s,zone:o}=i;if(e&&0!==Object.keys(e).length||t){const r=t||o,a=nn.fromObject(e,{...i,zone:r,specificOffset:n});return s?a:a.setZone(o)}return nn.invalid(new li("unparsable",`the input "${a}" can't be parsed as ${r}`))}function Ga(e,t,i=!0){return e.isValid?pr.create(jt.create("en-US"),{allowZ:i,forceSimple:!0}).formatDateTimeFromString(e,t):null}function ja(e,t,i){const r=e.c.year>9999||e.c.year<0;let a="";if(r&&e.c.year>=0&&(a+="+"),a+=Li(e.c.year,r?6:4),"year"===i)return a;if(t){if(a+="-",a+=Li(e.c.month),"month"===i)return a;a+="-"}else if(a+=Li(e.c.month),"month"===i)return a;return a+=Li(e.c.day),a}function Ua(e,t,i,r,a,n,s){let o=!i||0!==e.c.millisecond||0!==e.c.second,l="";switch(s){case"day":case"month":case"year":break;default:if(l+=Li(e.c.hour),"hour"===s)break;if(t){if(l+=":",l+=Li(e.c.minute),"minute"===s)break;o&&(l+=":",l+=Li(e.c.second))}else{if(l+=Li(e.c.minute),"minute"===s)break;o&&(l+=Li(e.c.second))}if("second"===s)break;!o||r&&0===e.c.millisecond||(l+=".",l+=Li(e.c.millisecond,3))}return a&&(e.isOffsetFixed&&0===e.offset&&!n?l+="Z":e.o<0?(l+="-",l+=Li(Math.trunc(-e.o/60)),l+=":",l+=Li(Math.trunc(-e.o%60))):(l+="+",l+=Li(Math.trunc(e.o/60)),l+=":",l+=Li(Math.trunc(e.o%60)))),n&&(l+="["+e.zone.ianaName+"]"),l}const Za={month:1,day:1,hour:0,minute:0,second:0,millisecond:0},Ba={weekNumber:1,weekday:1,hour:0,minute:0,second:0,millisecond:0},qa={ordinal:1,hour:0,minute:0,second:0,millisecond:0},Wa=["year","month","day","hour","minute","second","millisecond"],Ya=["weekYear","weekNumber","weekday","hour","minute","second","millisecond"],Ja=["year","ordinal","hour","minute","second","millisecond"];function Qa(e){const t={year:"year",years:"year",month:"month",months:"month",day:"day",days:"day",hour:"hour",hours:"hour",minute:"minute",minutes:"minute",quarter:"quarter",quarters:"quarter",second:"second",seconds:"second",millisecond:"millisecond",milliseconds:"millisecond",weekday:"weekday",weekdays:"weekday",weeknumber:"weekNumber",weeksnumber:"weekNumber",weeknumbers:"weekNumber",weekyear:"weekYear",weekyears:"weekYear",ordinal:"ordinal"}[e.toLowerCase()];if(!t)throw new We(e);return t}function Ka(e){switch(e.toLowerCase()){case"localweekday":case"localweekdays":return"localWeekday";case"localweeknumber":case"localweeknumbers":return"localWeekNumber";case"localweekyear":case"localweekyears":return"localWeekYear";default:return Qa(e)}}function Xa(e,t){const i=qt(t.zone,oi.defaultZone);if(!i.isValid)return nn.invalid(Oa(i));const r=jt.fromObject(t);let a,n;if($i(e.year))a=oi.now();else{for(const t of Wa)$i(e[t])&&(e[t]=Za[t]);const t=xi(e)||_i(e);if(t)return nn.invalid(t);const r=function(e){if(void 0===rn&&(rn=oi.now()),"iana"!==e.type)return e.offset(rn);const t=e.name;let i=an.get(t);return void 0===i&&(i=e.offset(rn),an.set(t,i)),i}(i);[a,n]=Ha(e,r,i)}return new nn({ts:a,zone:i,loc:r,o:n})}function en(e,t,i){const r=!!$i(i.round)||i.round,a=$i(i.rounding)?"trunc":i.rounding,n=(e,n)=>{e=Pi(e,r||i.calendary?0:2,i.calendary?"round":a);return t.loc.clone(i).relFormatter(i).format(e,n)},s=r=>i.calendary?t.hasSame(e,r)?0:t.startOf(r).diff(e.startOf(r),r).get(r):t.diff(e,r).get(r);if(i.unit)return n(s(i.unit),i.unit);for(const e of i.units){const t=s(e);if(Math.abs(t)>=1)return n(t,e)}return n(e>t?-0:0,i.units[i.units.length-1])}function tn(e){let t,i={};return e.length>0&&"object"==typeof e[e.length-1]?(i=e[e.length-1],t=Array.from(e).slice(0,e.length-1)):t=Array.from(e),[i,t]}let rn;const an=new Map;class nn{constructor(e){const t=e.zone||oi.defaultZone;let i=e.invalid||(Number.isNaN(e.ts)?new li("invalid input"):null)||(t.isValid?null:Oa(t));this.ts=$i(e.ts)?oi.now():e.ts;let r=null,a=null;if(!i){if(e.old&&e.old.ts===this.ts&&e.old.zone.equals(t))[r,a]=[e.old.c,e.old.o];else{const n=Di(e.o)&&!e.old?e.o:t.offset(this.ts);r=za(this.ts,n),i=Number.isNaN(r.year)?new li("invalid input"):null,r=i?null:r,a=i?null:n}}this._zone=t,this.loc=e.loc||jt.create(),this.invalid=i,this.weekData=null,this.localWeekData=null,this.c=r,this.o=a,this.isLuxonDateTime=!0}static now(){return new nn({})}static local(){const[e,t]=tn(arguments),[i,r,a,n,s,o,l]=t;return Xa({year:i,month:r,day:a,hour:n,minute:s,second:o,millisecond:l},e)}static utc(){const[e,t]=tn(arguments),[i,r,a,n,s,o,l]=t;return e.zone=Zt.utcInstance,Xa({year:i,month:r,day:a,hour:n,minute:s,second:o,millisecond:l},e)}static fromJSDate(e,t={}){const i=function(e){return"[object Date]"===Object.prototype.toString.call(e)}(e)?e.valueOf():NaN;if(Number.isNaN(i))return nn.invalid("invalid input");const r=qt(t.zone,oi.defaultZone);return r.isValid?new nn({ts:i,zone:r,loc:jt.fromObject(t)}):nn.invalid(Oa(r))}static fromMillis(e,t={}){if(Di(e))return e<-La||e>La?nn.invalid("Timestamp out of range"):new nn({ts:e,zone:qt(t.zone,oi.defaultZone),loc:jt.fromObject(t)});throw new Ye(`fromMillis requires a numerical input, but received a ${typeof e} with value ${e}`)}static fromSeconds(e,t={}){if(Di(e))return new nn({ts:1e3*e,zone:qt(t.zone,oi.defaultZone),loc:jt.fromObject(t)});throw new Ye("fromSeconds requires a numerical input")}static fromObject(e,t={}){e=e||{};const i=qt(t.zone,oi.defaultZone);if(!i.isValid)return nn.invalid(Oa(i));const r=jt.fromObject(t),a=qi(e,Ka),{minDaysInFirstWeek:n,startOfWeek:s}=wi(a,r),o=oi.now(),l=$i(t.specificOffset)?i.offset(o):t.specificOffset,c=!$i(a.ordinal),d=!$i(a.year),p=!$i(a.month)||!$i(a.day),h=d||p,u=a.weekYear||a.weekNumber;if((h||c)&&u)throw new qe("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(p&&c)throw new qe("Can't mix ordinal dates with month/day");const g=u||a.weekday&&!h;let m,f,v=za(o,l);g?(m=Ya,f=Ba,v=fi(v,n,s)):c?(m=Ja,f=qa,v=yi(v)):(m=Wa,f=Za);let y=!1;for(const e of m){$i(a[e])?a[e]=y?f[e]:v[e]:y=!0}const b=g?function(e,t=4,i=1){const r=Si(e.weekYear),a=Ei(e.weekNumber,1,Gi(e.weekYear,t,i)),n=Ei(e.weekday,1,7);return r?a?!n&&pi("weekday",e.weekday):pi("week",e.weekNumber):pi("weekYear",e.weekYear)}(a,n,s):c?function(e){const t=Si(e.year),i=Ei(e.ordinal,1,zi(e.year));return t?!i&&pi("ordinal",e.ordinal):pi("year",e.year)}(a):xi(a),w=b||_i(a);if(w)return nn.invalid(w);const x=g?vi(a,n,s):c?bi(a):a,[_,$]=Ha(x,l,i),D=new nn({ts:_,zone:i,o:$,loc:r});return a.weekday&&h&&e.weekday!==D.weekday?nn.invalid("mismatched weekday",`you can't specify both a weekday of ${a.weekday} and a date of ${D.toISO()}`):D.isValid?D:nn.invalid(D.invalid)}static fromISO(e,t={}){const[i,r]=function(e){return mr(e,[Rr,Zr],[Gr,Br],[jr,qr],[Ur,Wr])}(e);return Ra(i,r,t,"ISO 8601",e)}static fromRFC2822(e,t={}){const[i,r]=function(e){return mr(function(e){return e.replace(/\([^()]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").trim()}(e),[Ir,Nr])}(e);return Ra(i,r,t,"RFC 2822",e)}static fromHTTP(e,t={}){const[i,r]=function(e){return mr(e,[Pr,Hr],[Vr,Hr],[zr,Fr])}(e);return Ra(i,r,t,"HTTP",t)}static fromFormat(e,t,i={}){if($i(e)||$i(t))throw new Ye("fromFormat requires an input string and a format");const{locale:r=null,numberingSystem:a=null}=i,n=jt.fromOpts({locale:r,numberingSystem:a,defaultToEN:!0}),[s,o,l,c]=function(e,t,i){const{result:r,zone:a,specificOffset:n,invalidReason:s}=Ma(e,t,i);return[r,a,n,s]}(n,e,t);return c?nn.invalid(c):Ra(s,o,i,`format ${t}`,e,l)}static fromString(e,t,i={}){return nn.fromFormat(e,t,i)}static fromSQL(e,t={}){const[i,r]=function(e){return mr(e,[Jr,Zr],[Qr,Kr])}(e);return Ra(i,r,t,"SQL",e)}static invalid(e,t=null){if(!e)throw new Ye("need to specify a reason the DateTime is invalid");const i=e instanceof li?e:new li(e,t);if(oi.throwOnInvalid)throw new Ue(i);return new nn({invalid:i})}static isDateTime(e){return e&&e.isLuxonDateTime||!1}static parseFormatForOpts(e,t={}){const i=Ta(e,jt.fromObject(t));return i?i.map(e=>e?e.val:null).join(""):null}static expandFormat(e,t={}){return ka(pr.parseFormat(e),jt.fromObject(t)).map(e=>e.val).join("")}static resetCache(){rn=void 0,an.clear()}get(e){return this[e]}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}get outputCalendar(){return this.isValid?this.loc.outputCalendar:null}get zone(){return this._zone}get zoneName(){return this.isValid?this.zone.name:null}get year(){return this.isValid?this.c.year:NaN}get quarter(){return this.isValid?Math.ceil(this.c.month/3):NaN}get month(){return this.isValid?this.c.month:NaN}get day(){return this.isValid?this.c.day:NaN}get hour(){return this.isValid?this.c.hour:NaN}get minute(){return this.isValid?this.c.minute:NaN}get second(){return this.isValid?this.c.second:NaN}get millisecond(){return this.isValid?this.c.millisecond:NaN}get weekYear(){return this.isValid?Ia(this).weekYear:NaN}get weekNumber(){return this.isValid?Ia(this).weekNumber:NaN}get weekday(){return this.isValid?Ia(this).weekday:NaN}get isWeekend(){return this.isValid&&this.loc.getWeekendDays().includes(this.weekday)}get localWeekday(){return this.isValid?Na(this).weekday:NaN}get localWeekNumber(){return this.isValid?Na(this).weekNumber:NaN}get localWeekYear(){return this.isValid?Na(this).weekYear:NaN}get ordinal(){return this.isValid?yi(this.c).ordinal:NaN}get monthShort(){return this.isValid?ga.months("short",{locObj:this.loc})[this.month-1]:null}get monthLong(){return this.isValid?ga.months("long",{locObj:this.loc})[this.month-1]:null}get weekdayShort(){return this.isValid?ga.weekdays("short",{locObj:this.loc})[this.weekday-1]:null}get weekdayLong(){return this.isValid?ga.weekdays("long",{locObj:this.loc})[this.weekday-1]:null}get offset(){return this.isValid?+this.o:NaN}get offsetNameShort(){return this.isValid?this.zone.offsetName(this.ts,{format:"short",locale:this.locale}):null}get offsetNameLong(){return this.isValid?this.zone.offsetName(this.ts,{format:"long",locale:this.locale}):null}get isOffsetFixed(){return this.isValid?this.zone.isUniversal:null}get isInDST(){return!this.isOffsetFixed&&(this.offset>this.set({month:1,day:1}).offset||this.offset>this.set({month:5}).offset)}getPossibleOffsets(){if(!this.isValid||this.isOffsetFixed)return[this];const e=864e5,t=6e4,i=Fi(this.c),r=this.zone.offset(i-e),a=this.zone.offset(i+e),n=this.zone.offset(i-r*t),s=this.zone.offset(i-a*t);if(n===s)return[this];const o=i-n*t,l=i-s*t,c=za(o,n),d=za(l,s);return c.hour===d.hour&&c.minute===d.minute&&c.second===d.second&&c.millisecond===d.millisecond?[Pa(this,{ts:o}),Pa(this,{ts:l})]:[this]}get isInLeapYear(){return Vi(this.year)}get daysInMonth(){return Hi(this.year,this.month)}get daysInYear(){return this.isValid?zi(this.year):NaN}get weeksInWeekYear(){return this.isValid?Gi(this.weekYear):NaN}get weeksInLocalWeekYear(){return this.isValid?Gi(this.localWeekYear,this.loc.getMinDaysInFirstWeek(),this.loc.getStartOfWeek()):NaN}resolvedLocaleOptions(e={}){const{locale:t,numberingSystem:i,calendar:r}=pr.create(this.loc.clone(e),e).resolvedOptions(this);return{locale:t,numberingSystem:i,outputCalendar:r}}toUTC(e=0,t={}){return this.setZone(Zt.instance(e),t)}toLocal(){return this.setZone(oi.defaultZone)}setZone(e,{keepLocalTime:t=!1,keepCalendarTime:i=!1}={}){if((e=qt(e,oi.defaultZone)).equals(this.zone))return this;if(e.isValid){let r=this.ts;if(t||i){const t=e.offset(this.ts),i=this.toObject();[r]=Ha(i,t,e)}return Pa(this,{ts:r,zone:e})}return nn.invalid(Oa(e))}reconfigure({locale:e,numberingSystem:t,outputCalendar:i}={}){return Pa(this,{loc:this.loc.clone({locale:e,numberingSystem:t,outputCalendar:i})})}setLocale(e){return this.reconfigure({locale:e})}set(e){if(!this.isValid)return this;const t=qi(e,Ka),{minDaysInFirstWeek:i,startOfWeek:r}=wi(t,this.loc),a=!$i(t.weekYear)||!$i(t.weekNumber)||!$i(t.weekday),n=!$i(t.ordinal),s=!$i(t.year),o=!$i(t.month)||!$i(t.day),l=s||o,c=t.weekYear||t.weekNumber;if((l||n)&&c)throw new qe("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(o&&n)throw new qe("Can't mix ordinal dates with month/day");let d;a?d=vi({...fi(this.c,i,r),...t},i,r):$i(t.ordinal)?(d={...this.toObject(),...t},$i(t.day)&&(d.day=Math.min(Hi(d.year,d.month),d.day))):d=bi({...yi(this.c),...t});const[p,h]=Ha(d,this.o,this.zone);return Pa(this,{ts:p,o:h})}plus(e){if(!this.isValid)return this;return Pa(this,Fa(this,pa.fromDurationLike(e)))}minus(e){if(!this.isValid)return this;return Pa(this,Fa(this,pa.fromDurationLike(e).negate()))}startOf(e,{useLocaleWeeks:t=!1}={}){if(!this.isValid)return this;const i={},r=pa.normalizeUnit(e);switch(r){case"years":i.month=1;case"quarters":case"months":i.day=1;case"weeks":case"days":i.hour=0;case"hours":i.minute=0;case"minutes":i.second=0;case"seconds":i.millisecond=0}if("weeks"===r)if(t){const e=this.loc.getStartOfWeek(),{weekday:t}=this;t<e&&(i.weekNumber=this.weekNumber-1),i.weekday=e}else i.weekday=1;if("quarters"===r){const e=Math.ceil(this.month/3);i.month=3*(e-1)+1}return this.set(i)}endOf(e,t){return this.isValid?this.plus({[e]:1}).startOf(e,t).minus(1):this}toFormat(e,t={}){return this.isValid?pr.create(this.loc.redefaultToEN(t)).formatDateTimeFromString(this,e):Ea}toLocaleString(e=et,t={}){return this.isValid?pr.create(this.loc.clone(t),e).formatDateTime(this):Ea}toLocaleParts(e={}){return this.isValid?pr.create(this.loc.clone(e),e).formatDateTimeParts(this):[]}toISO({format:e="extended",suppressSeconds:t=!1,suppressMilliseconds:i=!1,includeOffset:r=!0,extendedZone:a=!1,precision:n="milliseconds"}={}){if(!this.isValid)return null;const s="extended"===e;let o=ja(this,s,n=Qa(n));return Wa.indexOf(n)>=3&&(o+="T"),o+=Ua(this,s,t,i,r,a,n),o}toISODate({format:e="extended",precision:t="day"}={}){return this.isValid?ja(this,"extended"===e,Qa(t)):null}toISOWeekDate(){return Ga(this,"kkkk-'W'WW-c")}toISOTime({suppressMilliseconds:e=!1,suppressSeconds:t=!1,includeOffset:i=!0,includePrefix:r=!1,extendedZone:a=!1,format:n="extended",precision:s="milliseconds"}={}){if(!this.isValid)return null;return s=Qa(s),(r&&Wa.indexOf(s)>=3?"T":"")+Ua(this,"extended"===n,t,e,i,a,s)}toRFC2822(){return Ga(this,"EEE, dd LLL yyyy HH:mm:ss ZZZ",!1)}toHTTP(){return Ga(this.toUTC(),"EEE, dd LLL yyyy HH:mm:ss 'GMT'")}toSQLDate(){return this.isValid?ja(this,!0):null}toSQLTime({includeOffset:e=!0,includeZone:t=!1,includeOffsetSpace:i=!0}={}){let r="HH:mm:ss.SSS";return(t||e)&&(i&&(r+=" "),t?r+="z":e&&(r+="ZZ")),Ga(this,r,!0)}toSQL(e={}){return this.isValid?`${this.toSQLDate()} ${this.toSQLTime(e)}`:null}toString(){return this.isValid?this.toISO():Ea}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`:`DateTime { Invalid, reason: ${this.invalidReason} }`}valueOf(){return this.toMillis()}toMillis(){return this.isValid?this.ts:NaN}toSeconds(){return this.isValid?this.ts/1e3:NaN}toUnixInteger(){return this.isValid?Math.floor(this.ts/1e3):NaN}toJSON(){return this.toISO()}toBSON(){return this.toJSDate()}toObject(e={}){if(!this.isValid)return{};const t={...this.c};return e.includeConfig&&(t.outputCalendar=this.outputCalendar,t.numberingSystem=this.loc.numberingSystem,t.locale=this.loc.locale),t}toJSDate(){return new Date(this.isValid?this.ts:NaN)}diff(e,t="milliseconds",i={}){if(!this.isValid||!e.isValid)return pa.invalid("created by diffing an invalid DateTime");const r={locale:this.locale,numberingSystem:this.numberingSystem,...i},a=(o=t,Array.isArray(o)?o:[o]).map(pa.normalizeUnit),n=e.valueOf()>this.valueOf(),s=fa(n?this:e,n?e:this,a,r);var o;return n?s.negate():s}diffNow(e="milliseconds",t={}){return this.diff(nn.now(),e,t)}until(e){return this.isValid?ua.fromDateTimes(this,e):this}hasSame(e,t,i){if(!this.isValid)return!1;const r=e.valueOf(),a=this.setZone(e.zone,{keepLocalTime:!0});return a.startOf(t,i)<=r&&r<=a.endOf(t,i)}equals(e){return this.isValid&&e.isValid&&this.valueOf()===e.valueOf()&&this.zone.equals(e.zone)&&this.loc.equals(e.loc)}toRelative(e={}){if(!this.isValid)return null;const t=e.base||nn.fromObject({},{zone:this.zone}),i=e.padding?this<t?-e.padding:e.padding:0;let r=["years","months","days","hours","minutes","seconds"],a=e.unit;return Array.isArray(e.unit)&&(r=e.unit,a=void 0),en(t,this.plus(i),{...e,numeric:"always",units:r,unit:a})}toRelativeCalendar(e={}){return this.isValid?en(e.base||nn.fromObject({},{zone:this.zone}),this,{...e,numeric:"auto",units:["years","months","days"],calendary:!0}):null}static min(...e){if(!e.every(nn.isDateTime))throw new Ye("min requires all arguments be DateTimes");return Ai(e,e=>e.valueOf(),Math.min)}static max(...e){if(!e.every(nn.isDateTime))throw new Ye("max requires all arguments be DateTimes");return Ai(e,e=>e.valueOf(),Math.max)}static fromFormatExplain(e,t,i={}){const{locale:r=null,numberingSystem:a=null}=i;return Ma(jt.fromOpts({locale:r,numberingSystem:a,defaultToEN:!0}),e,t)}static fromStringExplain(e,t,i={}){return nn.fromFormatExplain(e,t,i)}static buildFormatParser(e,t={}){const{locale:i=null,numberingSystem:r=null}=t,a=jt.fromOpts({locale:i,numberingSystem:r,defaultToEN:!0});return new Aa(a,e)}static fromFormatParser(e,t,i={}){if($i(e)||$i(t))throw new Ye("fromFormatParser requires an input string and a format parser");const{locale:r=null,numberingSystem:a=null}=i,n=jt.fromOpts({locale:r,numberingSystem:a,defaultToEN:!0});if(!n.equals(t.locale))throw new Ye(`fromFormatParser called with a locale of ${n}, but the format parser was created for ${t.locale}`);const{result:s,zone:o,specificOffset:l,invalidReason:c}=t.explainFromTokens(e);return c?nn.invalid(c):Ra(s,o,i,`format ${t.format}`,e,l)}static get DATE_SHORT(){return et}static get DATE_MED(){return tt}static get DATE_MED_WITH_WEEKDAY(){return it}static get DATE_FULL(){return rt}static get DATE_HUGE(){return at}static get TIME_SIMPLE(){return nt}static get TIME_WITH_SECONDS(){return st}static get TIME_WITH_SHORT_OFFSET(){return ot}static get TIME_WITH_LONG_OFFSET(){return lt}static get TIME_24_SIMPLE(){return ct}static get TIME_24_WITH_SECONDS(){return dt}static get TIME_24_WITH_SHORT_OFFSET(){return pt}static get TIME_24_WITH_LONG_OFFSET(){return ht}static get DATETIME_SHORT(){return ut}static get DATETIME_SHORT_WITH_SECONDS(){return gt}static get DATETIME_MED(){return mt}static get DATETIME_MED_WITH_SECONDS(){return ft}static get DATETIME_MED_WITH_WEEKDAY(){return vt}static get DATETIME_FULL(){return yt}static get DATETIME_FULL_WITH_SECONDS(){return bt}static get DATETIME_HUGE(){return wt}static get DATETIME_HUGE_WITH_SECONDS(){return xt}}function sn(e){if(nn.isDateTime(e))return e;if(e&&e.valueOf&&Di(e.valueOf()))return nn.fromJSDate(e);if(e&&"object"==typeof e)return nn.fromObject(e);throw new Ye(`Unknown datetime argument: ${e}, of type ${typeof e}`)}const on=o`
  :host {
    /* MD3 Color System */
    --primary-gradient: linear-gradient(135deg, #4CAF50, #45a049);
    --secondary-gradient: linear-gradient(135deg, #2196F3, #1976D2);
    --danger-gradient: linear-gradient(135deg, #f44336, #d32f2f);
    
    /* MD3 Elevation Levels */
    --md3-elevation-level0: none;
    --md3-elevation-level1: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15);
    --md3-elevation-level2: 0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15);
    --md3-elevation-level3: 0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.3);
    --md3-elevation-level4: 0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px rgba(0,0,0,0.3);
    --md3-elevation-level5: 0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px rgba(0,0,0,0.3);
    
    --surface-elevation: var(--md3-elevation-level1);
    --surface-elevation-hover: var(--md3-elevation-level2);
    
    /* Spacing (MD3 spacing system) */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    
    /* Border Radius (MD3 shape system) */
    --border-radius-xs: 4px;
    --border-radius-sm: 8px;
    --border-radius-md: 12px;
    --border-radius-lg: 16px;
    --border-radius-xl: 28px;
    --border-radius: 12px; /* Default */
    
    /* MD3 Typography Scale */
    --font-size-xs: 0.6875rem;   /* 11px */
    --font-size-sm: 0.875rem;    /* 14px - Body Small */
    --font-size-md: 1rem;        /* 16px - Body Medium */
    --font-size-lg: 1.25rem;     /* 20px - Title Large */
    --font-size-xl: 1.5rem;      /* 24px - Headline Small */

    /* Font Weights */
    --font-weight-regular: 400;
    --font-weight-medium: 500;
    --font-weight-bold: 700;
    
    /* MD3 Motion Tokens */
    --md3-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
    --md3-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
    --md3-motion-duration-short1: 50ms;
    --md3-motion-duration-short2: 100ms;
    --md3-motion-duration-short3: 150ms;
    --md3-motion-duration-short4: 200ms;
    --md3-motion-duration-medium1: 250ms;
    --md3-motion-duration-medium2: 300ms;
    --md3-motion-duration-long1: 400ms;
    --md3-motion-duration-long2: 500ms;

    /* Growspace Theme Colors */
    --growspace-card-bg: var(--card-background-color, #1e1e1e);
    --growspace-card-text: var(--primary-text-color, #fff);
    --growspace-card-accent: var(--primary-color, #4caf50);
    --growspace-empty-bg: rgba(255, 255, 255, 0.05);
    --growspace-empty-bg-hover: rgba(255, 255, 255, 0.1);
    --plant-border-color-default: #2196f3;

    /* Card Shadows (using MD3 elevation) */
    --card-shadow: var(--md3-elevation-level1);
    --card-shadow-hover: var(--md3-elevation-level2);

    /* Transitions (using MD3 motion) */
    --transition: all var(--md3-motion-duration-short4) var(--md3-motion-easing-standard);
    --transition-fast: all var(--md3-motion-duration-short2) var(--md3-motion-easing-standard);
    --transition-medium: all var(--md3-motion-duration-medium2) var(--md3-motion-easing-standard);

    /* Divider */
    --divider-color: rgba(255, 255, 255, 0.12);

    /* Plant Stage Colors */
    --stage-veg: #4caf50;
    --stage-flower: #ff9800;
    --stage-dry: #9c27b0;
    --stage-cure: #2196f3;

    /* Error/Warning Colors */
    --error-color: #f44336;
    --error-bg: rgba(244, 67, 54, 0.1);
    --error-border: rgba(244, 67, 54, 0.3);
    
    /* Strain Dialog */
    --strain-dialog-bg: var(--ha-card-background, #1e1e1e);
    --strain-dialog-color: var(--primary-text-color, #fff);
    --strain-border-color: #4caf50;
    --strain-input-bg: #2a2a2a;
    --strain-input-border: #3a3a3a;
    
    /* Light Color */
    --primary-light-color: #FFEB3B;
  }
`;class ln{static normalizeStage(e){const t=e.toLowerCase();return"veg"===t?"vegetative":"mom"===t?"mother":t}static getPlantStageColor(e){const t=this.normalizeStage(e);return this.stageColors[t]??"#757575"}static getPlantStageIcon(e){const t=this.normalizeStage(e);return this.stageIcons[t]??Ie}static getPlantStage(e){const t=e?.attributes??{},i=new Date;return t.cure_start?"cure":t.dry_start?"dry":t.mom_start?"mother":t.clone_start?"clone":t.flower_start&&new Date(t.flower_start)<=i?"flower":t.veg_start&&new Date(t.veg_start)<=i?"vegetative":"seedling"}static createGridLayout(e,t,i){const r=Array.from({length:t},()=>Array.from({length:i},()=>null));return e.forEach(e=>{const a=(e.attributes?.row??1)-1,n=(e.attributes?.col??1)-1;a>=0&&a<t&&n>=0&&n<i&&(r[a][n]=e)}),{rows:t,cols:i,grid:r}}static calculateEffectiveRows(e){const{name:t,plants:i,plants_per_row:r,rows:a}=e;if("dry"===t||"cure"===t||"mother"===t||"clone"===t){if(0===i.length)return 1;const e=Math.max(...i.map(e=>e.attributes?.row||1)),t=i.filter(t=>(t.attributes?.row||1)===e).length;return t>=r?e+1:e}return a}static parseDateTimeLocal(e){if(e)try{const t=16===e.length?e+":00":e,i=new Date(t);if(isNaN(i.getTime()))return;const r=i.getFullYear(),a=String(i.getMonth()+1).padStart(2,"0"),n=String(i.getDate()).padStart(2,"0"),s=String(i.getHours()).padStart(2,"0"),o=String(i.getMinutes()).padStart(2,"0");return`${r}-${a}-${n}T${s}:${o}:${String(i.getSeconds()).padStart(2,"0")}`}catch{return}}static formatDateForBackend(e){if(e)try{const t=e.split("T");if(t.length>0&&t[0].match(/^\d{4}-\d{2}-\d{2}$/))return t[0];const i=new Date(e);if(isNaN(i.getTime()))return;const r=i.getFullYear(),a=String(i.getMonth()+1).padStart(2,"0");return`${r}-${a}-${String(i.getDate()).padStart(2,"0")}`}catch{return}}static getCurrentDateTime(){const e=new Date,t=e=>e.toString().padStart(2,"0");return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())}T${t(e.getHours())}:${t(e.getMinutes())}:00`}static toDateTimeLocal(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=e=>e.toString().padStart(2,"0"),r=t.getFullYear(),a=i(t.getMonth()+1),n=i(t.getDate()),s=i(t.getHours());return`${r}-${a}-${n}T${s}:${i(t.getMinutes())}`}catch{return""}}static getDominantStage(e){if(!e||0===e.length)return null;const t=["cure","dry","flower","vegetative","clone","mother","seedling"];let i=null,r=0;const a={};for(const t of e){const e=this.normalizeStage(t.state||this.getPlantStage(t));a[e]||(a[e]=[]),a[e].push(t)}for(const e of t)if(a[e]&&a[e].length>0){i=e;const t=`${"vegetative"===e?"veg":e}_days`,n=a[e].map(e=>{const i=e.attributes[t];return"number"==typeof i?i:0});r=Math.max(...n);break}return i?{stage:i,days:r}:null}static compressImage(e,t=800,i=800,r=.7){return new Promise((a,n)=>{const s=new FileReader;s.readAsDataURL(e),s.onload=e=>{const s=new Image;s.src=e.target?.result,s.onload=()=>{let e=s.width,o=s.height;e>o?e>t&&(o=Math.round(o*t/e),e=t):o>i&&(e=Math.round(e*i/o),o=i);const l=document.createElement("canvas");l.width=e,l.height=o;const c=l.getContext("2d");if(!c)return void n(new Error("Failed to get canvas context"));c.drawImage(s,0,0,e,o);const d=l.toDataURL("image/jpeg",r);a(d)},s.onerror=e=>n(e)},s.onerror=e=>n(e)})}static preloadImage(e){return new Promise((t,i)=>{const r=new Image;r.src=e,r.onload=()=>t(),r.onerror=()=>i()})}}ln.stageColors={mother:"#E91E63",clone:"#FF5722",seedling:"#4CAF50",vegetative:"#8BC34A",flower:"#FF9800",dry:"#795548",cure:"#9C27B0"},ln.stageIcons={mother:Ie,clone:Ie,seedling:Ie,vegetative:Ie,flower:Se,dry:Ce,cure:me};class cn{constructor(e){this.hass=e}getGrowspaceDevices(){if(!this.hass)return[];const e=Object.values(this.hass.states),t=e.filter(e=>e.entity_id.startsWith("sensor.")&&void 0!==e.attributes?.growspace_id&&void 0!==e.attributes?.rows&&void 0!==e.attributes?.plants_per_row&&void 0===e.attributes?.row&&void 0===e.attributes?.col),i=new Map;return t.forEach(e=>{const t=e.attributes.growspace_id;i.set(t,[])}),e.forEach(e=>{if(void 0!==e.attributes?.row&&void 0!==e.attributes?.col){const t=this.getGrowspaceId(e);i.has(t)||i.set(t,[]),i.get(t).push(e)}}),Array.from(i.entries()).map(([e,i])=>{const r=t.find(t=>t.attributes?.growspace_id===e),a=r?.attributes?.friendly_name||`Growspace ${e}`,n=r?.attributes?.type??(a.toLowerCase().includes("dry")?"dry":a.toLowerCase().includes("cure")?"cure":"normal");return s={device_id:e,overview_entity_id:r?.entity_id,name:a,plants:i,rows:r?.attributes?.rows??3,plants_per_row:r?.attributes?.plants_per_row??3,type:n},{...s,type:s.type??"normal"};var s})}getGrowspaceId(e){return e.attributes?.growspace_id||"unknown"}getStrainLibrary(){const e=Object.values(this.hass.states).find(e=>void 0!==e.attributes?.strains&&null!==e.attributes?.strains),t=e?.attributes?.strains;if(!t)return console.warn("[DataService] No strain data in sensor attributes"),[];if(Array.isArray(t))return t.map(e=>({strain:e,phenotype:"",key:`${e}|default`}));if("object"==typeof t){const e=[];for(const[i,r]of Object.entries(t)){const t=r.meta||{},a=r.phenotypes||{};Object.entries(a).forEach(([r,a])=>{e.push({strain:i,phenotype:r,key:`${i}|${r}`,breeder:t.breeder,type:t.type,lineage:t.lineage,sex:t.sex,sativa_percentage:t.sativa_percentage,indica_percentage:t.indica_percentage,description:a.description,image:a.image_path,image_crop_meta:a.image_crop_meta,flowering_days_min:a.flower_days_min,flowering_days_max:a.flower_days_max})})}return e.sort((e,t)=>{const i=e.strain.localeCompare(t.strain);return 0!==i?i:(e.phenotype||"").localeCompare(t.phenotype||"")})}return[]}async getHistory(e,t,i){if(!this.hass)return[];let r=`history/period/${t.toISOString()}?filter_entity_id=${e}`;i&&(r+=`&end_time=${i.toISOString()}`);try{const e=await this.hass.callApi("GET",r);return e&&e.length>0?e[0]:[]}catch(e){return console.error("Error fetching history:",e),[]}}async addPlant(e){console.log("[DataService:addPlant] Sending payload:",e);try{"mother"!==e.growspace_id&&"mother_overview"!==e.growspace_id||(e.mother_start=(new Date).toISOString().split("T")[0]),"clone"!==e.growspace_id&&"clone_overview"!==e.growspace_id||(e.clone_start=(new Date).toISOString().split("T")[0]);const t=await this.hass.callService("growspace_manager","add_plant",e);return console.log("[DataService:addPlant] Response:",t),t}catch(e){throw console.error("[DataService:addPlant] Error:",e),e}}async updatePlant(e){console.log("[DataService:updatePlant] Sending payload:",e);try{const t=await this.hass.callService("growspace_manager","update_plant",e);return console.log("[DataService:updatePlant] Response:",t),t}catch(e){throw console.error("[DataService:updatePlant] Error:",e),e}}async removePlant(e){console.log("[DataService:removePlant] Removing plant_id:",e);try{const t=await this.hass.callService("growspace_manager","remove_plant",{plant_id:e});return console.log("[DataService:removePlant] Response:",t),t}catch(e){throw console.error("[DataService:removePlant] Error:",e),e}}async harvestPlant(e,t="dry"){console.log("[DataService:harvestPlant] Harvesting plant:",e,"→ target:",t);try{const i=(t||"").toLowerCase(),r={plant_id:e};i.includes("dry")?r.target_growspace_id="dry_overview":i.includes("cure")?r.target_growspace_id="cure_overview":i.includes("mother")?r.target_growspace_id="mother_overview":i.includes("clone")?r.target_growspace_id="clone_overview":i&&(r.target_growspace_name=t);const a=await this.hass.callService("growspace_manager","harvest_plant",r);return console.log("[DataService:harvestPlant] Response:",a),a}catch(e){throw console.error("[DataService:harvestPlant] Error:",e),e}}async takeClone(e,t="clone"){console.log("[DataService:takeClone] Cloning plant:",e,"→ target:",t);try{const i=(t||"").toLowerCase(),r={plant_id:e};i.includes("dry")?r.target_growspace_id="dry_overview":i.includes("cure")?r.target_growspace_id="cure_overview":i.includes("mother")?r.target_growspace_id="mother_overview":i.includes("clone")?r.target_growspace_id="clone_overview":i&&(r.target_growspace_name=t);const a=await this.hass.callService("growspace_manager","takeClone",r);return console.log("[DataService:takeClone] Response:",a),a}catch(e){throw console.error("[DataService:takeClone] Error:",e),e}}async swapPlants(e,t){console.log(`[DataService:swapPlants] Swapping plants: ${e} and ${t}`);try{const i=await this.hass.callService("growspace_manager","switch_plants",{plant1_id:e,plant2_id:t});return console.log("[DataService:swapPlants] Response:",i),i}catch(e){throw console.error("[DataService:swapPlants] Error:",e),e}}async addStrain(e){console.log("[DataService:addStrain] Adding strain:",e);try{const t={...e};Object.keys(t).forEach(e=>{void 0===t[e]&&delete t[e]}),e.image&&(e.image.startsWith("data:")?(t.image_base64=e.image,delete t.image):(t.image_path=e.image,delete t.image));const i=await this.hass.callService("growspace_manager","add_strain",t);return console.log("[DataService:addStrain] Response:",i),i}catch(e){throw console.error("[DataService:addStrain] Error:",e),e}}async removeStrain(e,t){console.log("[DataService:removeStrain] Removing strain:",e,t);try{const i=await this.hass.callService("growspace_manager","remove_strain",{strain:e,phenotype:t});return console.log("[DataService:removeStrain] Response:",i),i}catch(e){throw console.error("[DataService:removeStrain] Error:",e),e}}async importStrainLibrary(e,t){console.log("[DataService:importStrainLibrary] Importing strain library ZIP via HTTP. Replace:",t);const i=new FormData;i.append("file",e),i.append("replace",t.toString());try{const e=await fetch("/api/growspace_manager/import_strains",{method:"POST",body:i,headers:{Authorization:`Bearer ${this.hass.auth.data.access_token}`}});if(!e.ok){const t=await e.text();throw new Error(t||e.statusText)}const t=await e.json();if(console.log("[DataService:importStrainLibrary] Response:",t),t.success)return t;throw new Error(t.error||"Unknown import error")}catch(e){throw console.error("[DataService:importStrainLibrary] Error:",e),e}}async clearStrainLibrary(){console.log("[DataService:clearStrainLibrary] Clearing library");try{const e=await this.hass.callService("growspace_manager","clear_strain_library");return console.log("[DataService:clearStrainLibrary] Response:",e),e}catch(e){throw console.error("[DataService:clearStrainLibrary] Error:",e),e}}async addGrowspace(e){console.log("[DataService:addGrowspace] Adding growspace:",e);try{const t=await this.hass.callService("growspace_manager","add_growspace",e);return console.log("[DataService:addGrowspace] Response:",t),t}catch(e){throw console.error("[DataService:addGrowspace] Error:",e),e}}async configureGrowspaceSensors(e){console.log("[DataService:configureGrowspaceSensors] Configuring sensors:",e);try{const t=await this.hass.callService("growspace_manager","configure_growspace",e);return console.log("[DataService:configureGrowspaceSensors] Response:",t),t}catch(e){throw console.error("[DataService:configureGrowspaceSensors] Error:",e),e}}async configureGlobalSettings(e){console.log("[DataService:configureGlobalSettings] Configuring global settings:",e);try{const t=await this.hass.callService("growspace_manager","configure_global",e);return console.log("[DataService:configureGlobalSettings] Response:",t),t}catch(e){throw console.error("[DataService:configureGlobalSettings] Error:",e),e}}async askGrowAdvice(e,t){console.log("[DataService:askGrowAdvice] Asking advice for:",e,t);try{return await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"ask_grow_advice",service_data:{growspace_id:e,user_query:t},return_response:!0})}catch(e){throw console.error("[DataService:askGrowAdvice] Error:",e),e}}async analyzeAllGrowspaces(){console.log("[DataService:analyzeAllGrowspaces] Analyzing all growspaces");try{return await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"analyze_all_growspaces",service_data:{},return_response:!0})}catch(e){throw console.error("[DataService:analyzeAllGrowspaces] Error:",e),e}}async getStrainRecommendation(e){console.log("[DataService:getStrainRecommendation] Getting strain recommendation for:",e);try{return await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"strain_recommendation",service_data:{user_query:e},return_response:!0})}catch(e){throw console.error("[DataService:getStrainRecommendation] Error:",e),e}}}class dn{static getCropStyle(e,t){return t?`\n      background-image: url('${e}');\n      background-size: ${100*t.scale}%;\n      background-position: ${t.x}% ${t.y}%;\n    `:`background-image: url('${e}')`}static renderAddPlantDialog(e,t,i,r){if(!e?.open)return j``;const a=[...new Set(t.map(e=>e.strain))].sort(),n=dn.getTimelineContent(e,i,r);return j`
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
                 <path d="${ye}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${dn.renderMD3SelectInput("Strain *",e.strain||"",a,r.onStrainChange)}
               ${dn.renderMD3TextInput("Phenotype",e.phenotype||"",r.onPhenotypeChange)}
               <div style="display:flex; gap:16px;">
                 ${dn.renderMD3NumberInput("Row",e.row+1,e=>r.onRowChange(e))}
                 ${dn.renderMD3NumberInput("Col",e.col+1,e=>r.onColChange(e))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
                ${n}
             </div>
          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
            <button class="md3-button tonal" @click=${r.onClose}>
              Cancel
            </button>
            <button class="md3-button primary" @click=${r.onConfirm}>
              <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ie}"></path></svg>
              Add Plant
            </button>
          </div>

        </div>
      </ha-dialog>
    `}static parseScheduleString(e){if("string"!=typeof e)return e;if(!e||"[]"===e)return[];try{const t=e.replace(/'/g,'"'),i=JSON.parse(t);return Array.isArray(i)?i:[]}catch(t){return console.error("Failed to parse irrigation schedule string:",e,t),[]}}static getTimelineContent(e,t,i){const r=t.toLowerCase();let a;return a=r.includes("mother")?j`${dn.renderMD3DateInput("Mother Start",e.mother_start||"",i.onMotherStartChange)}`:r.includes("clone")?j`${dn.renderMD3DateInput("Clone Start",e.clone_start||"",i.onCloneStartChange)}`:r.includes("dry")?j`${dn.renderMD3DateInput("Dry Start",e.dry_start||"",i.onDryStartChange)}`:r.includes("cure")?j`${dn.renderMD3DateInput("Cure Start",e.cure_start||"",i.onCureStartChange)}`:j`
        ${dn.renderMD3DateInput("Seedling Start",e.seedling_start||"",i.onSeedlingStartChange)}
        ${dn.renderMD3DateInput("Vegetative Start",e.veg_start||"",i.onVegStartChange)}
        ${dn.renderMD3DateInput("Flower Start",e.flower_start||"",i.onFlowerStartChange)}
      `,j`
      <h3>Timeline</h3>
      ${a}
    `}static renderPlantOverviewDialog(e,t,i){if(!e?.open)return j``;const{plant:r,editedAttributes:a}=e,n=r.attributes?.plant_id||r.entity_id.replace("sensor.",""),s=ln.getPlantStageColor(r.state),o=ln.getPlantStageIcon(r.state),l=(e,t)=>{a[e]="number"==typeof t?t.toString():t,i.onAttributeChange(e,a[e])};return j`
      <ha-dialog
        open
        @closed=${i.onClose}
        hideActions
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="glass-dialog-container" style="--stage-color: ${s}">

          <!-- HEADER -->
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${o}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
               <h2 class="dialog-title">${a.strain||"Unknown Strain"}</h2>
               <div class="dialog-subtitle">${r.state} Stage • ${a.phenotype||"No Phenotype"}</div>
            </div>
            <button class="md3-button text" @click=${i.onClose} style="min-width: auto; padding: 8px;">
               <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                 <path d="${ye}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY & LOCATION CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${dn.renderMD3TextInput("Strain Name",a.strain||"",e=>i.onAttributeChange("strain",e))}
               ${dn.renderMD3TextInput("Phenotype",a.phenotype||"",e=>i.onAttributeChange("phenotype",e))}
               <div style="display:flex; gap:16px;">
                 ${dn.renderMD3NumberInput("Row",a.row||1,e=>i.onAttributeChange("row",parseInt(e)))}
                 ${dn.renderMD3NumberInput("Col",a.col||1,e=>i.onAttributeChange("col",parseInt(e)))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                 <h3 style="margin: 0;">Timeline</h3>
                 <button class="md3-button text" style="min-width: auto; padding: 4px;" @click=${i.onToggleShowAllDates}>
                    <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ee}"></path></svg>
                 </button>
               </div>
               
               ${e.showAllDates?j`
                  ${dn.renderMD3DateTimeInput("Seedling Start",a.seedling_start??"",e=>l("seedling_start",e))}
                  ${dn.renderMD3DateTimeInput("Mother Start",a.mother_start??"",e=>l("mother_start",e))}
                  ${dn.renderMD3DateTimeInput("Clone Start",a.clone_start??"",e=>l("clone_start",e))}
                  ${dn.renderMD3DateTimeInput("Vegetative Start",a.veg_start??"",e=>l("veg_start",e))}
                  ${dn.renderMD3DateTimeInput("Flower Start",a.flower_start??"",e=>l("flower_start",e))}
                  ${dn.renderMD3DateTimeInput("Dry Start",a.dry_start??"",e=>l("dry_start",e))}
                  ${dn.renderMD3DateTimeInput("Cure Start",a.cure_start??"",e=>l("cure_start",e))}
               `:j`
                  ${"mother"===a.stage?dn.renderMD3DateTimeInput("Mother Start",a.mother_start??"",e=>l("mother_start",e)):Z}
                  ${"clone"===a.stage?dn.renderMD3DateTimeInput("Clone Start",a.clone_start??"",e=>l("clone_start",e)):Z}
                  ${"veg"===a.stage||"flower"===a.stage?dn.renderMD3DateTimeInput("Vegetative Start",a.veg_start??"",e=>l("veg_start",e)):Z}
                  ${"flower"===a.stage?dn.renderMD3DateTimeInput("Flower Start",a.flower_start??"",e=>l("flower_start",e)):Z}
                  ${"dry"===a.stage||"cure"===a.stage?dn.renderMD3DateTimeInput("Dry Start",a.dry_start??"",e=>l("dry_start",e)):Z}
                  ${"cure"===a.stage?dn.renderMD3DateTimeInput("Cure Start",a.cure_start??"",e=>l("cure_start",e)):Z}
               `}
             </div>

             <!-- STATS CARD -->
             ${dn.renderPlantStatsMD3(r)}

          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
             <button class="md3-button danger" @click=${()=>i.onDelete(n)}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${$e}"></path></svg>
               Delete
             </button>

             <button class="md3-button tonal" @click=${i.onUpdate}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${fe}"></path></svg>
               Save Changes
             </button>

             <!-- DYNAMIC ACTIONS BASED ON STAGE -->
             ${"mother"===r.state.toLowerCase()?j`
                <div class="take-clone-container" style="display:contents;" data-plant-id="${r.entity_id}">
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
                    @click=${e=>{const t=e.currentTarget.previousElementSibling,a=t?parseInt(t.value,10):1;i.onTakeClone(r,a)}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${_e}"></path></svg>
                    Take Clone
                  </button>
                </div>
             `:Z}

             ${"flower"===r.state.toLowerCase()?j`
               <button class="md3-button primary" @click=${()=>i.onHarvest(r)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Se}"></path></svg>
                 Harvest
               </button>
             `:Z}

             ${"dry"===r.state.toLowerCase()?j`
               <button class="md3-button primary" @click=${()=>i.onFinishDrying(r)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${me}"></path></svg>
                 Finish Drying
               </button>
             `:Z}

             ${"clone"===r.state.toLowerCase()?j`
               <div style="display:contents;">
                  <select class="md3-input" style="width: auto; height: 40px; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 0 16px;" id="clone-target-select">
                    <option value="">Move to...</option>
                    ${Object.entries(t).map(([e,t])=>j`<option value="${e}">${t}</option>`)}
                  </select>
                  <button class="md3-button primary"
                    @click=${e=>{const t=e.currentTarget.previousElementSibling;t.value?i.onMoveClone(r,t.value):alert("Select a growspace")}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"}"></path></svg>
                    Move
                  </button>
               </div>
             `:Z}
          </div>

        </div>
      </ha-dialog>
    `}static renderStrainLibraryDialog(e,t){return e?.open?j`
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
    `:j``}static renderImportDialog(e,t){const i=e.importDialog?.replace||!1;return j`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 400px; max-width: 90vw; border-radius: 16px; padding: 24px; border: 1px solid var(--border-color); color: #fff; display: flex; flex-direction: column; gap: 20px;">

              <div style="display: flex; justify-content: space-between; align-items: center;">
                 <h2 style="margin: 0; font-size: 1.25rem;">Import Strains</h2>
                 <button class="sd-close-btn" @click=${()=>t.onImportDialogChange({open:!1})}>
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
                 </button>
              </div>

              <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">
                 Select a ZIP file containing your strain library export. You can either merge the new strains with your existing library or replace it entirely.
              </div>

              <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
                 <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                    <input type="radio" name="import_mode"
                           .checked=${!i}
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
                           .checked=${i}
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
     `}static renderImageSelector(e,t){const i=new Map;return e.strains.forEach(e=>{e.image&&(i.has(e.image)||i.set(e.image,[]),i.get(e.image).push({strain:e.strain,phenotype:e.phenotype||""}))}),j`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 80%; max-width: 800px; height: 80%; max-height: 600px; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color);">
              <div class="sd-header">
                 <h2 class="sd-title">Select from Library</h2>
                 <button class="sd-close-btn" @click=${()=>t.onToggleImageSelector(!1)}>
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
                 </button>
              </div>
              <div class="sd-content" style="overflow-y: auto;">
                 <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
                    ${[...i.entries()].map(([e,i])=>j`
                       <div style="aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; position: relative;"
                            @click=${()=>t.onSelectLibraryImage(e)}>
                          <img src="${e}" style="width: 100%; height: 100%; object-fit: cover;" />

                          <!-- Info Overlay -->
                          <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 8px; font-size: 0.75rem; color: white;">
                             ${i.map((e,t)=>j`
                                <div style="${t<i.length-1?"margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);":""}">
                                   <div style="font-weight: 700;">Strain: ${e.strain}</div>
                                   <div style="opacity: 0.9;">Pheno: ${e.phenotype||"N/A"}</div>
                                </div>
                             `)}
                          </div>

                          <div class="image-hover-overlay" style="position: absolute; top:0; left:0; right:0; bottom:0; background: rgba(34, 197, 94, 0.2); opacity: 0; transition: opacity 0.2s; pointer-events: none;"></div>
                       </div>
                    `)}
                 </div>
                 ${0===i.size?j`<p style="text-align: center; color: var(--text-secondary); margin-top: 40px;">No images found in library.</p>`:Z}
              </div>
           </div>
        </div>
     `}static renderCropOverlay(e,t){const i=e.editorState;if(!i.image)return Z;const r=i.image_crop_meta||{x:50,y:50,scale:1};return j`
       <div class="crop-overlay">
          <h3 style="color:white; margin-bottom:20px;">Adjust Image</h3>
          <div class="crop-viewport"
               @wheel=${e=>{e.preventDefault();const i=-.001*e.deltaY,a=Math.min(Math.max(r.scale+i,1),5);t.onEditorChange("image_crop_meta",{...r,scale:a})}}
               @mousedown=${e=>{const i=e.clientX,a=e.clientY,n=r.x,s=r.y,o=e=>{const o=(i-e.clientX)*(.2/r.scale),l=(a-e.clientY)*(.2/r.scale);let c=Math.min(Math.max(n+o,0),100),d=Math.min(Math.max(s+l,0),100);t.onEditorChange("image_crop_meta",{...r,x:c,y:d})},l=()=>{window.removeEventListener("mousemove",o),window.removeEventListener("mouseup",l)};window.addEventListener("mousemove",o),window.addEventListener("mouseup",l)}}
               @dragstart=${e=>e.preventDefault()}>
             <!--
                We are updating the CropMeta which maps to background-position %.
                background-position: 50% 50% is center. 0% 0% is left/top.
             -->
             <div style="width: 100%; height: 100%;
                 background-image: url('${i.image}');
                 background-size: ${100*r.scale}%;
                 background-position: ${r.x}% ${r.y}%;
                 background-repeat: no-repeat;
                 pointer-events: none;">
             </div>
          </div>

          <div class="crop-controls">
             <div style="display:flex; justify-content:space-between; color:#ccc; font-size:0.8rem;">
                <span>Zoom: ${(100*r.scale).toFixed(0)}%</span>
             </div>
             <input type="range" class="crop-slider" min="1" max="5" step="0.1"
                    .value=${r.scale}
                    @input=${e=>t.onEditorChange("image_crop_meta",{...r,scale:parseFloat(e.target.value)})} />

             <div style="display:flex; gap:12px; margin-top:12px;">
                <button class="md3-button tonal" style="flex:1" @click=${()=>t.onToggleCropMode(!1)}>Done</button>
             </div>
             <div style="text-align:center; font-size:0.8rem; color:#888; margin-top:8px;">
                Drag to pan • Scroll to zoom
             </div>
          </div>
       </div>
    `}static renderStrainBrowseView(e,t){const i=(e.searchQuery||"").toLowerCase(),r=e.strains.filter(e=>e.strain.toLowerCase().includes(i)||e.breeder&&e.breeder.toLowerCase().includes(i)||e.phenotype&&e.phenotype.toLowerCase().includes(i));return j`
      <div class="sd-header">
         <h2 class="sd-title">Strain Library</h2>
         <button class="sd-close-btn" @click=${t.onClose}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
         <!-- SEARCH & FILTER -->
         <div class="search-bar-container">
            <div class="search-input-wrapper">
               <svg viewBox="0 0 24 24"><path d="${Te}"></path></svg>
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
                  <svg style="width:16px;height:16px;fill:currentColor;cursor:pointer" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
               </div>
               <div class="filter-chip">
                  <span>Under 60 Days</span>
                  <svg style="width:16px;height:16px;fill:currentColor;cursor:pointer" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
               </div>
               <a class="clear-link">Clear All</a>
            </div>
         </div>

         <!-- GRID -->
         <div class="sd-grid">
            ${r.map(e=>this.renderStrainCard(e,t))}
         </div>

         ${0===r.length?j`
            <div style="text-align:center; padding: 40px; color: var(--text-secondary);">
               <svg style="width:48px;height:48px;fill:currentColor; opacity:0.5;" viewBox="0 0 24 24"><path d="${Te}"></path></svg>
               <p>No strains found matching "${i}"</p>
            </div>
         `:Z}
      </div>

      <div class="sd-footer">
         <button class="sd-btn secondary" @click=${t.onGetRecommendation}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ge}"></path></svg>
            Get Recommendation
         </button>
         <button class="sd-btn secondary" @click=${t.onOpenImportDialog}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${we}"></path></svg>
            Import Strains
         </button>
         <button class="sd-btn secondary" @click=${t.onExportStrains}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"}"></path></svg>
            Export Strains
         </button>
         <button class="sd-btn primary" @click=${()=>t.onSwitchView("editor")}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Le}"></path></svg>
            New Strain
         </button>
      </div>
    `}static getImgStyle(e){return e?`width: 100%; height: 100%; object-fit: cover; object-position: ${e.x}% ${e.y}%; transform: scale(${e.scale}); transform-origin: ${e.x}% ${e.y}%;`:"width: 100%; height: 100%; object-fit: cover;"}static renderStrainCard(e,t){let i=ke,r=e.type||"Unknown";const a=(e.type||"").toLowerCase();return a.includes("indica")?i=Re:a.includes("sativa")?i=Ge:a.includes("hybrid")?i=Pe:(a.includes("ruderalis")||a.includes("auto"))&&(i=ke),j`
       <div class="strain-card" @click=${()=>t.onSwitchView("editor",e)}>
          <div class="sc-thumb" style="overflow: hidden;">
             ${e.image?j`<img src="${e.image}" loading="lazy" alt="${e.strain}" style="${dn.getImgStyle(e.image_crop_meta)}" />`:j`<svg style="width:48px;height:48px;opacity:0.2;fill:currentColor;" viewBox="0 0 24 24"><path d="${me}"></path></svg>`}
             <div class="sc-actions">
                <button class="sc-action-btn" @click=${i=>{i.stopPropagation(),t.onRemoveStrain(e.key)}}>
                   <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${$e}"></path></svg>
                </button>
             </div>
          </div>
          <div class="sc-content">
             <h3 class="sc-title">${e.strain} ${e.phenotype?`(${e.phenotype})`:""}</h3>
             <div class="sc-type-row" style="flex-wrap: wrap;">
                <div style="display:flex; align-items:center; gap:6px; width: 100%;">
                   <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${i}"></path></svg>
                   <span>${r}</span>
                </div>
                ${a.includes("hybrid")?j`
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
                ${e.flowering_days_min?j`<span>Flowering: ${e.flowering_days_min}-${e.flowering_days_max||"?"} Days</span>`:Z}
                ${e.breeder?j`<span>Breeder: ${e.breeder}</span>`:Z}
             </div>
          </div>
       </div>
     `}static renderStrainEditorView(e,t){const i=e.editorState||{},r=!!i.strain&&e.strains.some(e=>e.strain===i.strain&&e.phenotype===i.phenotype),a=(e,i)=>t.onEditorChange(e,i),n=[...new Set(e.strains.map(e=>e.strain).filter(Boolean))].sort(),s=[...new Set(e.strains.map(e=>e.breeder).filter(Boolean))].sort();return j`
      <datalist id="strain-suggestions">
         ${n.map(e=>j`<option value="${e}"></option>`)}
      </datalist>
      <datalist id="breeder-suggestions">
         ${s.map(e=>j`<option value="${e}"></option>`)}
      </datalist>

      <div class="sd-header">
         <div style="display:flex; align-items:center; gap:16px;">
            <button class="sd-btn secondary" style="padding: 8px 12px;" @click=${()=>t.onSwitchView("browse")}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"}"></path></svg>
               Back
            </button>
            <h2 class="sd-title">${r?"Edit Strain":"Add New Strain"}</h2>
         </div>
         <button class="sd-close-btn" @click=${t.onClose}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
         <div class="editor-layout">
            <!-- LEFT COL: IDENTITY -->
            <div class="editor-col">
               <div class="photo-upload-area"
                    @click=${e=>{const t=e.target;t.closest(".crop-btn")||t.closest(".select-library-btn")||e.currentTarget.querySelector("input")?.click()}}
                    @dragover=${e=>{e.preventDefault(),e.dataTransfer.dropEffect="copy"}}
                    @drop=${e=>{e.preventDefault();const t=e.dataTransfer?.files[0];t&&ln.compressImage(t).then(e=>a("image",e)).catch(e=>console.error("Error compressing image:",e))}}>

                  <button class="select-library-btn" @click=${e=>{e.stopPropagation(),t.onToggleImageSelector(!0)}}>
                      <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ve}"></path></svg>
                      Select from Library
                  </button>

                  ${i.image?j`
                     ${i.image_crop_meta?j`<div style="width:100%; height:100%; border-radius:10px; ${dn.getCropStyle(i.image,i.image_crop_meta)}; background-repeat: no-repeat;"></div>`:j`<img src="${i.image}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" />`}

                     <div style="position:absolute; bottom:8px; right:8px; display:flex; gap:8px;">
                         <button class="crop-btn"
                                 style="background:rgba(0,0,0,0.6); border:none; padding:6px; border-radius:50%; cursor:pointer; color:white;"
                                 @click=${e=>{e.stopPropagation(),t.onToggleCropMode(!0)}}
                                 title="Crop Image">
                            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${_e}"></path></svg>
                         </button>
                         <div style="background:rgba(0,0,0,0.6); padding:6px; border-radius:50%; pointer-events:none;">
                            <svg style="width:18px;height:18px;fill:white;" viewBox="0 0 24 24"><path d="${Ee}"></path></svg>
                         </div>
                     </div>
                  `:j`
                     <svg style="width:48px;height:48px;fill:currentColor;margin-bottom:16px;" viewBox="0 0 24 24"><path d="${"M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z"}"></path></svg>
                     <span style="font-weight:600;">PHOTO UPLOAD AREA</span>
                     <span style="font-size:0.8rem; margin-top:4px;">(Drag & Drop or Click)</span>
                  `}
                  <input type="file" id="strain-image-upload" style="display:none" accept="image/*"
                         @change=${e=>{const t=e.target.files?.[0];t&&ln.compressImage(t).then(e=>a("image",e)).catch(e=>console.error("Error compressing image:",e))}} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Strain Name *</label>
                  <input type="text" class="sd-input" list="strain-suggestions" .value=${i.strain} @input=${e=>a("strain",e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Phenotype</label>
                  <input type="text" class="sd-input" placeholder="e.g. #1 (Optional)" .value=${i.phenotype} @input=${e=>a("phenotype",e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Breeder/Seedbank</label>
                  <input type="text" class="sd-input" list="breeder-suggestions" .value=${i.breeder} @input=${e=>a("breeder",e.target.value)} />
               </div>
            </div>

            <!-- RIGHT COL: GENETICS -->
            <div class="editor-col">
               <div class="sd-form-group">
                  <label class="sd-label">Type *</label>
                  <div class="type-selector-grid">
                     ${["Indica","Sativa","Hybrid","Ruderalis"].map(e=>{let t=ke;"Indica"===e&&(t=Re),"Sativa"===e&&(t=Ge),"Hybrid"===e&&(t=Pe);const r=(i.type||"").toLowerCase()===e.toLowerCase();return j`
                           <div class="type-option ${r?"active":""}"
                                @click=${()=>a("type",e)}>
                              <svg viewBox="0 0 24 24"><path d="${t}"></path></svg>
                              <span class="type-label">${e}</span>
                           </div>
                        `})}
                  </div>
               </div>

               ${"hybrid"===(i.type||"").toLowerCase()?j`
                  <div class="sd-form-group">
                     <label class="sd-label">Hybrid Composition (%)</label>
                     <div class="hg-container" style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">

                        <!-- Header / Inputs -->
                        <div class="hg-labels">
                           <div class="hg-input-label">
                              <span>Indica:</span>
                              <input class="hg-num-input" type="number" min="0" max="100"
                                 .value=${i.indica_percentage||0}
                                 @input=${e=>{let t=Math.floor(parseFloat(e.target.value))||0;t<0&&(t=0),t>100&&(t=100),a("indica_percentage",t),a("sativa_percentage",100-t)}} />
                              <span>%</span>
                           </div>

                           <div class="hg-input-label">
                              <span>Sativa:</span>
                              <input class="hg-num-input" type="number" min="0" max="100"
                                 .value=${i.sativa_percentage||0}
                                 @input=${e=>{let t=Math.floor(parseFloat(e.target.value))||0;t<0&&(t=0),t>100&&(t=100),a("sativa_percentage",t),a("indica_percentage",100-t)}} />
                              <span>%</span>
                           </div>
                        </div>

                        <!-- Bar -->
                        <div class="hg-bar-track"
                             @click=${e=>{const t=e.currentTarget.getBoundingClientRect(),i=e.clientX-t.left,r=t.width;let n=Math.round(i/r*100);n<0&&(n=0),n>100&&(n=100),a("indica_percentage",n),a("sativa_percentage",100-n)}}>
                           <div class="hg-bar-indica" style="width: ${i.indica_percentage||0}%"></div>
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
                     <input type="number" class="sd-input" placeholder="Min" .value=${i.flowering_min} @input=${e=>a("flowering_min",e.target.value)} />
                     <input type="number" class="sd-input" placeholder="Max" .value=${i.flowering_max} @input=${e=>a("flowering_max",e.target.value)} />
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Lineage</label>
                  <input type="text" class="sd-input" .value=${i.lineage} @input=${e=>a("lineage",e.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Sex</label>
                  <div style="display:flex; gap:20px; padding: 8px 0;">
                     ${["Feminized","Regular"].map(e=>j`
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white;">
                           <input type="radio" name="sex_radio"
                                  .checked=${i.sex===e}
                                  @change=${()=>a("sex",e)}
                                  style="accent-color: var(--accent-green); transform: scale(1.2);" />
                           ${e}
                        </label>
                     `)}
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Description</label>
                  <textarea class="sd-textarea" .value=${i.description} @input=${e=>a("description",e.target.value)}></textarea>
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
    `}static renderMD3TextInput(e,t,i){return j`
      <div class="md3-input-group">
        <label class="md3-label">${e}</label>
        <input
          type="text"
          class="md3-input"
          .value=${t}
          @input=${e=>i(e.target.value)}
        />
      </div>
    `}static renderMD3SelectInput(e,t,i,r){return j`
      <div class="md3-input-group">
        <label class="md3-label">${e}</label>
        <select
          class="md3-input"
          .value=${t}
          @change=${e=>r(e.target.value)}
        >
          <option value="">Select...</option>
          ${i.map(e=>j`<option value="${e}" ?selected=${e===t}>${e}</option>`)}
        </select>
      </div>
    `}static renderMD3NumberInput(e,t,i){return j`
      <div class="md3-input-group">
        <label class="md3-label">${e}</label>
        <input
          type="number"
          class="md3-input"
          min="1"
          .value=${t}
          @input=${e=>i(e.target.value)}
        />
      </div>
    `}static renderMD3DateTimeInput(e,t,i){const r=ln.toDateTimeLocal(t);return j`
      <div class="md3-input-group">
        <label class="md3-label">${e}</label>
        <input
          type="datetime-local"
          class="md3-input"
          .value=${r}
          @input=${e=>i(e.target.value)}
        />
      </div>
    `}static renderMD3DateInput(e,t,i){const r=t?t.split("T")[0]:"";return j`
      <div class="md3-input-group">
        <label class="md3-label">${e}</label>
        <input
          type="date"
          class="md3-input"
          .value=${r}
          @input=${e=>i(e.target.value)}
        />
      </div>
    `}static renderTextInput(e,t,i){return j`
      <div class="form-group">
        <label>${e}</label>
        <input 
          type="text" 
          class="form-input"
          .value=${t}
          @input=${e=>i(e.target.value)}
        />
      </div>
    `}static renderNumberInput(e,t,i){return j`
      <div class="form-group">
        <label>${e}</label>
        <input 
          type="number" 
          class="form-input"
          min="1"
          .value=${t}
          @input=${e=>i(e.target.value)}
        />
      </div>
    `}static renderDateTimeInput(e,t,i,r){return j`
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
          .value=${i}
          @input=${e=>r(e.target.value)}
        />
      </div>
    `}static renderPlantStatsMD3(e){return e.attributes?.veg_days||e.attributes?.flower_days||e.attributes?.dry_days||e.attributes?.cure_days?j`
      <div class="detail-card">
        <h3>Current Progress</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
           ${e.attributes?.veg_days?j`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-veg);">${e.attributes.veg_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Veg Days</span>
             </div>
           `:""}
           ${e.attributes?.flower_days?j`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-flower);">${e.attributes.flower_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Flower Days</span>
             </div>
           `:""}
           ${e.attributes?.dry_days?j`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-dry);">${e.attributes.dry_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Drying Days</span>
             </div>
           `:""}
           ${e.attributes?.cure_days?j`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-cure);">${e.attributes.cure_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Curing Days</span>
             </div>
           `:""}
        </div>
      </div>
    `:j``}static renderPlantStats(e){return this.renderPlantStatsMD3(e)}static renderConfigDialog(e,t,i){if(!e?.open)return j``;const r=e.currentTab;return j`
      <ha-dialog
        open
        @closed=${i.onClose}
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
              <button class="md3-button text" @click=${i.onClose} style="min-width: auto; padding: 8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
              </button>
           </div>

           <!-- Tabs -->
           <div class="config-tabs">
              <div class="config-tab ${"add_growspace"===r?"active":""}"
                   @click=${()=>i.onSwitchTab("add_growspace")}>
                 <svg viewBox="0 0 24 24"><path d="${Ve}"></path></svg>
                 Add Growspace
              </div>
              <div class="config-tab ${"environment"===r?"active":""}"
                   @click=${()=>i.onSwitchTab("environment")}>
                 <svg viewBox="0 0 24 24"><path d="${Ne}"></path></svg>
                 Environment
              </div>
              <div class="config-tab ${"global"===r?"active":""}"
                   @click=${()=>i.onSwitchTab("global")}>
                 <svg viewBox="0 0 24 24"><path d="${"M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"}"></path></svg>
                 Global
              </div>
           </div>

           <!-- Content -->
           <div class="config-content">
              ${"add_growspace"===r?this.renderAddGrowspaceTab(e,i):Z}
              ${"environment"===r?this.renderEnvironmentTab(e,t,i):Z}
              ${"global"===r?this.renderGlobalTab(e,i):Z}
           </div>

           <!-- Actions -->
           <div class="config-actions">
              <button class="md3-button tonal" @click=${i.onClose}>Cancel</button>
              ${"add_growspace"===r?j`
                 <button class="md3-button primary" @click=${i.onAddGrowspaceSubmit}>Add Growspace</button>
              `:Z}
              ${"environment"===r?j`
                 <button class="md3-button primary" @click=${i.onEnvSubmit}>Save Sensors</button>
              `:Z}
              ${"global"===r?j`
                 <button class="md3-button primary" @click=${i.onGlobalSubmit}>Save Global</button>
              `:Z}
           </div>
        </div>
      </ha-dialog>
    `}static renderAddGrowspaceTab(e,t){const i=e.addGrowspaceData;return j`
      <div style="display:flex; flex-direction:column; gap:20px;">
         <div class="detail-card">
            <h3>New Growspace Details</h3>
            ${this.renderMD3TextInput("Growspace Name",i.name,e=>t.onAddGrowspaceChange("name",e))}
            <div style="display:flex; gap:16px;">
               ${this.renderMD3NumberInput("Rows",i.rows,e=>t.onAddGrowspaceChange("rows",parseInt(e)))}
               ${this.renderMD3NumberInput("Plants per Row",i.plants_per_row,e=>t.onAddGrowspaceChange("plants_per_row",parseInt(e)))}
            </div>
            ${this.renderMD3TextInput("Notification Service (Optional)",i.notification_service,e=>t.onAddGrowspaceChange("notification_service",e))}
         </div>
      </div>
    `}static renderEnvironmentTab(e,t,i){const r=e.environmentData,a=Object.entries(t).map(([e,t])=>({id:e,name:t}));return j`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Select Target</h3>
             <div class="md3-input-group">
                <label class="md3-label">Growspace</label>
                <select class="md3-input" .value=${r.selectedGrowspaceId} @change=${e=>i.onEnvChange("selectedGrowspaceId",e.target.value)}>
                   <option value="">Select...</option>
                   ${a.map(e=>j`<option value="${e.id}">${e.name}</option>`)}
                </select>
             </div>
          </div>

          <div class="detail-card">
             <h3>Sensors</h3>
             ${this.renderMD3TextInput("Temperature Sensor ID",r.temp_sensor,e=>i.onEnvChange("temp_sensor",e))}
             ${this.renderMD3TextInput("Humidity Sensor ID",r.humidity_sensor,e=>i.onEnvChange("humidity_sensor",e))}
             ${this.renderMD3TextInput("VPD Sensor ID",r.vpd_sensor,e=>i.onEnvChange("vpd_sensor",e))}
          </div>

          <div class="detail-card">
             <h3>Optional</h3>
             ${this.renderMD3TextInput("CO2 Sensor ID",r.co2_sensor,e=>i.onEnvChange("co2_sensor",e))}
             ${this.renderMD3TextInput("Light Sensor/State ID",r.light_sensor,e=>i.onEnvChange("light_sensor",e))}
             ${this.renderMD3TextInput("Fan Switch ID",r.fan_switch,e=>i.onEnvChange("fan_switch",e))}
          </div>
       </div>
    `}static renderGlobalTab(e,t){const i=e.globalData;return j`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Global Environment</h3>
             ${this.renderMD3TextInput("Weather Entity ID",i.weather_entity,e=>t.onGlobalChange("weather_entity",e))}
          </div>
          <div class="detail-card">
             <h3>Lung Room</h3>
             ${this.renderMD3TextInput("Lung Room Temp Sensor",i.lung_room_temp,e=>t.onGlobalChange("lung_room_temp",e))}
             ${this.renderMD3TextInput("Lung Room Humidity Sensor",i.lung_room_humidity,e=>t.onGlobalChange("lung_room_humidity",e))}
          </div>
       </div>
    `}static renderGrowMasterDialog(e,t,i,r){if(!e?.open)return j``;const a=t?"#FF9800":"#4CAF50",n=i?`Ask the ${i}`:"Ask the Grow Master";return j`
      <ha-dialog
        open
        @closed=${r.onClose}
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
                 <h2 style="margin:0; font-size:1.25rem;">${n}</h2>
                 <div style="font-size:0.8rem; color:var(--secondary-text-color); margin-top:4px;">
                    ${t?"Warning: Plant Stress Detected":"All systems normal"}
                 </div>
              </div>
              <button class="md3-button text" @click=${r.onClose} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
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
                    @input=${e=>r.onQueryChange(e.target.value)}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <button
                    class="md3-button tonal"
                    @click=${r.onAnalyzeAll}
                    ?disabled=${e.isLoading}
                    style="opacity: ${e.isLoading?.7:1}"
                 >
                    Analyze All
                 </button>
                 <button
                    class="md3-button primary"
                    @click=${r.onAnalyze}
                    ?disabled=${e.isLoading}
                    style="opacity: ${e.isLoading?.7:1}"
                 >
                    ${e.isLoading?"Analyzing...":"Analyze Environment"}
                 </button>
              </div>

              <!-- Response Area -->
              ${e.isLoading?j`
                 <div class="gm-loading">
                    <svg class="spinner" viewBox="0 0 24 24"><path d="${Me}" fill="currentColor"></path></svg>
                    <span>Consulting the archives...</span>
                 </div>
              `:Z}

              ${!e.isLoading&&e.response?j`
                 <div class="gm-response-box">
                    ${e.response}
                 </div>
              `:Z}
           </div>
        </div>
      </ha-dialog>
    `}static renderStrainRecommendationDialog(e,t){return e?.open?j`
      <ha-dialog
        open
        @closed=${t.onClose}
        hideActions
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="gm-container">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: #4CAF50">
                 <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ge}"></path></svg>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">Get Strain Recommendation</h2>
              </div>
              <button class="md3-button text" @click=${t.onClose} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ye}"></path></svg>
              </button>
           </div>

           <div class="gm-content">
              <!-- Input Area -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Preferences</label>
                 <textarea
                    class="sd-textarea"
                    placeholder="e.g., something fruity and good for daytime use..."
                    .value=${e.userQuery}
                    @input=${e=>t.onQueryChange(e.target.value)}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <button
                    class="md3-button tonal"
                    @click=${t.onClose}
                 >
                    OK
                 </button>
                 <button
                    class="md3-button primary"
                    @click=${t.onGetRecommendation}
                    ?disabled=${e.isLoading}
                    style="opacity: ${e.isLoading?.7:1}"
                 >
                    ${e.isLoading?"Getting Recommendation...":"Get Recommendation"}
                 </button>
              </div>

              ${e.isLoading?j`
                 <div class="gm-loading">
                    <svg class="spinner" viewBox="0 0 24 24"><path d="${Me}" fill="currentColor"></path></svg>
                    <span>Consulting the archives...</span>
                 </div>
              `:Z}

              ${!e.isLoading&&e.response?j`
                 <div class="gm-response-box">
                    ${e.response}
                 </div>
              `:Z}
           </div>
        </div>
      </ha-dialog>
    `:j``}static renderScheduleSection(e,t,i,r,a,n,s){const o="irrigation"===n?a.onAddIrrigationTime:a.onAddDrainTime,l="irrigation"===n?a.onRemoveIrrigationTime:a.onRemoveDrainTime,c="irrigation"===n?a.onStartAddingIrrigationTime:a.onStartAddingDrainTime,d="irrigation"===n?a.onCancelAddingIrrigationTime:a.onCancelAddingDrainTime,p="irrigation"===n?a.onConfirmAddIrrigationTime:a.onConfirmAddDrainTime,h="irrigation"===n?a.onIrrigationTimeInputChange:a.onDrainTimeInputChange,u="irrigation"===n?r.adding_irrigation_time:r.adding_drain_time;return j`
         <div class="detail-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
               <h3 style="margin: 0;">${e}</h3>
               <button
                  @click=${o}
                  class="md3-button primary"
                  style="background: ${s};"
               >
                  <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Le}"></path></svg>
                  ADD TIME
               </button>
            </div>

            <div
               class="${n}-time-bar"
               @click=${e=>{const t=e.currentTarget.getBoundingClientRect(),i=e.clientX-t.left;c(i,t.width)}}
               style="position: relative; height: 80px; background: rgba(0,0,0,0.3); border-radius: 8px; cursor: crosshair; border: 2px solid ${s}40;"
            >
               ${Array.from({length:25},(e,t)=>t).map(e=>j`
                  <div style="position: absolute; left: ${e/24*100}%; top: 0; bottom: 0; border-left: 1px solid ${e%6==0?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.05)"}; pointer-events: none;">
                     ${e%3==0?j`
                        <span style="position: absolute; bottom: -22px; left: -12px; font-size: 0.7rem; color: var(--secondary-text-color);">${e.toString().padStart(2,"0")}:00</span>
                     `:""}
                  </div>
               `)}

               ${t.map(e=>{const[t,r]=e.time.split(":").map(Number);return j`
                     <div
                        @click=${t=>{t.stopPropagation(),confirm(`Remove ${n} time ${e.time}?`)&&l(e.time)}}
                        style="position: absolute; left: ${(t+r/60)/24*100}%; top: 10%; bottom: 10%; width: 4px; background: ${s}; cursor: pointer; box-shadow: 0 0 8px ${s}; border-radius: 2px;"
                        title="${e.time} | Duration: ${e.duration||i}seconds"
                     >
                        <div style="position: absolute; left: 8px; top: -24px; background: ${s}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                           ${e.time} | ${e.duration||i}seconds
                        </div>
                     </div>
                  `})}
            </div>

            <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--secondary-text-color);">
               <span>00:00</span>
               <span>06:00</span>
               <span>12:00</span>
               <span>18:00</span>
               <span>24:00</span>
            </div>

            ${u?j`
               <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;" @click=${d}>
                  <div class="detail-card" style="max-width: 400px; margin: 0;" @click=${e=>e.stopPropagation()}>
                     <h3>Add ${e} Time</h3>

                     <div class="md3-input-group">
                        <label class="md3-label">Time</label>
                        <input
                           type="time"
                           class="md3-input"
                           .value=${u.time}
                           @input=${e=>h("time",e.target.value)}
                        />
                     </div>

                     <div class="md3-input-group">
                        <label class="md3-label">Duration (minutes)</label>
                        <input
                           type="number"
                           class="md3-input"
                           .value=${u.duration.toString()}
                           @input=${e=>{const t=parseInt(e.target.value);isNaN(t)||h("duration",t)}}
                           min="1"
                        />
                     </div>

                     <div class="button-group">
                        <button class="md3-button tonal" @click=${d}>
                           Cancel
                        </button>
                        <button
                           class="md3-button primary"
                           @click=${()=>p(u.time,u.duration)}
                           style="background: ${s};"
                        >
                           Add Schedule
                        </button>
                     </div>
                  </div>
               </div>
            `:""}
         </div>
      `}static renderIrrigationDialog(e,t){if(!e?.open)return Z;const i="#2196F3",r=dn.parseScheduleString(e.irrigation_times),a=dn.parseScheduleString(e.drain_times);return j`
         <ha-dialog
            open
            @closed=${t.onClose}
            hideActions
            .scrimClickAction=${""}
            .escapeKeyAction=${""}
         >
            <div class="glass-dialog-container" style="--stage-color: ${i}; max-width: 1000px; max-height: 90vh; overflow-y: auto;">

               <div class="dialog-header">
                  <div class="dialog-icon" style="background: ${i}30; color: ${i};">
                     <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                        <path d="${ze}"></path>
                     </svg>
                  </div>
                  <div class="dialog-title-group">
                     <h2 class="dialog-title">Irrigation Management</h2>
                     <div class="dialog-subtitle">${e.growspace_name}</div>
                  </div>
                  <button class="md3-button text" @click=${t.onClose} style="min-width: auto; padding: 8px;">
                     <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                        <path d="${ye}"></path>
                     </svg>
                  </button>
               </div>

               <div class="dialog-body" style="padding: 0; background: transparent;">
                  ${this.renderScheduleSection("Irrigation Schedule",r,e.irrigation_duration,e,t,"irrigation",i)}

                           ${this.renderScheduleSection("Drain Schedule",a,e.drain_duration,e,t,"drain","#FF9800")}

               </div>

               <div class="button-group">
                  <button class="md3-button tonal" @click=${t.onClose}>
                     Close
                  </button>
               </div>

            </div>
         </ha-dialog>
      `}}let pn=class extends oe{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._optimisticDeletedPlantIds=new Set,this._strainLibraryDialog=null,this._configDialog=null,this._growMasterDialog=null,this._strainRecommendationDialog=null,this._irrigationDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1,this._strainLibrary=[],this._historyData=null,this._activeEnvGraphs=new Set,this._graphRanges={},this._tooltip=null,this._menuOpen=!1,this._isEditMode=!1,this._selectedPlants=new Set,this._focusedPlantIndex=-1,this._handleDocumentClick=e=>{if(this._menuOpen){const t=e.composedPath(),i=this.shadowRoot?.querySelector(".menu-container");i&&!t.includes(i)&&(this._menuOpen=!1)}},this._handleTakeClone=e=>{const t=e.attributes?.plant_id||e.entity_id.replace("sensor.","");this.hass.callService("growspace_manager","take_clone",{mother_plant_id:t}).then(()=>{console.log(`Clone taken from ${e.attributes?.strain||"plant"}`)}).catch(e=>{console.error(`Failed to take clone: ${e.message}`)})},this.clonePlant=(e,t)=>{const i=e.attributes?.plant_id||e.entity_id.replace("sensor.",""),r=t;this.hass.callService("growspace_manager","take_clone",{mother_plant_id:i,num_clones:r}).then(()=>{console.log(`Clone taken from ${e.attributes?.strain||"plant"}`)}).catch(e=>{console.error(`Failed to take clone: ${e.message}`)})}}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this._handleDocumentClick)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this._handleDocumentClick)}firstUpdated(){this.dataService=new cn(this.hass),this.initializeSelectedDevice(),this._fetchHistory(),this._fetchStrainLibrary()}updated(e){if(super.updated(e),e.has("selectedDevice")){const e=this.selectedDevice&&this._graphRanges[this.selectedDevice]||"24h";this._fetchHistory(e)}}async _fetchHistory(e="24h"){if(!this.hass||!this.selectedDevice)return;const t=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);if(!t)return;let i=t.name.toLowerCase().replace(/\s+/g,"_");t.overview_entity_id&&(i=t.overview_entity_id.replace("sensor.",""));let r=`binary_sensor.${i}_optimal_conditions`;"cure"===i?r="binary_sensor.cure_optimal_curing":"dry"===i&&(r="binary_sensor.dry_optimal_drying");const a=new Date;let n=new Date(a.getTime()-864e5);switch(e){case"1h":n=new Date(a.getTime()-36e5);break;case"6h":n=new Date(a.getTime()-216e5);break;case"7d":n=new Date(a.getTime()-6048e5)}try{const e=await this.dataService.getHistory(r,n,a);this._historyData=e}catch(e){console.error("Failed to fetch history",e)}}async _fetchStrainLibrary(){if(!this.hass)return;const e=localStorage.getItem("growspace_strain_library");if(e)try{this._strainLibrary=JSON.parse(e),this.requestUpdate()}catch(e){console.warn("Failed to parse cached strain library",e)}try{const e=await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"get_strain_library",service_data:{},return_response:!0}),t=e?.response||{},i=[];Object.entries(t).forEach(([e,t])=>{const r=t.meta||{},a=t.phenotypes||{};Object.entries(a).forEach(([t,a])=>{i.push({strain:e,phenotype:t,key:`${e}|${t}`,breeder:r.breeder,type:r.type,lineage:r.lineage,sex:r.sex,sativa_percentage:r.sativa_percentage,indica_percentage:r.indica_percentage,description:a.description,image:a.image_path,image_crop_meta:a.image_crop_meta,flowering_days_min:a.flower_days_min,flowering_days_max:a.flower_days_max})})}),this._strainLibrary=i,localStorage.setItem("growspace_strain_library",JSON.stringify(i))}catch(e){console.error("Failed to fetch strain library for grid:",e)}}initializeSelectedDevice(){const e=this.dataService.getGrowspaceDevices();if(e.length&&!this.selectedDevice){if(this._config?.default_growspace){const t=e.find(e=>e.device_id===this._config.default_growspace||e.name===this._config.default_growspace);if(t)return void(this.selectedDevice=t.device_id)}this.selectedDevice=e[0].device_id}}static async getConfigElement(){await Promise.resolve().then(function(){return un});return document.createElement("growspace-manager-card-editor")}static getStubConfig(){return{default_growspace:"4x4",compact:!0}}setConfig(e){if(!e)throw new Error("Invalid configuration");this._config=e,void 0!==this._config.compact&&(this._isCompactView=this._config.compact)}getCardSize(){return 4}_handleDeviceChange(e){const t=e.target;this.selectedDevice=t.value}_togglePlantSelection(e){const t=e.attributes.plant_id;if(!t)return;const i=new Set(this._selectedPlants);i.has(t)?i.delete(t):i.add(t),this._selectedPlants=i,this.requestUpdate()}_selectAllPlants(){const e=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);if(!e)return;const t=new Set;e.plants?.forEach(e=>{const i=e.attributes.plant_id;i&&!this._optimisticDeletedPlantIds.has(i)&&t.add(i)}),this._selectedPlants=t,this.requestUpdate()}_deselectAllPlants(){this._selectedPlants=new Set,this.requestUpdate()}_exitEditMode(){this._isEditMode=!1,this._selectedPlants=new Set,this.requestUpdate()}_toggleEditMode(){this._isEditMode=!this._isEditMode,this._isEditMode||(this._selectedPlants=new Set),this._menuOpen=!1,this.requestUpdate()}_handleKeyboardNav(e){if(!this.selectedDevice)return;const t=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);if(!t)return;const i=t.plants.filter(e=>!this._optimisticDeletedPlantIds.has(e.attributes.plant_id||""));0!==i.length&&("ArrowRight"===e.key?(this._focusedPlantIndex=(this._focusedPlantIndex+1)%i.length,this._focusPlantByIndex(this._focusedPlantIndex)):"ArrowLeft"===e.key?(this._focusedPlantIndex=(this._focusedPlantIndex-1+i.length)%i.length,this._focusPlantByIndex(this._focusedPlantIndex)):"Enter"!==e.key&&" "!==e.key||this._focusedPlantIndex>=0&&this._focusedPlantIndex<i.length&&this._handlePlantClick(i[this._focusedPlantIndex]))}_focusPlantByIndex(e){const t=this.shadowRoot?.querySelector(".growspace-grid");if(t){const i=t.querySelectorAll(".plant-card-rich");i[e]&&i[e].focus()}}_announceToScreenReader(e){const t=this.shadowRoot?.querySelector(".sr-only-announcer");t&&(t.textContent=e)}_handlePlantClick(e){if(this._isEditMode&&this._selectedPlants.size>0){const t=e.attributes.plant_id;t&&!this._selectedPlants.has(t)&&this._togglePlantSelection(e),this._openPlantOverviewDialog(e,Array.from(this._selectedPlants))}else this._openPlantOverviewDialog(e)}_openPlantOverviewDialog(e,t){this._plantOverviewDialog={open:!0,plant:e,editedAttributes:{...e.attributes},activeTab:"dashboard",selectedPlantIds:t}}getHaDateTimeString(){const e=this.hass.config.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone;return nn.now().setZone(e).toFormat("yyyy-LL-dd'T'HH:mm")}_openAddPlantDialog(e,t){const i=this.dataService.getStrainLibrary(),r=i.length>0?i[0].strain:"",a=i.length>0?i[0].phenotype:"";this._addPlantDialog={open:!0,row:e,col:t,strain:r,phenotype:a,veg_start:"",flower_start:"",seedling_start:"",mother_start:"",clone_start:"",dry_start:"",cure_start:""}}async _confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const{row:e,col:t,strain:i,phenotype:r,veg_start:a,flower_start:n,seedling_start:s,mother_start:o,clone_start:l,dry_start:c,cure_start:d}=this._addPlantDialog;try{const a={growspace_id:this.selectedDevice,row:e+1,col:t+1,strain:i,phenotype:r};["veg_start","flower_start","seedling_start","mother_start","clone_start","dry_start","cure_start"].forEach(e=>{const t=this._addPlantDialog[e];if(t)if(10!==t.length||t.includes("T"))a[e]=t;else{const i=(new Date).toTimeString().split(" ")[0];a[e]=`${t}T${i}`}}),console.log("Adding plant to growspace:",this.selectedDevice,a),console.log("Adding plant:",a),await this.dataService.addPlant(a),this._addPlantDialog=null}catch(e){console.error("Error adding plant:",e)}}async _updatePlant(){if(!this._plantOverviewDialog)return;const{plant:e,editedAttributes:t,selectedPlantIds:i}=this._plantOverviewDialog,r=e.attributes?.plant_id||e.entity_id.replace("sensor.",""),a=i&&i.length>0?i:[r],n={},s=["seedling_start","mother_start","clone_start","veg_start","flower_start","dry_start","cure_start"];["strain","phenotype","row","col",...s].forEach(e=>{if(void 0!==t[e])if(s.includes(e)){const i=String(t[e]||"");if(i&&"null"!==i&&"undefined"!==i){const t=ln.formatDateForBackend(i);t&&(n[e]=t)}else n[e]=null}else null!==t[e]&&(n[e]=t[e])});try{const e=a.map(e=>{const t={...n,plant_id:e};return a.length>1&&(delete t.row,delete t.col),this.dataService.updatePlant(t)});await Promise.all(e),this._plantOverviewDialog=null,this._isEditMode&&(this._selectedPlants=new Set,this._isEditMode=!1)}catch(e){console.error("Error updating plant(s):",e)}}async _handleDeletePlant(e){if(confirm("Are you sure you want to delete this plant?")){if(this.selectedDevice){const t=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);t&&(t.plants=t.plants.filter(t=>(t.attributes.plant_id||t.entity_id.replace("sensor.",""))!==e),this.requestUpdate())}this._plantOverviewDialog=null;try{await this.dataService.removePlant(e)}catch(e){console.error("Error deleting plant:",e),alert("Failed to delete plant. It may reappear on refresh."),this.updateGrid()}}}async _movePlantToNextStage(e){if(!this._plantOverviewDialog?.plant)return void console.error("No plant found in overview dialog");const t=this._plantOverviewDialog.plant,i=t.attributes?.stage;let r="";const a=new Set(["mother","flower","dry","cure"]);if(i&&a.has(i)){"flower"===i?r="dry":"dry"===i?r="cure":"mother"===i?r="clone":(console.error("Unknown stage, cannot move plant",r),r="error");try{const e=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.dataService.harvestPlant(e,r),this._plantOverviewDialog=null}catch(e){console.error("Error moving plant to next stage:",e)}}else alert("Plant must be in mother or flower or dry or cure stage to move. stage is "+i)}async _harvestPlant(e){await this._movePlantToNextStage(e)}async _finishDryingPlant(e){await this._movePlantToNextStage(e)}async _openStrainLibraryDialog(){let e;try{e=await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"get_strain_library",service_data:{},return_response:!0})}catch(e){console.error("Failed to fetch strain library:",e)}const t=e?.response||{},i=[];Object.entries(t).forEach(([e,t])=>{const r=t.meta||{},a=t.phenotypes||{};Object.entries(a).forEach(([t,a])=>{i.push({strain:e,phenotype:t,key:`${e}|${t}`,breeder:r.breeder,type:r.type,lineage:r.lineage,sex:r.sex,sativa_percentage:r.sativa_percentage,indica_percentage:r.indica_percentage,description:a.description,image:a.image_path,image_crop_meta:a.image_crop_meta,flowering_days_min:a.flower_days_min,flowering_days_max:a.flower_days_max})})}),this._strainLibraryDialog={open:!0,view:"browse",strains:i,searchQuery:"",editorState:this._createEmptyEditorState()}}_createEmptyEditorState(){return{strain:"",phenotype:"",breeder:"",type:"",flowering_min:"",flowering_max:"",lineage:"",sex:"",description:"",image:"",image_crop_meta:void 0}}_switchStrainView(e,t){this._strainLibraryDialog&&(this._strainLibraryDialog.view=e,this._strainLibraryDialog.isCropping=!1,"editor"===e&&(this._strainLibraryDialog.editorState=t?{strain:t.strain,phenotype:t.phenotype||"",breeder:t.breeder||"",type:t.type||"",flowering_min:t.flowering_days_min?.toString()||"",flowering_max:t.flowering_days_max?.toString()||"",lineage:t.lineage||"",sex:t.sex||"",description:t.description||"",image:t.image||"",image_crop_meta:t.image_crop_meta,sativa_percentage:t.sativa_percentage,indica_percentage:t.indica_percentage}:this._createEmptyEditorState()),this.requestUpdate())}_openIrrigationDialog(){const e=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);if(!e||!e.overview_entity_id)return;const t=this.hass.states[e.overview_entity_id],i=t?.attributes||{},r=i.irrigation_times||[],a=i.drain_times||[],n=i.irrigation_pump_entity||"",s=i.drain_pump_entity||"",o=i.irrigation_duration||3,l=i.drain_duration||3;this._irrigationDialog={open:!0,growspace_id:e.device_id,growspace_name:e.name,irrigation_pump_entity:n,drain_pump_entity:s,irrigation_duration:o,drain_duration:l,irrigation_times:r,drain_times:a}}async _saveIrrigationPumpSettings(){if(this._irrigationDialog)try{await this.hass.callService("growspace_manager","set_irrigation_settings",{growspace_id:this._irrigationDialog.growspace_id,irrigation_pump_entity:this._irrigationDialog.irrigation_pump_entity,drain_pump_entity:this._irrigationDialog.drain_pump_entity,irrigation_duration:this._irrigationDialog.irrigation_duration,drain_duration:this._irrigationDialog.drain_duration}),console.log("Irrigation pump settings saved")}catch(e){console.error("Error saving irrigation pump settings:",e)}}async _addIrrigationTime(e,t){if(this._irrigationDialog)try{await this.hass.callService("growspace_manager","add_irrigation_time",{growspace_id:this._irrigationDialog.growspace_id,time:e,...void 0!==t&&{duration:t}}),this._irrigationDialog.irrigation_times.push({time:e,duration:t}),this._irrigationDialog.adding_irrigation_time=void 0,this.requestUpdate(),console.log("Irrigation time added:",e)}catch(e){console.error("Error adding irrigation time:",e)}}async _removeIrrigationTime(e){if(this._irrigationDialog)try{await this.hass.callService("growspace_manager","remove_irrigation_time",{growspace_id:this._irrigationDialog.growspace_id,time:e}),this._irrigationDialog.irrigation_times=this._irrigationDialog.irrigation_times.filter(t=>t.time!==e),this.requestUpdate(),console.log("Irrigation time removed:",e)}catch(e){console.error("Error removing irrigation time:",e)}}async _addDrainTime(e,t){if(this._irrigationDialog)try{await this.hass.callService("growspace_manager","add_drain_time",{growspace_id:this._irrigationDialog.growspace_id,time:e,...void 0!==t&&{duration:t}}),this._irrigationDialog.drain_times.push({time:e,duration:t}),this._irrigationDialog.adding_drain_time=void 0,this.requestUpdate(),console.log("Drain time added:",e)}catch(e){console.error("Error adding drain time:",e)}}async _removeDrainTime(e){if(this._irrigationDialog)try{await this.hass.callService("growspace_manager","remove_drain_time",{growspace_id:this._irrigationDialog.growspace_id,time:e}),this._irrigationDialog.drain_times=this._irrigationDialog.drain_times.filter(t=>t.time!==e),this.requestUpdate(),console.log("Drain time removed:",e)}catch(e){console.error("Error removing drain time:",e)}}_startAddingIrrigationTime(e,t){if(!this._irrigationDialog)return;const i=Math.floor(e/t*24),r=Math.floor(60*(e/t*24-i)),a=`${i.toString().padStart(2,"0")}:${r.toString().padStart(2,"0")}`;this._irrigationDialog.adding_irrigation_time={time:a,duration:this._irrigationDialog.irrigation_duration},this.requestUpdate()}_startAddingDrainTime(e,t){if(!this._irrigationDialog)return;const i=Math.floor(e/t*24),r=Math.floor(60*(e/t*24-i)),a=`${i.toString().padStart(2,"0")}:${r.toString().padStart(2,"0")}`;this._irrigationDialog.adding_drain_time={time:a,duration:this._irrigationDialog.drain_duration},this.requestUpdate()}_handleStrainEditorChange(e,t){this._strainLibraryDialog&&this._strainLibraryDialog.editorState&&(this._strainLibraryDialog.editorState[e]=t,this.requestUpdate())}_toggleCropMode(e){this._strainLibraryDialog&&(this._strainLibraryDialog.isCropping=e,this.requestUpdate())}_toggleImageSelector(e){this._strainLibraryDialog&&(this._strainLibraryDialog.isImageSelectorOpen=e,this.requestUpdate())}_handleSelectLibraryImage(e){if(this._strainLibraryDialog&&this._strainLibraryDialog.editorState){this._strainLibraryDialog.editorState.image=e;const t=this._strainLibraryDialog.strains.find(t=>t.image===e&&!!t.image_crop_meta);t&&t.image_crop_meta?this._strainLibraryDialog.editorState.image_crop_meta={...t.image_crop_meta}:this._strainLibraryDialog.editorState.image_crop_meta=void 0,this._strainLibraryDialog.isImageSelectorOpen=!1,this.requestUpdate()}}_toggleEnvGraph(e){const t=new Set(this._activeEnvGraphs);t.has(e)?t.delete(e):t.add(e),this._activeEnvGraphs=t,this.requestUpdate()}_handleGraphHover(e,t,i,r,a){const n=e.clientX-r.left,s=r.width,o="1h"===(this._graphRanges[t]||"24h")?36e5:864e5,l=(new Date).getTime()-o+n/s*o;let c=i[0],d=Math.abs(i[0].time-l);for(let e=1;e<i.length;e++){const t=Math.abs(i[e].time-l);t<d&&(d=t,c=i[e])}const p=new Date(c.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});let h=`${c.value} ${a}`;"state"===a&&(h="irrigation"===t||"drain"===t?1===c.value?`ON (${c.meta?.duration||"Unknown"})`:"OFF":1===c.value?"Optimal Conditions":c.meta||"Not Optimal"),this._tooltip={id:t,x:n,time:p,value:h}}renderEnvGraph(e,t,i,r,a="line",n=Te){const s=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);if(!s)return j``;let o=s.name.toLowerCase().replace(/\s+/g,"_");s.overview_entity_id&&(o=s.overview_entity_id.replace("sensor.",""));let l=`binary_sensor.${o}_optimal_conditions`;"cure"===o?l="binary_sensor.cure_optimal_curing":"dry"===o&&(l="binary_sensor.dry_optimal_drying");const c=this.hass.states[l],d=s.overview_entity_id?this.hass.states[s.overview_entity_id]:void 0,p=this._graphRanges[this.selectedDevice||""]||"24h";let h=864e5;"1h"===p?h=36e5:"6h"===p?h=216e5:"7d"===p&&(h=6048e5);const u=new Date,g=new Date(u.getTime()-h);let m=[];if("irrigation"===e||"drain"===e){const t="irrigation"===e?d?.attributes?.irrigation_times:d?.attributes?.drain_times;if(t&&Array.isArray(t)){const e=[],i=[new Date(u),new Date(g)];t.forEach(t=>{const[r,a]=t.time.split(":").map(Number),n=1e3*(t.duration||60);i.forEach(t=>{const i=new Date(t);i.setHours(r,a,0,0);const s=new Date(i.getTime()+n);s.getTime()>g.getTime()&&i.getTime()<u.getTime()&&e.push({start:Math.max(i.getTime(),g.getTime()),end:Math.min(s.getTime(),u.getTime())})})}),e.sort((e,t)=>e.start-t.start),m.push({time:g.getTime(),value:0}),e.forEach(e=>{const t=(e.end-e.start)/1e3;let i=`${t}s`;t>=60&&(i=`${Math.round(t/60)}m`),m.push({time:e.start-1,value:0}),m.push({time:e.start,value:1,meta:{duration:i}}),m.push({time:e.end,value:1,meta:{duration:i}}),m.push({time:e.end+1,value:0})}),m.push({time:u.getTime(),value:0}),a="step"}}else{const t=(e,t)=>{if(e&&e.attributes){if("state"===r&&"optimal"===t)return"on"===e.state?1:0;if("light"===t){return!0===(e.attributes.is_lights_on??e.attributes.observations?.is_lights_on)?1:0}return void 0!==e.attributes[t]?e.attributes[t]:e.attributes.observations&&"object"==typeof e.attributes.observations?e.attributes.observations[t]:void 0}},i=(e,t)=>{if("state"===r&&"optimal"===t)return e.attributes.reasons;if("light"===t){return{state:e.attributes.is_lights_on??e.attributes.observations?.is_lights_on?"ON":"OFF"}}};if(!this._historyData||0===this._historyData.length)return j``;const a=[...this._historyData].sort((e,t)=>new Date(e.last_changed).getTime()-new Date(t.last_changed).getTime());if(a.forEach(r=>{const a=new Date(r.last_changed).getTime();if(a<g.getTime())return;const n=t(r,e),s=i(r,e);void 0===n||isNaN(parseFloat(n))||m.push({time:a,value:parseFloat(n),meta:s})}),c){const r=t(c,e),a=i(c,e);void 0===r||isNaN(parseFloat(r))||m.push({time:u.getTime(),value:parseFloat(r),meta:a})}}if(1===m.length&&m.unshift({time:g.getTime(),value:m[0].value,meta:m[0].meta}),m.length<2&&"step"!==a)return j``;const f=1e3,v="step"===a?100:180;let y=0,b=1;"state"!==r&&"irrigation"!==e&&"drain"!==e&&(y=Math.min(...m.map(e=>e.value)),b=Math.max(...m.map(e=>e.value)));const w=b-y||1,x=y-.1*w,_=b+.1*w,$=_-x,D=m.length>0?m.reduce((e,t)=>e+t.value,0)/m.length:(y+b)/2;let S="";if("step"===a){const e=[];let t=m.length>0?m[0].value:0;e.push([0,v-(t-x)/$*v]),m.forEach(i=>{const r=(i.time-g.getTime())/h*f,a=v-(i.value-x)/$*v;e.push([r,e[e.length-1][1]]),e.push([r,a]),t=i.value}),e.push([f,v-(t-x)/$*v]),S=`M ${e.map(e=>`${e[0]},${e[1]}`).join(" L ")}`}else{const e=m.map(e=>[(e.time-g.getTime())/h*f,v-(e.value-x)/$*v]);S=`M ${e.map(e=>`${e[0]},${e[1]}`).join(" L ")}`}if("step"===a)return j`
        <div class="gs-light-cycle-card" style="margin-top: 12px; border: 1px solid ${t}40;">
           <div class="gs-light-header-row">
               <div class="gs-light-title" style="font-size: 1.2rem; flex: 1; cursor: pointer;" @click=${()=>this._toggleEnvGraph(e)}>
                   <div class="gs-icon-box" style="color: ${t}; background: ${t}10; border-color: ${t}30; width: 36px; height: 36px;">
                        <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${n}"></path></svg>
                   </div>
                   <div>
                      <div>${i}</div>
                      <div class="gs-light-subtitle">${p.toUpperCase()} HISTORY • ${(()=>{if("light"===e){const e=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);if(e){const t=`binary_sensor.${e.device_id}_light_schedule_correct`,i=this.hass.states[t];if(i?.attributes["Expected schedule"])return i.attributes["Expected schedule"]}return 1===m[m.length-1]?.value?"ON":"OFF"}return"state"===r?1===m[m.length-1]?.value?"OPTIMAL":"NOT OPTIMAL":"irrigation"===e||"drain"===e?1===m[m.length-1]?.value?"ACTIVE":"INACTIVE":`${y.toFixed(1)} - ${b.toFixed(1)} ${r}`})()}</div>
                   </div>
               </div>
               


               <div style="opacity: 0.7; cursor: pointer;" @click=${()=>this._toggleEnvGraph(e)}>
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"}"></path></svg>
               </div>
           </div>

           <div class="gs-chart-container" style="height: 100px;"
                @mousemove=${t=>{const i=t.currentTarget.getBoundingClientRect();this._handleGraphHover(t,e,m,i,r)}}
                @mouseleave=${()=>this._tooltip=null}>

               ${this._tooltip&&this._tooltip.id===e?j`
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
                   <path class="chart-line" d="${S}" style="stroke: ${t};" />
                   <path class="chart-gradient-fill" d="${S} V 100 H 0 Z" style="fill: url(#grad-${e});" />
               </svg>
               <div class="chart-markers">
                ${"1h"===p?j`<span>-60m</span><span>NOW</span>`:"6h"===p?j`<span>-6h</span><span>NOW</span>`:"7d"===p?j`<span>-7d</span><span>NOW</span>`:j`<span>-24H</span><span>NOW</span>`}
               </div>
           </div>
        </div>
      `;const C=[_,_-.25*$,_-.5*$,_-.75*$,x];return j`
      <div class="gs-env-graph-card" style="margin-top: 12px; background: #1a1a1a; border-radius: 12px; padding: 16px;">
         <div class="gs-env-graph-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; cursor: pointer;" @click=${()=>this._toggleEnvGraph(e)}>
             <div style="display: flex; align-items: center; gap: 12px;">
                 <svg style="width:24px;height:24px;fill:${t};" viewBox="0 0 24 24"><path d="${n}"></path></svg>
                 <div>
                    <div style="font-size: 0.9rem; font-weight: 600; color: #fff;">${i}</div>
                 </div>
             </div>
         </div>

         <div class="gs-env-chart-container" style="position: relative; height: 180px; background: #0d0d0d; border-radius: 8px; padding: 20px 40px 30px 50px;"
              @mousemove=${t=>{const i=t.currentTarget.getBoundingClientRect();this._handleGraphHover(t,e,m,i,r)}}
              @mouseleave=${()=>this._tooltip=null}>

             ${this._tooltip&&this._tooltip.id===e?j`
                 <div style="position: absolute; left: ${this._tooltip.x}px; top: 0; bottom: 0; width: 1px; background: ${t}80; pointer-events: none;"></div>
                 <div style="position: absolute; left: ${this._tooltip.x+10}px; top: 20px; background: rgba(0,0,0,0.9); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; border: 1px solid ${t}; pointer-events: none; z-index: 1000;">
                    <div style="color: ${t}; font-weight: 600;">${this._tooltip.time}</div>
                    <div style="margin-top: 4px;">${this._tooltip.value}</div>
                 </div>
             `:""}

             <!-- Y-axis labels -->
             <div style="position: absolute; left: 0; top: 20px; bottom: 30px; width: 45px; display: flex; flex-direction: column; justify-content: space-between; font-size: 0.65rem; color: #666; text-align: right; padding-right: 8px;">
                ${C.map(e=>j`<div>${e.toFixed(1)} ${r}</div>`)}
             </div>

             <svg style="position: absolute; left: 50px; top: 20px; right: 40px; bottom: 30px; width: calc(100% - 90px); height: calc(100% - 50px);" viewBox="0 0 1000 ${v}" preserveAspectRatio="none">
                 <defs>
                     <linearGradient id="grad-${e}" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" style="stop-color:${t};stop-opacity:0.3" />
                         <stop offset="100%" style="stop-color:${t};stop-opacity:0" />
                     </linearGradient>
                 </defs>
                 
                 <!-- Vertical grid lines -->
                 <line x1="0" y1="0" x2="0" y2="${v}" stroke="#333" stroke-width="1" />
                 <line x1="${250}" y1="0" x2="${250}" y2="${v}" stroke="#222" stroke-width="1" stroke-dasharray="2,2" />
                 <line x1="${500}" y1="0" x2="${500}" y2="${v}" stroke="#222" stroke-width="1" stroke-dasharray="2,2" />
                 <line x1="${750}" y1="0" x2="${750}" y2="${v}" stroke="#222" stroke-width="1" stroke-dasharray="2,2" />
                 <line x1="${f}" y1="0" x2="${f}" y2="${v}" stroke="#333" stroke-width="1" />
                 
                 <!-- Target/average line -->
                 ${D?j`
                   <line x1="0" y1="${v-(D-x)/$*v}" 
                         x2="${f}" y2="${v-(D-x)/$*v}" 
                         stroke="${t}" stroke-width="1.5" stroke-dasharray="5,5" opacity="0.5" />
                 `:""}
                 
                 <!-- Data line and fill -->
                 <path d="${S} V ${v} H 0 Z" fill="url(#grad-${e})" />
                 <path d="${S}" fill="none" stroke="${t}" stroke-width="2.5" />
             </svg>
             
             <!-- X-axis markers -->
             <div class="chart-markers" style="position: absolute; left: 50px; right: 40px; bottom: 5px; display: flex; justify-content: space-between; font-size: 0.65rem; color: #666;">
                ${"1h"===p?j`<span>60m</span><span>45m</span><span>30m</span><span>15m</span>`:"6h"===p?j`<span>6h</span><span>4.5h</span><span>3h</span><span>1.5h</span>`:"7d"===p?j`<span>7d</span><span>5d</span><span>3d</span><span>1d</span>`:j`<span>24h</span><span>18h</span><span>12h</span><span>6h</span>`}
                <span style="color: ${t};">NOW</span>
             </div>
         </div>
      </div>
    `}_setStrainSearchQuery(e){this._strainLibraryDialog&&(this._strainLibraryDialog.searchQuery=e,this.requestUpdate())}_toggleAddStrainForm(){}_promptClearAll(){}_cancelClearAll(){}async _addStrain(){if(!this._strainLibraryDialog?.editorState?.strain)return;const e=this._strainLibraryDialog.editorState,t={strain:e.strain,phenotype:e.phenotype,breeder:e.breeder,type:e.type,flowering_days_min:e.flowering_min?parseInt(e.flowering_min):void 0,flowering_days_max:e.flowering_max?parseInt(e.flowering_max):void 0,lineage:e.lineage,sex:e.sex,description:e.description,image:e.image,image_crop_meta:e.image_crop_meta,sativa_percentage:e.sativa_percentage,indica_percentage:e.indica_percentage};try{await this.dataService.addStrain(t);const i=`${e.strain}|${e.phenotype||"default"}`,r={key:i,strain:e.strain,phenotype:e.phenotype,breeder:e.breeder,type:e.type,flowering_days_min:t.flowering_days_min,flowering_days_max:t.flowering_days_max,lineage:e.lineage,sex:e.sex,description:e.description,image:e.image,image_crop_meta:e.image_crop_meta,sativa_percentage:e.sativa_percentage,indica_percentage:e.indica_percentage};this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e.key!==i),this._strainLibraryDialog.strains.push(r),this._switchStrainView("browse"),this._fetchStrainLibrary()}catch(e){console.error("Error adding strain:",e)}}async _removeStrain(e){if(this._strainLibraryDialog)try{const t=e.split("|"),i=t[0],r=t.length>1&&"default"!==t[1]?t[1]:void 0;await this.dataService.removeStrain(i,r),this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(t=>t.key!==e),this.requestUpdate(),this._fetchStrainLibrary()}catch(e){console.error("Error removing strain:",e)}}async _clearStrains(){await this.dataService.clearStrainLibrary(),this._strainLibraryDialog&&(this._strainLibraryDialog.strains=[],this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate(),this._fetchStrainLibrary())}async _handleExportLibrary(){const e=await this.hass.connection.subscribeEvents(t=>{t.data&&t.data.url&&(this._downloadFile(t.data.url),e())},"growspace_manager_strain_library_exported");try{await this.hass.callService("growspace_manager","export_strain_library")}catch(t){console.error("Failed to call export service",t),e()}}_downloadFile(e){const t=document.createElement("a");t.style.display="none",t.href=e,t.download=e.split("/").pop()||"export.zip",document.body.appendChild(t),t.click(),document.body.removeChild(t)}_openImportDialog(){this._strainLibraryDialog&&(this._strainLibraryDialog.importDialog={open:!0,replace:!1},this.requestUpdate())}_handleImportDialogChange(e){this._strainLibraryDialog&&this._strainLibraryDialog.importDialog&&(void 0!==e.open&&(this._strainLibraryDialog.importDialog.open=e.open),void 0!==e.replace&&(this._strainLibraryDialog.importDialog.replace=e.replace),this.requestUpdate())}async _performImport(){if(!this._strainLibraryDialog?.importDialog)return;const e=this._strainLibraryDialog.importDialog.replace,t=document.createElement("input");t.type="file",t.accept=".zip",t.onchange=async t=>{const i=t.target.files?.[0];if(i)try{const t=await this.dataService.importStrainLibrary(i,e);alert(`Import successful! ${t.imported_count||""} strains imported.`),this._strainLibraryDialog&&this._strainLibraryDialog.importDialog&&(this._strainLibraryDialog.importDialog.open=!1),this.requestUpdate()}catch(e){console.error("Import failed:",e),alert(`Import failed: ${e.message}`)}},t.click()}updateGrid(){this.dataService=new cn(this.hass),this.requestUpdate()}_handleDragStart(e,t){this._draggedPlant=t,e.dataTransfer?.setData("text/plain",JSON.stringify({id:t.entity_id}));e.target.classList.add("dragging")}_handleDragEnd(e){e.target.classList.remove("dragging")}_handleDragOver(e){e.preventDefault()}async _handleDrop(e,t,i,r){if(e.preventDefault(),!this._draggedPlant||!this.selectedDevice)return;const a=this._draggedPlant;this._draggedPlant=null;try{if(r){const e=a.attributes.plant_id||a.entity_id.replace("sensor.",""),t=r.attributes.plant_id||r.entity_id.replace("sensor.","");await this.hass.callService("growspace_manager","switch_plants",{plant1_id:e,plant2_id:t}),this.updateGrid()}else await this._movePlant(a,t,i)}catch(e){console.error("Error during drag-and-drop:",e)}}async _movePlant(e,t,i){try{const r=e.attributes?.plant_id||e.entity_id.replace("sensor.","");await this.dataService.updatePlant({plant_id:r,row:t,col:i})}catch(e){console.error("Error moving plant:",e)}}_moveClonePlant(e,t){this.hass.callService("growspace_manager","move_clone",{plant_id:e.attributes.plant_id,target_growspace_id:t}).then(()=>{console.log(`Moved clone ${e.attributes.friendly_name} to ${t}`),this._plantOverviewDialog=null}).catch(e=>{console.error("Error moving clone:",e)})}_openConfigDialog(){this._configDialog={open:!0,currentTab:"add_growspace",addGrowspaceData:{name:"",rows:3,plants_per_row:3,notification_service:""},environmentData:{selectedGrowspaceId:"",temp_sensor:"",humidity_sensor:"",vpd_sensor:"",co2_sensor:"",light_sensor:"",fan_switch:""},globalData:{weather_entity:"",lung_room_temp:"",lung_room_humidity:""}}}_handleAddGrowspaceSubmit(){if(!this._configDialog)return;const e=this._configDialog.addGrowspaceData;e.name?this.dataService.addGrowspace(e).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(e=>alert(`Error: ${e.message}`)):alert("Name is required")}_handleEnvSubmit(){if(!this._configDialog)return;const e=this._configDialog.environmentData;e.selectedGrowspaceId&&e.temp_sensor&&e.humidity_sensor&&e.vpd_sensor?this.dataService.configureGrowspaceSensors({growspace_id:e.selectedGrowspaceId,temperature_sensor:e.temp_sensor,humidity_sensor:e.humidity_sensor,vpd_sensor:e.vpd_sensor,co2_sensor:e.co2_sensor||void 0,light_sensor:e.light_sensor||void 0,fan_switch:e.fan_switch||void 0}).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(e=>alert(`Error: ${e.message}`)):alert("Growspace and required sensors (Temp, Hum, VPD) are mandatory")}_handleGlobalSubmit(){if(!this._configDialog)return;const e=this._configDialog.globalData;this.dataService.configureGlobalSettings(e).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(e=>alert(`Error: ${e.message}`))}_openGrowMasterDialog(){this.selectedDevice&&(this._growMasterDialog={open:!0,growspaceId:this.selectedDevice,userQuery:"",isLoading:!1,response:null,mode:"single"})}async _handleAskAdvice(){if(this._growMasterDialog&&this._growMasterDialog.userQuery){this._growMasterDialog.isLoading=!0,this._growMasterDialog.response=null,this.requestUpdate();try{const e=await this.dataService.askGrowAdvice(this._growMasterDialog.growspaceId,this._growMasterDialog.userQuery);this._growMasterDialog&&(e&&e.response?"string"==typeof e.response?this._growMasterDialog.response=e.response:"object"==typeof e.response&&"response"in e.response&&"string"==typeof e.response.response?this._growMasterDialog.response=e.response.response:this._growMasterDialog.response=JSON.stringify(e,null,2):this._growMasterDialog.response=JSON.stringify(e,null,2))}catch(e){this._growMasterDialog&&(this._growMasterDialog.response=`Error: ${e.message||"Failed to get advice."}`)}finally{this._growMasterDialog&&(this._growMasterDialog.isLoading=!1,this.requestUpdate())}}}async _handleAnalyzeAll(){if(this._growMasterDialog){this._growMasterDialog.isLoading=!0,this._growMasterDialog.response=null,this._growMasterDialog.mode="all",this.requestUpdate();try{const e=await this.dataService.analyzeAllGrowspaces();this._growMasterDialog&&(e&&e.response?"string"==typeof e.response?this._growMasterDialog.response=e.response:"object"==typeof e.response&&"response"in e.response&&"string"==typeof e.response.response?this._growMasterDialog.response=e.response.response:this._growMasterDialog.response=JSON.stringify(e,null,2):this._growMasterDialog.response=JSON.stringify(e,null,2))}catch(e){this._growMasterDialog&&(this._growMasterDialog.response=`Error: ${e.message||"Failed to get advice."}`)}finally{this._growMasterDialog&&(this._growMasterDialog.isLoading=!1,this.requestUpdate())}}}async _handleGetStrainRecommendation(){if(this._strainRecommendationDialog&&this._strainRecommendationDialog.userQuery){this._strainRecommendationDialog.isLoading=!0,this._strainRecommendationDialog.response=null,this.requestUpdate();try{const e=await this.dataService.getStrainRecommendation(this._strainRecommendationDialog.userQuery);this._strainRecommendationDialog&&(e&&"string"==typeof e.response?this._strainRecommendationDialog.response=e.response:this._strainRecommendationDialog.response=JSON.stringify(e,null,2))}catch(e){this._strainRecommendationDialog&&(this._strainRecommendationDialog.response=`Error: ${e.message||"Failed to get recommendation."}`)}finally{this._strainRecommendationDialog&&(this._strainRecommendationDialog.isLoading=!1,this.requestUpdate())}}}_openStrainRecommendationDialog(){this._strainRecommendationDialog={open:!0,userQuery:"",isLoading:!1,response:null}}render(){if(!this.hass)return j`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;this.dataService=new cn(this.hass);const e=this.dataService.getGrowspaceDevices();if(!e.length)return j`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;if(!this._defaultApplied&&this._config?.default_growspace){const t=e.find(e=>e.device_id===this._config.default_growspace||e.name===this._config.default_growspace);t&&(this.selectedDevice=t.device_id),this._defaultApplied=!0}this.selectedDevice&&e.find(e=>e.device_id===this.selectedDevice)||(this.selectedDevice=e[0].device_id);const t=e.find(e=>e.device_id===this.selectedDevice);if(!t)return j`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;const i=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;i&&Object.entries(i).forEach(([e,t])=>{});const r=ln.calculateEffectiveRows(t),{grid:a}=ln.createGridLayout(t.plants,r,t.plants_per_row),n=t.plants_per_row>6,s=this._strainLibrary;return j`
      <ha-card class=${n?"wide-growspace":""}>
        <div class="sr-only-announcer" aria-live="polite"></div>
        <div class="unified-growspace-card" tabindex="0" @keydown=${this._handleKeyboardNav}>
          ${this.renderHeader(e)}
          ${this._isCompactView?"":this.renderGrowspaceHeader(t)}
          ${this.renderEditModeBanner()}
          ${this.renderGrid(a,r,t.plants_per_row,s)}
        </div>
      </ha-card>
      
      ${this.renderDialogs()}
    `}renderGrowspaceHeader(e){const t=ln.getDominantStage(e.plants),i=this.dataService.getGrowspaceDevices();let r=e.name.toLowerCase().replace(/\s+/g,"_");e.overview_entity_id&&(r=e.overview_entity_id.replace("sensor.",""));let a=`binary_sensor.${r}_optimal_conditions`;const n="cure"===r,s="dry"===r;n?a="binary_sensor.cure_optimal_curing":s&&(a="binary_sensor.dry_optimal_drying");const o=this.hass.states[a],l=e.overview_entity_id?this.hass.states[e.overview_entity_id]:void 0,c=(e,t)=>{if(e&&e.attributes)return void 0!==e.attributes[t]?e.attributes[t]:e.attributes.observations&&"object"==typeof e.attributes.observations?e.attributes.observations[t]:void 0},d=c(o,"temperature"),p=c(o,"humidity"),h=c(o,"vpd"),u=n||s,g=c(o,"co2"),m=u||null==g?void 0:g,f=c(o,"is_lights_on"),v=!u&&null!=f,y=!0===f;e.plants.some(e=>"flower"===e.attributes.stage);let b=[];if(this._historyData&&this._historyData.length>0){const e=[...this._historyData].sort((e,t)=>new Date(e.last_changed).getTime()-new Date(t.last_changed).getTime()),t=new Date,i=new Date(t.getTime()-864e5),r=1e3,a=100,n=[];let s=e.length>0?!0!==c(e[0],"is_lights_on"):y;e.forEach(e=>{const t=new Date(e.last_changed).getTime(),r=!0===c(e,"is_lights_on");t>=i.getTime()&&b.push({time:t,state:r})}),s=b.length>0?!b[0].state:y,n.push([0,s?0:a]),b.forEach(e=>{const t=(e.time-i.getTime())/864e5*r;n.push([t,s?0:a]),s=e.state,n.push([t,s?0:a])}),n.push([r,s?0:a]),n.map(e=>`${e[0]},${e[1]}`).join(" L ");const o=[...e].reverse(),l=o.find(e=>!0===c(e,"is_lights_on"));if(l){const e=new Date(l.last_changed);e.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).replace(/ [AP]M/,""),e.toLocaleTimeString([],{hour12:!0}).slice(-2)}const d=o.find(e=>!1===c(e,"is_lights_on"));if(d){const e=new Date(d.last_changed);e.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).replace(/ [AP]M/,""),e.toLocaleTimeString([],{hour12:!0}).slice(-2)}}const w=e=>{if(!e||0===e.length)return null;const t=new Date,i=60*t.getHours()+t.getMinutes(),r=[...e].sort((e,t)=>{const[i,r]=e.time.split(":").map(Number),[a,n]=t.time.split(":").map(Number);return 60*i+r-(60*a+n)}),a=r.find(e=>{const[t,r]=e.time.split(":").map(Number);return 60*t+r>i});return a?a.time.slice(0,5):r[0].time.slice(0,5)},x=w(l?.attributes?.irrigation_times),_=w(l?.attributes?.drain_times);return j`
      <div class="gs-stats-container">
         <div class="gs-header-top">
            <div class="gs-title-group">
               <!-- Title as Dropdown if no default is set -->
               ${this._config?.default_growspace?j`
                 <h3 class="gs-title">${e.name}</h3>
               `:j`
                 <select class="growspace-select-header" .value=${this.selectedDevice||""} @change=${this._handleDeviceChange}>
                    ${i.map(e=>j`<option value="${e.device_id}">${e.name}</option>`)}
                 </select>
               `}


               ${t?j`
               <div style="display: flex; gap: 8px;">
                <div class="gs-stage-chip">
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ln.getPlantStageIcon(t.stage)}"></path></svg>
                  ${t.stage.charAt(0).toUpperCase()+t.stage.slice(1)} • Day ${t.days}
                </div>
                <div class="gs-stage-chip">
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ln.getPlantStageIcon(t.stage)}"></path></svg>
                  ${t.stage.charAt(0).toUpperCase()+t.stage.slice(1)} • Week ${Math.ceil(t.days/7)}
                </div>
               </div>
               `:""}
            </div>

            <div class="gs-stats-chips">
                ${void 0!==d?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("temperature")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("temperature")}>
                     <svg viewBox="0 0 24 24"><path d="${Ne}"></path></svg>${d}°C
                   </div>`:""}
                ${void 0!==p?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("humidity")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("humidity")}>
                     <svg viewBox="0 0 24 24"><path d="${He}"></path></svg>${p}%
                   </div>`:""}
                ${void 0!==h?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("vpd")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("vpd")}>
                     <svg viewBox="0 0 24 24"><path d="${be}"></path></svg>${h} kPa
                   </div>`:""}
                 ${void 0!==m?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("co2")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("co2")}>
                     <svg viewBox="0 0 24 24"><path d="${Fe}"></path></svg>${m} ppm
                   </div>`:""}

                ${v?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("light")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("light")}>
                     <svg viewBox="0 0 24 24"><path d="${y?Ae:"M12,2C9.76,2 7.78,3.05 6.5,4.68L16.31,14.5C17.94,13.21 19,11.24 19,9A7,7 0 0,0 12,2M3.28,4L2,5.27L5.04,8.3C5,8.53 5,8.76 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H14.73L18.73,22L20,20.72L3.28,4M9,20V21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9Z"}"></path></svg>
                     ${y?"On":"Off"}
                   </div>`:""}

                 ${x?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("irrigation")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("irrigation")}>
                     <svg viewBox="0 0 24 24"><path d="${ze}"></path></svg>
                     Next: ${x}
                   </div>`:""}

                 ${_?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("drain")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("drain")}>
                     <svg viewBox="0 0 24 24"><path d="${ze}"></path></svg>
                     Next: ${_}
                   </div>`:""}

                 ${o?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("optimal")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("optimal")}>
                     <svg viewBox="0 0 24 24"><path d="${"on"===o.state?Oe:"M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"}"></path></svg>
                     ${"on"===o.state?"Optimal Conditions":o.attributes.reasons||"Not Optimal"}
                   </div>`:""}

                ${this._isCompactView?"":j`
                  <div class="menu-container">
                    <div class="menu-button" @click=${()=>this._menuOpen=!this._menuOpen}>
                      <svg viewBox="0 0 24 24"><path d="${"M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"}"></path></svg>
                    </div>
                    
                    ${this._menuOpen?j`
                      <div class="menu-dropdown" @click=${e=>e.stopPropagation()}>
                        <div class="menu-item" @click=${()=>{this._openConfigDialog(),this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${xe}"></path></svg>
                          <span class="menu-item-label">Config</span>
                        </div>

                        <div class="menu-item" @click=${()=>{this._isEditMode=!this._isEditMode,this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${Ee}"></path></svg>
                          <span class="menu-item-label">Edit</span>
                          <div class="menu-toggle-switch ${this._isEditMode?"active":""}"></div>
                        </div>
                        
                        <div class="menu-item" @click=${()=>{this._isCompactView=!0,this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${Te}"></path></svg>
                          <span class="menu-item-label">Compact View</span>
                          <div class="menu-toggle-switch ${this._isCompactView?"active":""}"></div>
                        </div>
                        
                        
                        <div class="menu-item" @click=${()=>{this._openStrainLibraryDialog(),this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${De}"></path></svg>
                          <span class="menu-item-label">Strains</span>
                        </div>
                        
                        <div class="menu-item" @click=${()=>{this._openIrrigationDialog(),this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${ze}"></path></svg>
                          <span class="menu-item-label">Irrigation</span>
                        </div>
                        
                        <div class="menu-item" @click=${()=>{this._openGrowMasterDialog(),this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${ge}"></path></svg>
                          <span class="menu-item-label">Ask AI</span>
                        </div>
                      </div>
                    `:""}
                  </div>
                `}
</div>
  </div>
  
  ${this._activeEnvGraphs.size>0?this.renderTimeRangeSelector():""}

<!-- Active Environmental Graphs -->
  ${this._activeEnvGraphs.has("temperature")?this.renderEnvGraph("temperature","#FF5722","Temperature","°C","line",Ne):""}
         ${this._activeEnvGraphs.has("humidity")?this.renderEnvGraph("humidity","#2196F3","Humidity","%","line",He):""}
         ${this._activeEnvGraphs.has("vpd")?this.renderEnvGraph("vpd","#9C27B0","VPD","kPa","line",be):""}
         ${this._activeEnvGraphs.has("co2")?this.renderEnvGraph("co2","#90A4AE","CO2","ppm","line",Fe):""}
         ${this._activeEnvGraphs.has("light")?this.renderEnvGraph("light","#FFEB3B","Light Cycle","state","step",Ae):""}
         ${this._activeEnvGraphs.has("optimal")?this.renderEnvGraph("optimal","#4CAF50","Optimal Conditions","state","step",Oe):""}
         ${this._activeEnvGraphs.has("irrigation")?this.renderEnvGraph("irrigation","#2196F3","Irrigation Schedule","state","step",ze):""}
         ${this._activeEnvGraphs.has("drain")?this.renderEnvGraph("drain","#FF9800","Drain Schedule","state","step",ze):""}

</div>
  `}renderHeader(e){return this._isCompactView||this._config?.title?(e.find(e=>e.device_id===this.selectedDevice),j`
      <div class="header">
        ${this._config?.title?j`<h2 class="header-title">${this._config.title}</h2>`:""}
        
        ${this._isCompactView?j`
          <div class="selector-container">
            ${this._config?.default_growspace?j`
              <label for="device-select">Growspace:</label>
              <!-- Even if default is set, user wants dropdown in compact mode -->
              <select
                id="device-select"
                class="growspace-select"
                .value=${this.selectedDevice||""}
                @change=${this._handleDeviceChange}
              >
                ${e.map(e=>j`<option value="${e.device_id}">${e.name}</option>`)}
              </select>
            `:j`
              <label for="device-select">Growspace:</label>
              <select 
                id="device-select" 
                class="growspace-select"
                .value=${this.selectedDevice||""} 
                @change=${this._handleDeviceChange}
              >
                ${e.map(e=>j`<option value="${e.device_id}">${e.name}</option>`)}
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
                <path d="${De}"></path>
              </svg>
              Strains
            </button>
          </div>
        `:""}
      </div>
    `):j``}renderEditModeBanner(){return this._isEditMode?j`
      <div class="edit-mode-banner">
        <div class="banner-content">
          <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24">
            <path d="${ve}"></path>
          </svg>
          <span>${this._selectedPlants.size} plant(s) selected</span>
        </div>
        <div class="banner-actions">
          <button class="md3-button text" @click=${this._selectAllPlants}>Select All</button>
          <button class="md3-button text" @click=${this._deselectAllPlants}>Clear</button>
          <button class="md3-button text" @click=${this._exitEditMode}>Exit</button>
        </div>
      </div>
    `:j``}renderGrid(e,t,i,r){const a=i>5,n=a?"":`grid-template-columns: repeat(${i}, minmax(0, 1fr)); grid-template-rows: repeat(${t}, 1fr);`;return j`
      <div class="grid ${this._isCompactView?"compact":""} ${a?"force-list-view":""}"
           style="${n}">
        ${e.flat().map((e,t)=>{const a=Math.floor(t/i)+1,n=t%i+1;return e?this.renderPlantSlot(e,a,n,r):this.renderEmptySlot(a,n)})}
      </div>
    `}renderEmptySlot(e,t){return j`
      <div
        class="plant-card-empty"
        style="grid-row: ${e}; grid-column: ${t}"
        @click=${()=>this._openAddPlantDialog(e-1,t-1)}
        @dragover=${this._handleDragOver}
        @drop=${i=>this._handleDrop(i,e,t,null)}
      >
        <div class="plant-header">
          <svg style="width: 48px; height: 48px; opacity: 0.5; fill: currentColor;" viewBox="0 0 24 24">
            <path d="${Le}"></path>
          </svg>
        </div>
        <div style="font-weight: 500; opacity: 0.8;">Add Plant</div>
      </div>
    `}renderPlantSlot(e,t,i,r){const a=ln.getPlantStageColor(e.state),n=e.attributes?.strain,s=e.attributes?.phenotype;let o,l;if(n){const e=r.find(e=>e.strain===n&&e.phenotype===s);if(e&&e.image)o=e.image,l=e.image_crop_meta;else{const e=r.find(e=>e.strain===n&&(!e.phenotype||"default"===e.phenotype));if(e&&e.image)o=e.image,l=e.image_crop_meta;else if(!o){const e=r.find(e=>e.strain===n&&e.image);e&&(o=e.image,l=e.image_crop_meta)}}}const c=this._selectedPlants.has(e.attributes.plant_id||"");return j`
      <div
        class="plant-card-rich"
        style="grid-row: ${t}; grid-column: ${i}; --stage-color: ${a}"
        draggable="true"
        @dragstart=${t=>this._handleDragStart(t,e)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${r=>this._handleDrop(r,t,i,e)}
        @click=${()=>this._handlePlantClick(e)}
      >
        ${o?j`
          <img 
            class="plant-card-bg" 
            src="${o}" 
            loading="lazy" 
            alt="${n||"Plant"}"
            style="${dn.getImgStyle(l)}"
          />
          <div class="plant-card-overlay"></div>
        `:""}

        ${this._isEditMode?j`
          <div class="plant-card-checkbox" @click=${t=>{t.stopPropagation(),this._togglePlantSelection(e)}}>
             <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: ${c?"var(--primary-color)":"rgba(255,255,255,0.7)"};">
               <path d="${c?ve:"M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"}"></path>
             </svg>
          </div>
        `:""}

        <div class="plant-card-content">
          <div class="pc-info">
            <div class="pc-strain-name" title="${e.attributes?.strain||""}">
              ${e.attributes?.strain||"Unknown Strain"}
            </div>
            ${e.attributes?.phenotype?j`<div class="pc-pheno">${e.attributes.phenotype}</div>`:""}
            <div class="pc-stage">
              ${e.state||"Unknown"}
            </div>
          </div>

          <div class="pc-stats">
            ${this.renderPlantDaysRich(e)}
          </div>
        </div>
      </div>
    `}renderPlantDaysRich(e){const t=[{days:e.attributes?.seedling_days,icon:Ie,title:"Seedling",stage:"seedling"},{days:e.attributes?.mother_days,icon:Ie,title:"Mother",stage:"mother"},{days:e.attributes?.clone_days,icon:Ie,title:"Clone",stage:"clone"},{days:e.attributes?.veg_days,icon:Ie,title:"Veg",stage:"vegetative"},{days:e.attributes?.flower_days,icon:Se,title:"Flower",stage:"flower"},{days:e.attributes?.dry_days,icon:Ce,title:"Dry",stage:"dry"},{days:e.attributes?.cure_days,icon:me,title:"Cure",stage:"cure"}].filter(e=>void 0!==e.days&&null!==e.days),i=t.filter(e=>e.days),r=(e.state||"").toLowerCase(),a="veg"===r?"vegetative":r;return j`
        ${i.map(e=>{const t=ln.getPlantStageColor(e.stage),i=e.stage===a;return j`
                <div class="pc-stat-item ${i?"current-stage":""}">
                    <svg style="color: ${t};" viewBox="0 0 24 24"><path d="${e.icon}"></path></svg>
                    <div class="pc-stat-text">${e.days}d</div>
                </div>
            `})}
    `}_setGraphRange(e){this.selectedDevice&&(this._graphRanges={...this._graphRanges,[this.selectedDevice]:e},this._fetchHistory(e))}renderTimeRangeSelector(){const e=this.selectedDevice&&this._graphRanges[this.selectedDevice]||"24h";return j`
      <div class="time-range-selector">
        ${["1h","6h","24h","7d"].map(t=>j`
          <button 
            class="range-btn ${e===t?"active":""}"
            @click=${()=>this._setGraphRange(t)}
          >
            ${t}
          </button>
        `)}
      </div>
    `}_searchStrains(e){if(!e)return this._strainLibrary;const t=e.toLowerCase();return this._strainLibrary.filter(e=>e.strain&&e.strain.toLowerCase().includes(t)||e.phenotype&&e.phenotype.toLowerCase().includes(t)||e.breeder&&e.breeder.toLowerCase().includes(t)||e.lineage&&e.lineage.toLowerCase().includes(t))}renderDialogs(){const e=this.dataService?.getStrainLibrary()||[],t={},i=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;i&&Object.entries(i).forEach(([e,i])=>{t[e]=i});const r=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);return j`
      ${dn.renderAddPlantDialog(this._addPlantDialog,e,r?.name??"",{onClose:()=>this._addPlantDialog=null,onConfirm:()=>this._confirmAddPlant(),onStrainChange:t=>{if(this._addPlantDialog){this._addPlantDialog.strain=t;const i=e.find(e=>e.strain===t);i&&i.phenotype?this._addPlantDialog.phenotype=i.phenotype:this._addPlantDialog.phenotype="",this.requestUpdate()}},onPhenotypeChange:e=>{this._addPlantDialog&&(this._addPlantDialog.phenotype=e)},onVegStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.veg_start=e)},onFlowerStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.flower_start=e)},onSeedlingStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.seedling_start=e)},onMotherStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.mother_start=e)},onCloneStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.clone_start=e)},onDryStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.dry_start=e)},onCureStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.cure_start=e)},onRowChange:e=>{if(this._addPlantDialog){const t=parseInt(e);!isNaN(t)&&t>0&&(this._addPlantDialog.row=t-1,this.requestUpdate())}},onColChange:e=>{if(this._addPlantDialog){const t=parseInt(e);!isNaN(t)&&t>0&&(this._addPlantDialog.col=t-1,this.requestUpdate())}}})}

      ${dn.renderPlantOverviewDialog(this._plantOverviewDialog,t,{onClose:()=>this._plantOverviewDialog=null,onUpdate:()=>{this._updatePlant()},onDelete:e=>{this._handleDeletePlant(e)},onHarvest:e=>{this._harvestPlant(e)},onClone:(e,t)=>{this.clonePlant(e,t)},onTakeClone:(e,t)=>{this.clonePlant(e,t),this._plantOverviewDialog=null},onMoveClone:(e,t)=>{this.hass.callService("growspace_manager","move_clone",{plant_id:e.attributes.plant_id,target_growspace_id:t}).then(()=>{console.log(`Clone ${e.attributes.friendly_name} moved to ${t}`),this._plantOverviewDialog=null}).catch(e=>{console.error("Error moving clone:",e)})},onFinishDrying:e=>{this._finishDryingPlant(e)},_harvestPlant:this._harvestPlant.bind(this),_finishDryingPlant:this._finishDryingPlant.bind(this),onAttributeChange:(e,t)=>{this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes[e]=t)},onToggleShowAllDates:()=>{this._plantOverviewDialog&&(this._plantOverviewDialog.showAllDates=!this._plantOverviewDialog.showAllDates,this.requestUpdate())}})}

      ${dn.renderStrainLibraryDialog(this._strainLibraryDialog?{...this._strainLibraryDialog,strains:this._searchStrains(this._strainLibraryDialog.searchQuery||"")}:null,{onClose:()=>this._strainLibraryDialog=null,onAddStrain:()=>this._addStrain(),onRemoveStrain:e=>this._removeStrain(e),onClearAll:()=>this._clearStrains(),onEditorChange:(e,t)=>this._handleStrainEditorChange(e,t),onSwitchView:(e,t)=>this._switchStrainView(e,t),onSearch:e=>this._setStrainSearchQuery(e),onToggleCropMode:e=>this._toggleCropMode(e),onToggleImageSelector:e=>this._toggleImageSelector(e),onSelectLibraryImage:e=>this._handleSelectLibraryImage(e),onExportStrains:()=>this._handleExportLibrary(),onOpenImportDialog:()=>this._openImportDialog(),onImportDialogChange:e=>this._handleImportDialogChange(e),onConfirmImport:()=>this._performImport(),onGetRecommendation:()=>this._openStrainRecommendationDialog()})}

      ${dn.renderConfigDialog(this._configDialog,t,{onClose:()=>this._configDialog=null,onSwitchTab:e=>{this._configDialog&&(this._configDialog.currentTab=e,this.requestUpdate())},onAddGrowspaceChange:(e,t)=>{this._configDialog&&(this._configDialog.addGrowspaceData[e]=t,this.requestUpdate())},onAddGrowspaceSubmit:()=>this._handleAddGrowspaceSubmit(),onEnvChange:(e,t)=>{this._configDialog&&(this._configDialog.environmentData[e]=t,this.requestUpdate())},onEnvSubmit:()=>this._handleEnvSubmit(),onGlobalChange:(e,t)=>{this._configDialog&&(this._configDialog.globalData[e]=t,this.requestUpdate())},onGlobalSubmit:()=>this._handleGlobalSubmit()})}

    ${this._growMasterDialog?(()=>{let e,t=!1;if(this.selectedDevice&&this.hass){const e=this.selectedDevice,i=[`binary_sensor.${e}_plants_under_stress`,`binary_sensor.${e}_stress`,`binary_sensor.growspace_manager_${e}_stress`];for(const e of i){const i=this.hass.states[e];if(i&&"on"===i.state){t=!0;break}}}if(this.hass){const t=this.hass.states["sensor.growspace_manager"];t&&t.attributes&&t.attributes.ai_settings&&(e=t.attributes.personality||t.attributes.ai_settings.personality)}return dn.renderGrowMasterDialog(this._growMasterDialog,t,e,{onClose:()=>this._growMasterDialog=null,onQueryChange:e=>{this._growMasterDialog&&(this._growMasterDialog.userQuery=e,this.requestUpdate())},onAnalyze:()=>this._handleAskAdvice(),onAnalyzeAll:()=>this._handleAnalyzeAll()})})():""}

      ${dn.renderStrainRecommendationDialog(this._strainRecommendationDialog,{onClose:()=>this._strainRecommendationDialog=null,onQueryChange:e=>{this._strainRecommendationDialog&&(this._strainRecommendationDialog.userQuery=e,this.requestUpdate())},onGetRecommendation:()=>this._handleGetStrainRecommendation()})}

      ${dn.renderIrrigationDialog(this._irrigationDialog,{onClose:()=>this._irrigationDialog=null,onIrrigationPumpChange:e=>{this._irrigationDialog&&(this._irrigationDialog.irrigation_pump_entity=e,this.requestUpdate())},onIrrigationDurationChange:e=>{this._irrigationDialog&&(this._irrigationDialog.irrigation_duration=e,this.requestUpdate())},onDrainPumpChange:e=>{this._irrigationDialog&&(this._irrigationDialog.drain_pump_entity=e,this.requestUpdate())},onDrainDurationChange:e=>{this._irrigationDialog&&(this._irrigationDialog.drain_duration=e,this.requestUpdate())},onSavePumpSettings:()=>this._saveIrrigationPumpSettings(),onAddIrrigationTime:e=>{const t=e.target.closest(".dialog-body")?.querySelector(".irrigation-time-bar");if(t){const e=t.getBoundingClientRect();this._startAddingIrrigationTime(e.width/2,e.width)}},onStartAddingIrrigationTime:(e,t)=>this._startAddingIrrigationTime(e,t),onRemoveIrrigationTime:e=>this._removeIrrigationTime(e),onAddDrainTime:e=>{const t=e.target.closest(".dialog-body")?.querySelector(".drain-time-bar");if(t){const e=t.getBoundingClientRect();this._startAddingDrainTime(e.width/2,e.width)}},onStartAddingDrainTime:(e,t)=>this._startAddingDrainTime(e,t),onRemoveDrainTime:e=>this._removeDrainTime(e),onCancelAddingIrrigationTime:()=>{this._irrigationDialog&&(this._irrigationDialog.adding_irrigation_time=void 0,this.requestUpdate())},onCancelAddingDrainTime:()=>{this._irrigationDialog&&(this._irrigationDialog.adding_drain_time=void 0,this.requestUpdate())},onConfirmAddIrrigationTime:(e,t)=>{this._addIrrigationTime(e,t)},onConfirmAddDrainTime:(e,t)=>{this._addDrainTime(e,t)},onIrrigationTimeInputChange:(e,t)=>{this._irrigationDialog?.adding_irrigation_time&&("time"===e?this._irrigationDialog.adding_irrigation_time.time=t:this._irrigationDialog.adding_irrigation_time.duration=t,this.requestUpdate())},onDrainTimeInputChange:(e,t)=>{this._irrigationDialog?.adding_drain_time&&("time"===e?this._irrigationDialog.adding_drain_time.time=t:this._irrigationDialog.adding_drain_time.duration=t,this.requestUpdate())}})}
    `}};pn.styles=[on,o`
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

      .plant-card-checkbox {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 10;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 50%;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .plant-card-checkbox:hover {
        background: rgba(0, 0, 0, 0.8);
        transform: scale(1.1);
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
        text-transform: capitalize;
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

      /* Menu Button and Dropdown */
      .menu-container {
        position: relative;
        display: inline-block;
      }

      .menu-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        color: #fff;
      }

      .menu-button:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .menu-button svg {
        width: 24px;
        height: 24px;
        fill: currentColor;
      }

      .menu-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 200px;
        background: rgba(30, 30, 35, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
        z-index: 1000;
        overflow: hidden;
        animation: menuFadeIn 0.2s cubic-bezier(0.2, 0, 0, 1);
      }

      @keyframes menuFadeIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        transition: background 0.2s;
        color: #fff;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .menu-item:last-child {
        border-bottom: none;
      }

      .menu-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .menu-item svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
        opacity: 0.9;
      }

      .menu-item-label {
        flex: 1;
        font-size: 0.9rem;
        font-weight: 500;
      }

      /* Toggle switch in menu */
      .menu-toggle-switch {
        width: 40px;
        height: 20px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 10px;
        position: relative;
        transition: background 0.2s;
      }

      .menu-toggle-switch.active {
        background: var(--primary-color, #4caf50);
      }

      .menu-toggle-switch::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 16px;
        height: 16px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1);
      }

      .menu-toggle-switch.active::after {
        transform: translateX(20px);
      }

      /* Edit Mode Banner */
      .edit-mode-banner {
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.25));
        border: 1px solid rgba(76, 175, 80, 0.4);
        border-radius: 12px;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        animation: slideDown 0.3s ease;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .banner-content {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #fff;
        font-weight: 500;
        font-size: 0.95rem;
      }

      .banner-content svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }

      .banner-actions {
        display: flex;
        gap: 8px;
      }

      .plant-card-checkbox.selected {
        background: var(--primary-color, #4caf50);
        border-color: var(--primary-color, #4caf50);
        box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
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

      /* Time Range Selector */
      .time-range-selector {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
        justify-content: flex-end;
      }
      .range-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #aaa;
        border-radius: 6px;
        padding: 4px 12px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      .range-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      .range-btn.active {
        background: var(--primary-color, #22c55e);
        border-color: var(--primary-color, #22c55e);
        color: #fff;
        font-weight: 600;
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

      /* Accessibility */
      .sr-only-announcer {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .plant-card-rich:focus {
        outline: 2px solid var(--primary-color, #22c55e);
        outline-offset: 2px;
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

      /* MD3 Input Styles - Enhanced for Material Design 3 */
      .md3-input-group {
        position: relative;
        margin-bottom: var(--spacing-md);
        background: rgba(255, 255, 255, 0.04);
        border-radius: 4px 4px 0 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.38);
        transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      }

      .md3-input-group:hover {
        background: rgba(255, 255, 255, 0.08);
        border-bottom-color: rgba(255, 255, 255, 0.87);
      }

      .md3-input-group:focus-within {
        background: rgba(255, 255, 255, 0.12);
        border-bottom: 2px solid var(--primary-color, #4caf50);
      }

      /* Error state for inputs */
      .md3-input-group.error {
        border-bottom-color: var(--error-color, #f44336);
      }

      .md3-input-group.error .md3-label {
        color: var(--error-color, #f44336);
      }

      .md3-label {
        position: absolute;
        left: 16px;
        top: 8px;
        font-size: 0.75rem;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.6);
        pointer-events: none;
        transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        letter-spacing: 0.4px;
      }

      .md3-input-group:focus-within .md3-label {
        color: var(--primary-color, #4caf50);
      }

      .md3-input {
        width: 100%;
        padding: 24px 16px 8px;
        border: none;
        background: transparent;
        color: #ffffff;
        font-size: 1rem;
        font-family: 'Roboto', sans-serif;
        box-sizing: border-box;
        outline: none;
      }

      .md3-input::placeholder {
        color: rgba(255, 255, 255, 0.38);
        opacity: 1;
      }

      .md3-input:focus {
        outline: none;
      }

      /* Disabled input state */
      .md3-input:disabled {
        color: rgba(255, 255, 255, 0.38);
        cursor: not-allowed;
      }

      .md3-input-group:has(.md3-input:disabled) {
        background: rgba(255, 255, 255, 0.02);
        border-bottom-style: dotted;
      }

      /* Supporting text for inputs */
      .md3-supporting-text {
        padding: 4px 16px 0;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.6);
        letter-spacing: 0.4px;
      }

      .md3-supporting-text.error {
        color: var(--error-color, #f44336);
      }

      /* Button Group & MD3 Buttons */
      .button-group {
        display: flex;
        gap: var(--spacing-sm);
        justify-content: flex-end;
        flex-wrap: wrap;
        margin-top: var(--spacing-lg);
      }

      /* MD3 Button Styles - Enhanced for Material Design 3 */
      .md3-button {
        height: 40px;
        padding: 0 24px;
        border-radius: 20px; /* Full-rounded MD3 style */
        border: none;
        font-family: 'Roboto', sans-serif;
        font-weight: 500;
        font-size: 0.875rem;
        letter-spacing: 0.1px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        text-transform: none;
        position: relative;
        overflow: hidden;
        user-select: none;
        outline: none;
      }

      /* MD3 State Layer Effect */
      .md3-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: currentColor;
        opacity: 0;
        transition: opacity 0.2s cubic-bezier(0.2, 0, 0, 1);
        pointer-events: none;
      }

      .md3-button:hover::before {
        opacity: 0.08;
      }

      .md3-button:focus-visible::before {
        opacity: 0.12;
      }

      .md3-button:active::before {
        opacity: 0.12;
      }

      /* Focus visible state for accessibility */
      .md3-button:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      /* Primary Filled Button */
      .md3-button.primary {
        background: var(--primary-color, #4caf50);
        color: var(--text-primary-color, #fff);
        box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15);
      }

      .md3-button.primary:hover {
        box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15);
      }

      .md3-button.primary:active {
        box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15);
      }

      /* Tonal Button (MD3 Filled Tonal variant) */
      .md3-button.tonal {
        background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.12);
        color: var(--primary-color, #4caf50);
      }

      .md3-button.tonal:hover {
        background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.16);
        box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15);
      }

      .md3-button.tonal:active {
        background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.12);
      }

      /* Text Button */
      .md3-button.text {
        background: transparent;
        color: var(--primary-color, #4caf50);
        padding: 0 12px;
      }

      .md3-button.text:hover {
        background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.08);
      }

      .md3-button.text:active {
        background: rgba(var(--rgb-primary-color, 76, 175, 80), 0.12);
      }

      /* Danger/Error Button (Outlined variant with error color) */
      .md3-button.danger {
        background: transparent;
        color: var(--error-color, #f44336);
        border: 1px solid currentColor;
      }

      .md3-button.danger::before {
        background: var(--error-color, #f44336);
      }

      .md3-button.danger:hover {
        background: rgba(244, 67, 54, 0.08);
        border-color: var(--error-color, #f44336);
      }

      .md3-button.danger:active {
        background: rgba(244, 67, 54, 0.12);
      }

      .md3-button.danger:focus-visible {
        outline-color: var(--error-color, #f44336);
      }

      /* Disabled state */
      .md3-button:disabled {
        opacity: 0.38;
        cursor: not-allowed;
        box-shadow: none;
      }

      .md3-button:disabled::before {
        display: none;
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
    `],e([ue(),t("design:type",Object)],pn.prototype,"_addPlantDialog",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_defaultApplied",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_plantOverviewDialog",void 0),e([ue(),t("design:type",Set)],pn.prototype,"_optimisticDeletedPlantIds",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_strainLibraryDialog",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_configDialog",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_growMasterDialog",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_strainRecommendationDialog",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_irrigationDialog",void 0),e([ue(),t("design:type",Object)],pn.prototype,"selectedDevice",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_draggedPlant",void 0),e([ue(),t("design:type",Boolean)],pn.prototype,"_isCompactView",void 0),e([ue(),t("design:type",Array)],pn.prototype,"_strainLibrary",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_historyData",void 0),e([ue(),t("design:type",Set)],pn.prototype,"_activeEnvGraphs",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_graphRanges",void 0),e([ue(),t("design:type",Object)],pn.prototype,"_tooltip",void 0),e([ue(),t("design:type",Boolean)],pn.prototype,"_menuOpen",void 0),e([ue(),t("design:type",Boolean)],pn.prototype,"_isEditMode",void 0),e([ue(),t("design:type",Set)],pn.prototype,"_selectedPlants",void 0),e([ue(),t("design:type",Number)],pn.prototype,"_focusedPlantIndex",void 0),e([he({attribute:!1}),t("design:type",Object)],pn.prototype,"hass",void 0),e([he({attribute:!1}),t("design:type",Object)],pn.prototype,"_config",void 0),pn=e([ce("growspace-manager-card")],pn);let hn=class extends oe{constructor(){super(...arguments),this._growspaceOptions=[]}setConfig(e){this._config=e,this._loadGrowspaces()}updated(e){e.has("hass")&&this.hass&&(this._loadGrowspaces(),this._subscribeToSensorUpdates())}disconnectedCallback(){super.disconnectedCallback(),this._unsubStateChanged&&(this._unsubStateChanged(),this._unsubStateChanged=void 0)}_subscribeToSensorUpdates(){this.hass&&!this._unsubStateChanged&&(this._unsubStateChanged=this.hass.connection.subscribeEvents(e=>{const t=e.data.new_state;"sensor.growspaces_list"===t?.entity_id&&(Array.isArray(t.attributes?.growspaces)?this._growspaceOptions=t.attributes.growspaces:this._growspaceOptions=[])},"state_changed"))}_loadGrowspaces(){if(!this.hass)return;const e=this.hass.states["sensor.growspaces_list"];if(e&&e.attributes?.growspaces){const t=e.attributes.growspaces;this._growspaceOptions=Object.values(t)}else this._growspaceOptions=[]}render(){return this._config?j`
      <div class="form-group">
        <label>Default Growspace</label>
        <select
          .value=${this._config.default_growspace??""}
          @change=${e=>this._valueChanged("default_growspace",e.target.value)}
        >
          <option value="">Select a growspace</option>
          ${0===this._growspaceOptions.length?j`<option disabled>No growspaces found</option>`:this._growspaceOptions.map(e=>j`<option value="${e}">${e}</option>`)}
        </select>
      </div>
    `:j``}_valueChanged(e,t){if(!this._config)return;const i={...this._config,[e]:t};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:i},bubbles:!0,composed:!0}))}};hn.styles=o`
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
  `,e([he({attribute:!1}),t("design:type",Object)],hn.prototype,"hass",void 0),e([he({attribute:!1}),t("design:type",Object)],hn.prototype,"_config",void 0),e([ue(),t("design:type",Array)],hn.prototype,"_growspaceOptions",void 0),hn=e([ce("growspace-manager-card-editor")],hn);var un=Object.freeze({__proto__:null,get GrowspaceManagerCardEditor(){return hn}});export{pn as GrowspaceManagerCard};
