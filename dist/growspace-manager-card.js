function e(e,t,i,r){var o,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(n=(a<3?o(n):a>3?o(t,i,n):o(t,i))||n);return a>3&&n&&Object.defineProperty(t,i,n),n}function t(e,t){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(e,t)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const i=globalThis,r=i.ShadowRoot&&(void 0===i.ShadyCSS||i.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),a=new WeakMap;class n{constructor(e,t,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(r&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=a.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&a.set(t,e))}return e}toString(){return this.cssText}}const s=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[r+1],e[0]);return new n(i,e,o)},l=r?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new n("string"==typeof e?e:e+"",void 0,o))(t)})(e):e,{is:d,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:p,getOwnPropertySymbols:u,getPrototypeOf:m}=Object,f=globalThis,v=f.trustedTypes,g=v?v.emptyScript:"",y=f.reactiveElementPolyfillSupport,b=(e,t)=>e,x={toAttribute(e,t){switch(t){case Boolean:e=e?g:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},w=(e,t)=>!d(e,t),_={attribute:!0,type:String,converter:x,reflect:!1,useDefault:!1,hasChanged:w};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),f.litPropertyMetadata??=new WeakMap;class k extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=_){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),r=this.getPropertyDescriptor(e,i,t);void 0!==r&&c(this.prototype,e,r)}}static getPropertyDescriptor(e,t,i){const{get:r,set:o}=h(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){const a=r?.call(this);o?.call(this,t),this.requestUpdate(e,a,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??_}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const e=m(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const e=this.properties,t=[...p(e),...u(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(l(e))}else void 0!==e&&t.push(l(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,t)=>{if(r)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const r of t){const t=document.createElement("style"),o=i.litNonce;void 0!==o&&t.setAttribute("nonce",o),t.textContent=r.cssText,e.appendChild(t)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,i);if(void 0!==r&&!0===i.reflect){const o=(void 0!==i.converter?.toAttribute?i.converter:x).toAttribute(t,i.type);this._$Em=e,null==o?this.removeAttribute(r):this.setAttribute(r,o),this._$Em=null}}_$AK(e,t){const i=this.constructor,r=i._$Eh.get(e);if(void 0!==r&&this._$Em!==r){const e=i.getPropertyOptions(r),o="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:x;this._$Em=r;const a=o.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,i){if(void 0!==e){const r=this.constructor,o=this[e];if(i??=r.getPropertyOptions(e),!((i.hasChanged??w)(o,t)||i.useDefault&&i.reflect&&o===this._$Ej?.get(e)&&!this.hasAttribute(r._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:r,wrapped:o},a){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==o||void 0!==a)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,r=this[t];!0!==e||this._$AL.has(t)||void 0===r||this.C(t,void 0,i,r)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}}k.elementStyles=[],k.shadowRootOptions={mode:"open"},k[b("elementProperties")]=new Map,k[b("finalized")]=new Map,y?.({ReactiveElement:k}),(f.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const $=globalThis,C=$.trustedTypes,S=C?C.createPolicy("lit-html",{createHTML:e=>e}):void 0,D="$lit$",E=`lit$${Math.random().toFixed(9).slice(2)}$`,T="?"+E,A=`<${T}>`,I=document,O=()=>I.createComment(""),L=e=>null===e||"object"!=typeof e&&"function"!=typeof e,z=Array.isArray,M="[ \t\n\f\r]",R=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,P=/-->/g,N=/>/g,V=RegExp(`>|${M}(?:([^\\s"'>=/]+)(${M}*=${M}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),F=/'/g,H=/"/g,U=/^(?:script|style|textarea|title)$/i,q=(e=>(t,...i)=>({_$litType$:e,strings:t,values:i}))(1),B=Symbol.for("lit-noChange"),G=Symbol.for("lit-nothing"),j=new WeakMap,W=I.createTreeWalker(I,129);function Z(e,t){if(!z(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(t):t}const Y=(e,t)=>{const i=e.length-1,r=[];let o,a=2===t?"<svg>":3===t?"<math>":"",n=R;for(let t=0;t<i;t++){const i=e[t];let s,l,d=-1,c=0;for(;c<i.length&&(n.lastIndex=c,l=n.exec(i),null!==l);)c=n.lastIndex,n===R?"!--"===l[1]?n=P:void 0!==l[1]?n=N:void 0!==l[2]?(U.test(l[2])&&(o=RegExp("</"+l[2],"g")),n=V):void 0!==l[3]&&(n=V):n===V?">"===l[0]?(n=o??R,d=-1):void 0===l[1]?d=-2:(d=n.lastIndex-l[2].length,s=l[1],n=void 0===l[3]?V:'"'===l[3]?H:F):n===H||n===F?n=V:n===P||n===N?n=R:(n=V,o=void 0);const h=n===V&&e[t+1].startsWith("/>")?" ":"";a+=n===R?i+A:d>=0?(r.push(s),i.slice(0,d)+D+i.slice(d)+E+h):i+E+(-2===d?t:h)}return[Z(e,a+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),r]};class J{constructor({strings:e,_$litType$:t},i){let r;this.parts=[];let o=0,a=0;const n=e.length-1,s=this.parts,[l,d]=Y(e,t);if(this.el=J.createElement(l,i),W.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(r=W.nextNode())&&s.length<n;){if(1===r.nodeType){if(r.hasAttributes())for(const e of r.getAttributeNames())if(e.endsWith(D)){const t=d[a++],i=r.getAttribute(e).split(E),n=/([.?@])?(.*)/.exec(t);s.push({type:1,index:o,name:n[2],strings:i,ctor:"."===n[1]?te:"?"===n[1]?ie:"@"===n[1]?re:ee}),r.removeAttribute(e)}else e.startsWith(E)&&(s.push({type:6,index:o}),r.removeAttribute(e));if(U.test(r.tagName)){const e=r.textContent.split(E),t=e.length-1;if(t>0){r.textContent=C?C.emptyScript:"";for(let i=0;i<t;i++)r.append(e[i],O()),W.nextNode(),s.push({type:2,index:++o});r.append(e[t],O())}}}else if(8===r.nodeType)if(r.data===T)s.push({type:2,index:o});else{let e=-1;for(;-1!==(e=r.data.indexOf(E,e+1));)s.push({type:7,index:o}),e+=E.length-1}o++}}static createElement(e,t){const i=I.createElement("template");return i.innerHTML=e,i}}function K(e,t,i=e,r){if(t===B)return t;let o=void 0!==r?i._$Co?.[r]:i._$Cl;const a=L(t)?void 0:t._$litDirective$;return o?.constructor!==a&&(o?._$AO?.(!1),void 0===a?o=void 0:(o=new a(e),o._$AT(e,i,r)),void 0!==r?(i._$Co??=[])[r]=o:i._$Cl=o),void 0!==o&&(t=K(e,o._$AS(e,t.values),o,r)),t}class Q{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,r=(e?.creationScope??I).importNode(t,!0);W.currentNode=r;let o=W.nextNode(),a=0,n=0,s=i[0];for(;void 0!==s;){if(a===s.index){let t;2===s.type?t=new X(o,o.nextSibling,this,e):1===s.type?t=new s.ctor(o,s.name,s.strings,this,e):6===s.type&&(t=new oe(o,this,e)),this._$AV.push(t),s=i[++n]}a!==s?.index&&(o=W.nextNode(),a++)}return W.currentNode=I,r}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,r){this.type=2,this._$AH=G,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=K(this,e,t),L(e)?e===G||null==e||""===e?(this._$AH!==G&&this._$AR(),this._$AH=G):e!==this._$AH&&e!==B&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>z(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==G&&L(this._$AH)?this._$AA.nextSibling.data=e:this.T(I.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,r="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=J.createElement(Z(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===r)this._$AH.p(t);else{const e=new Q(r,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=j.get(e.strings);return void 0===t&&j.set(e.strings,t=new J(e)),t}k(e){z(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,r=0;for(const o of e)r===t.length?t.push(i=new X(this.O(O()),this.O(O()),this,this.options)):i=t[r],i._$AI(o),r++;r<t.length&&(this._$AR(i&&i._$AB.nextSibling,r),t.length=r)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=e.nextSibling;e.remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ee{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,r,o){this.type=1,this._$AH=G,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=o,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=G}_$AI(e,t=this,i,r){const o=this.strings;let a=!1;if(void 0===o)e=K(this,e,t,0),a=!L(e)||e!==this._$AH&&e!==B,a&&(this._$AH=e);else{const r=e;let n,s;for(e=o[0],n=0;n<o.length-1;n++)s=K(this,r[i+n],t,n),s===B&&(s=this._$AH[n]),a||=!L(s)||s!==this._$AH[n],s===G?e=G:e!==G&&(e+=(s??"")+o[n+1]),this._$AH[n]=s}a&&!r&&this.j(e)}j(e){e===G?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class te extends ee{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===G?void 0:e}}class ie extends ee{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==G)}}class re extends ee{constructor(e,t,i,r,o){super(e,t,i,r,o),this.type=5}_$AI(e,t=this){if((e=K(this,e,t,0)??G)===B)return;const i=this._$AH,r=e===G&&i!==G||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,o=e!==G&&(i===G||r);r&&this.element.removeEventListener(this.name,this,i),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class oe{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){K(this,e)}}const ae=$.litHtmlPolyfillSupport;ae?.(J,X),($.litHtmlVersions??=[]).push("3.3.1");const ne=(e,t,i)=>{const r=i?.renderBefore??t;let o=r._$litPart$;if(void 0===o){const e=i?.renderBefore??null;r._$litPart$=o=new X(t.insertBefore(O(),e),e,void 0,i??{})}return o._$AI(e),o
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */},se=globalThis;class le extends k{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=ne(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return B}}le._$litElement$=!0,le.finalized=!0,se.litElementHydrateSupport?.({LitElement:le});const de=se.litElementPolyfillSupport;de?.({LitElement:le}),(se.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ce=e=>(t,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)},he={attribute:!0,type:String,converter:x,reflect:!1,hasChanged:w},pe=(e=he,t,i)=>{const{kind:r,metadata:o}=i;let a=globalThis.litPropertyMetadata.get(o);if(void 0===a&&globalThis.litPropertyMetadata.set(o,a=new Map),"setter"===r&&((e=Object.create(e)).wrapped=!0),a.set(i.name,e),"accessor"===r){const{name:r}=i;return{set(i){const o=t.get.call(this);t.set.call(this,i),this.requestUpdate(r,o,e)},init(t){return void 0!==t&&this.C(r,void 0,e,t),t}}}if("setter"===r){const{name:r}=i;return function(i){const o=this[r];t.call(this,i),this.requestUpdate(r,o,e)}}throw Error("Unsupported decorator location: "+r)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ue(e){return(t,i)=>"object"==typeof i?pe(e,t,i):((e,t,i)=>{const r=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),r?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function me(e){return ue({...e,state:!0,attribute:!1})}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const fe=(e,t,i)=>(i.configurable=!0,i.enumerable=!0,Reflect.decorate&&"object"!=typeof t&&Object.defineProperty(e,t,i),i);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ve(e,t){return(i,r,o)=>{const a=t=>t.renderRoot?.querySelector(e)??null;if(t){const{get:e,set:t}="object"==typeof r?i:o??(()=>{const e=Symbol();return{get(){return this[e]},set(t){this[e]=t}}})();return fe(i,r,{get(){let i=e.call(this);return void 0===i&&(i=a(this),(null!==i||this.hasUpdated)&&t.call(this,i)),i}})}return fe(i,r,{get(){return a(this)}})}}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let ge;
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function ye(e){return(t,i)=>{const{slot:r,selector:o}=e??{},a="slot"+(r?`[name=${r}]`:":not([name])");return fe(t,i,{get(){const t=this.renderRoot?.querySelector(a),i=t?.assignedElements(e)??[];return void 0===o?i:i.filter(e=>e.matches(o))}})}}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function be(e){return(t,i)=>{const{slot:r}=e??{},o="slot"+(r?`[name=${r}]`:":not([name])");return fe(t,i,{get(){const t=this.renderRoot?.querySelector(o);return t?.assignedNodes(e)??[]}})}}
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class xe extends le{connectedCallback(){super.connectedCallback(),this.setAttribute("aria-hidden","true")}render(){return q`<span class="shadow"></span>`}}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const we=s`:host,.shadow,.shadow::before,.shadow::after{border-radius:inherit;inset:0;position:absolute;transition-duration:inherit;transition-property:inherit;transition-timing-function:inherit}:host{display:flex;pointer-events:none;transition-property:box-shadow,opacity}.shadow::before,.shadow::after{content:"";transition-property:box-shadow,opacity;--_level: var(--md-elevation-level, 0);--_shadow-color: var(--md-elevation-shadow-color, var(--md-sys-color-shadow, #000))}.shadow::before{box-shadow:0px calc(1px*(clamp(0,var(--_level),1) + clamp(0,var(--_level) - 3,1) + 2*clamp(0,var(--_level) - 4,1))) calc(1px*(2*clamp(0,var(--_level),1) + clamp(0,var(--_level) - 2,1) + clamp(0,var(--_level) - 4,1))) 0px var(--_shadow-color);opacity:.3}.shadow::after{box-shadow:0px calc(1px*(clamp(0,var(--_level),1) + clamp(0,var(--_level) - 1,1) + 2*clamp(0,var(--_level) - 2,3))) calc(1px*(3*clamp(0,var(--_level),2) + 2*clamp(0,var(--_level) - 2,3))) calc(1px*(clamp(0,var(--_level),4) + 2*clamp(0,var(--_level) - 4,1))) var(--_shadow-color);opacity:.15}
`
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let _e=class extends xe{};_e.styles=[we],_e=e([ce("md-elevation")],_e);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const ke=Symbol("attachableController");let $e;$e=new MutationObserver(e=>{for(const t of e)t.target[ke]?.hostConnected()});class Ce{get htmlFor(){return this.host.getAttribute("for")}set htmlFor(e){null===e?this.host.removeAttribute("for"):this.host.setAttribute("for",e)}get control(){return this.host.hasAttribute("for")?this.htmlFor&&this.host.isConnected?this.host.getRootNode().querySelector(`#${this.htmlFor}`):null:this.currentControl||this.host.parentElement}set control(e){e?this.attach(e):this.detach()}constructor(e,t){this.host=e,this.onControlChange=t,this.currentControl=null,e.addController(this),e[ke]=this,$e?.observe(e,{attributeFilter:["for"]})}attach(e){e!==this.currentControl&&(this.setCurrentControl(e),this.host.removeAttribute("for"))}detach(){this.setCurrentControl(null),this.host.setAttribute("for","")}hostConnected(){this.setCurrentControl(this.control)}hostDisconnected(){this.setCurrentControl(null)}setCurrentControl(e){this.onControlChange(this.currentControl,e),this.currentControl=e}}
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Se=["focusin","focusout","pointerdown"];class De extends le{constructor(){super(...arguments),this.visible=!1,this.inward=!1,this.attachableController=new Ce(this,this.onControlChange.bind(this))}get htmlFor(){return this.attachableController.htmlFor}set htmlFor(e){this.attachableController.htmlFor=e}get control(){return this.attachableController.control}set control(e){this.attachableController.control=e}attach(e){this.attachableController.attach(e)}detach(){this.attachableController.detach()}connectedCallback(){super.connectedCallback(),this.setAttribute("aria-hidden","true")}handleEvent(e){if(!e[Ee]){switch(e.type){default:return;case"focusin":this.visible=this.control?.matches(":focus-visible")??!1;break;case"focusout":case"pointerdown":this.visible=!1}e[Ee]=!0}}onControlChange(e,t){for(const i of Se)e?.removeEventListener(i,this),t?.addEventListener(i,this)}update(e){e.has("visible")&&this.dispatchEvent(new Event("visibility-changed")),super.update(e)}}e([ue({type:Boolean,reflect:!0})],De.prototype,"visible",void 0),e([ue({type:Boolean,reflect:!0})],De.prototype,"inward",void 0);const Ee=Symbol("handledByFocusRing"),Te=s`:host{animation-delay:0s,calc(var(--md-focus-ring-duration, 600ms)*.25);animation-duration:calc(var(--md-focus-ring-duration, 600ms)*.25),calc(var(--md-focus-ring-duration, 600ms)*.75);animation-timing-function:cubic-bezier(0.2, 0, 0, 1);box-sizing:border-box;color:var(--md-focus-ring-color, var(--md-sys-color-secondary, #625b71));display:none;pointer-events:none;position:absolute}:host([visible]){display:flex}:host(:not([inward])){animation-name:outward-grow,outward-shrink;border-end-end-radius:calc(var(--md-focus-ring-shape-end-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-end-start-radius:calc(var(--md-focus-ring-shape-end-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-start-end-radius:calc(var(--md-focus-ring-shape-start-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));border-start-start-radius:calc(var(--md-focus-ring-shape-start-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) + var(--md-focus-ring-outward-offset, 2px));inset:calc(-1*var(--md-focus-ring-outward-offset, 2px));outline:var(--md-focus-ring-width, 3px) solid currentColor}:host([inward]){animation-name:inward-grow,inward-shrink;border-end-end-radius:calc(var(--md-focus-ring-shape-end-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-end-start-radius:calc(var(--md-focus-ring-shape-end-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-start-end-radius:calc(var(--md-focus-ring-shape-start-end, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border-start-start-radius:calc(var(--md-focus-ring-shape-start-start, var(--md-focus-ring-shape, var(--md-sys-shape-corner-full, 9999px))) - var(--md-focus-ring-inward-offset, 0px));border:var(--md-focus-ring-width, 3px) solid currentColor;inset:var(--md-focus-ring-inward-offset, 0px)}@keyframes outward-grow{from{outline-width:0}to{outline-width:var(--md-focus-ring-active-width, 8px)}}@keyframes outward-shrink{from{outline-width:var(--md-focus-ring-active-width, 8px)}}@keyframes inward-grow{from{border-width:0}to{border-width:var(--md-focus-ring-active-width, 8px)}}@keyframes inward-shrink{from{border-width:var(--md-focus-ring-active-width, 8px)}}@media(prefers-reduced-motion){:host{animation:none}}
`
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let Ae=class extends De{};Ae.styles=[Te],Ae=e([ce("md-focus-ring")],Ae);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ie=1,Oe=3,Le=4,ze=e=>(...t)=>({_$litDirective$:e,values:t});class Me{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,i){this._$Ct=e,this._$AM=t,this._$Ci=i}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}}
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Re=ze(class extends Me{constructor(e){if(super(e),e.type!==Ie||"class"!==e.name||e.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return" "+Object.keys(e).filter(t=>e[t]).join(" ")+" "}update(e,[t]){if(void 0===this.st){this.st=new Set,void 0!==e.strings&&(this.nt=new Set(e.strings.join(" ").split(/\s/).filter(e=>""!==e)));for(const e in t)t[e]&&!this.nt?.has(e)&&this.st.add(e);return this.render(t)}const i=e.element.classList;for(const e of this.st)e in t||(i.remove(e),this.st.delete(e));for(const e in t){const r=!!t[e];r===this.st.has(e)||this.nt?.has(e)||(r?(i.add(e),this.st.add(e)):(i.remove(e),this.st.delete(e)))}return B}}),Pe="important",Ne=" !"+Pe,Ve=ze(class extends Me{constructor(e){if(super(e),e.type!==Ie||"style"!==e.name||e.strings?.length>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(e){return Object.keys(e).reduce((t,i)=>{const r=e[i];return null==r?t:t+`${i=i.includes("-")?i:i.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,"-$&").toLowerCase()}:${r};`},"")}update(e,[t]){const{style:i}=e.element;if(void 0===this.ft)return this.ft=new Set(Object.keys(t)),this.render(t);for(const e of this.ft)null==t[e]&&(this.ft.delete(e),e.includes("-")?i.removeProperty(e):i[e]=null);for(const e in t){const r=t[e];if(null!=r){this.ft.add(e);const t="string"==typeof r&&r.endsWith(Ne);e.includes("-")||t?i.setProperty(e,t?r.slice(0,-11):r,t?Pe:""):i[e]=r}}return B}}),Fe="cubic-bezier(0.2, 0, 0, 1)",He="cubic-bezier(.3,0,0,1)",Ue="cubic-bezier(.3,0,.8,.15)";
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function qe(e,t=Je){const i=je(e,t);return i&&(i.tabIndex=0,i.focus()),i}function Be(e,t=Je){const i=We(e,t);return i&&(i.tabIndex=0,i.focus()),i}function Ge(e,t=Je){for(let i=0;i<e.length;i++){const r=e[i];if(0===r.tabIndex&&t(r))return{item:r,index:i}}return null}function je(e,t=Je){for(const i of e)if(t(i))return i;return null}function We(e,t=Je){for(let i=e.length-1;i>=0;i--){const r=e[i];if(t(r))return r}return null}function Ze(e,t,i=Je,r=!0){if(t){const o=function(e,t,i=Je,r=!0){for(let o=1;o<e.length;o++){const a=(o+t)%e.length;if(a<t&&!r)return null;const n=e[a];if(i(n))return n}return e[t]?e[t]:null}(e,t.index,i,r);return o&&(o.tabIndex=0,o.focus()),o}return qe(e,i)}function Ye(e,t,i=Je,r=!0){if(t){const o=function(e,t,i=Je,r=!0){for(let o=1;o<e.length;o++){const a=(t-o+e.length)%e.length;if(a>t&&!r)return null;const n=e[a];if(i(n))return n}return e[t]?e[t]:null}(e,t.index,i,r);return o&&(o.tabIndex=0,o.focus()),o}return Be(e,i)}function Je(e){return!e.disabled}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Ke="ArrowDown",Qe="ArrowLeft",Xe="ArrowUp",et="ArrowRight",tt="Home",it="End";class rt{constructor(e){this.handleKeydown=e=>{const t=e.key;if(e.defaultPrevented||!this.isNavigableKey(t))return;const i=this.items;if(!i.length)return;const r=Ge(i,this.isActivatable);e.preventDefault();const o=this.isRtl();let a=null;switch(t){case Ke:case o?Qe:et:a=Ze(i,r,this.isActivatable,this.wrapNavigation());break;case Xe:case o?et:Qe:a=Ye(i,r,this.isActivatable,this.wrapNavigation());break;case tt:a=qe(i,this.isActivatable);break;case it:a=Be(i,this.isActivatable)}a&&r&&r.item!==a&&(r.item.tabIndex=-1)},this.onDeactivateItems=()=>{const e=this.items;for(const t of e)this.deactivateItem(t)},this.onRequestActivation=e=>{this.onDeactivateItems();const t=e.target;this.activateItem(t),t.focus()},this.onSlotchange=()=>{const e=this.items;let t=!1;for(const i of e){!(!i.disabled&&i.tabIndex>-1)||t?i.tabIndex=-1:(t=!0,i.tabIndex=0)}if(t)return;const i=je(e,this.isActivatable);i&&(i.tabIndex=0)};const{isItem:t,getPossibleItems:i,isRtl:r,deactivateItem:o,activateItem:a,isNavigableKey:n,isActivatable:s,wrapNavigation:l}=e;this.isItem=t,this.getPossibleItems=i,this.isRtl=r,this.deactivateItem=o,this.activateItem=a,this.isNavigableKey=n,this.isActivatable=s,this.wrapNavigation=l??(()=>!0)}get items(){const e=this.getPossibleItems(),t=[];for(const i of e){if(this.isItem(i)){t.push(i);continue}const e=i.item;e&&this.isItem(e)&&t.push(e)}return t}activateNextItem(){const e=this.items,t=Ge(e,this.isActivatable);return t&&(t.item.tabIndex=-1),Ze(e,t,this.isActivatable,this.wrapNavigation())}activatePreviousItem(){const e=this.items,t=Ge(e,this.isActivatable);return t&&(t.item.tabIndex=-1),Ye(e,t,this.isActivatable,this.wrapNavigation())}}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const ot=function(e,t){return new CustomEvent("close-menu",{bubbles:!0,composed:!0,detail:{initiator:e,reason:t,itemPath:[e]}})},at={SPACE:"Space",ENTER:"Enter"},nt="click-selection",st="keydown",lt={ESCAPE:"Escape",SPACE:at.SPACE,ENTER:at.ENTER};function dt(e){return Object.values(lt).some(t=>t===e)}function ct(e,t){const i=new Event("md-contains",{bubbles:!0,composed:!0});let r=[];const o=e=>{r=e.composedPath()};t.addEventListener("md-contains",o),e.dispatchEvent(i),t.removeEventListener("md-contains",o);return r.length>0}const ht="none",pt="list-root",ut="first-item",mt="last-item",ft="end-start",vt="start-start";
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class gt{constructor(e,t){this.host=e,this.getProperties=t,this.surfaceStylesInternal={display:"none"},this.lastValues={isOpen:!1},this.host.addController(this)}get surfaceStyles(){return this.surfaceStylesInternal}async position(){const{surfaceEl:e,anchorEl:t,anchorCorner:i,surfaceCorner:r,positioning:o,xOffset:a,yOffset:n,disableBlockFlip:s,disableInlineFlip:l,repositionStrategy:d}=this.getProperties(),c=i.toLowerCase().trim(),h=r.toLowerCase().trim();if(!e||!t)return;const p=window.innerWidth,u=window.innerHeight,m=document.createElement("div");m.style.opacity="0",m.style.position="fixed",m.style.display="block",m.style.inset="0",document.body.appendChild(m);const f=m.getBoundingClientRect();m.remove();const v=window.innerHeight-f.bottom,g=window.innerWidth-f.right;this.surfaceStylesInternal={display:"block",opacity:"0"},this.host.requestUpdate(),await this.host.updateComplete,e.popover&&e.isConnected&&e.showPopover();const y=e.getSurfacePositionClientRect?e.getSurfacePositionClientRect():e.getBoundingClientRect(),b=t.getSurfacePositionClientRect?t.getSurfacePositionClientRect():t.getBoundingClientRect(),[x,w]=h.split("-"),[_,k]=c.split("-"),$="ltr"===getComputedStyle(e).direction;let{blockInset:C,blockOutOfBoundsCorrection:S,surfaceBlockProperty:D}=this.calculateBlock({surfaceRect:y,anchorRect:b,anchorBlock:_,surfaceBlock:x,yOffset:n,positioning:o,windowInnerHeight:u,blockScrollbarHeight:v});if(S&&!s){const e="start"===x?"end":"start",t="start"===_?"end":"start",i=this.calculateBlock({surfaceRect:y,anchorRect:b,anchorBlock:t,surfaceBlock:e,yOffset:n,positioning:o,windowInnerHeight:u,blockScrollbarHeight:v});S>i.blockOutOfBoundsCorrection&&(C=i.blockInset,S=i.blockOutOfBoundsCorrection,D=i.surfaceBlockProperty)}let{inlineInset:E,inlineOutOfBoundsCorrection:T,surfaceInlineProperty:A}=this.calculateInline({surfaceRect:y,anchorRect:b,anchorInline:k,surfaceInline:w,xOffset:a,positioning:o,isLTR:$,windowInnerWidth:p,inlineScrollbarWidth:g});if(T&&!l){const e="start"===w?"end":"start",t="start"===k?"end":"start",i=this.calculateInline({surfaceRect:y,anchorRect:b,anchorInline:t,surfaceInline:e,xOffset:a,positioning:o,isLTR:$,windowInnerWidth:p,inlineScrollbarWidth:g});Math.abs(T)>Math.abs(i.inlineOutOfBoundsCorrection)&&(E=i.inlineInset,T=i.inlineOutOfBoundsCorrection,A=i.surfaceInlineProperty)}"move"===d&&(C-=S,E-=T),this.surfaceStylesInternal={display:"block",opacity:"1",[D]:`${C}px`,[A]:`${E}px`},"resize"===d&&(S&&(this.surfaceStylesInternal.height=y.height-S+"px"),T&&(this.surfaceStylesInternal.width=y.width-T+"px")),this.host.requestUpdate()}calculateBlock(e){const{surfaceRect:t,anchorRect:i,anchorBlock:r,surfaceBlock:o,yOffset:a,positioning:n,windowInnerHeight:s,blockScrollbarHeight:l}=e,d="fixed"===n||"document"===n?1:0,c="document"===n?1:0,h="start"===o?1:0,p="end"===o?1:0,u=(r!==o?1:0)*i.height+a,m=h*i.top+p*(s-i.bottom-l);return{blockInset:d*m+c*(h*window.scrollY-p*window.scrollY)+u,blockOutOfBoundsCorrection:Math.abs(Math.min(0,s-m-u-t.height)),surfaceBlockProperty:"start"===o?"inset-block-start":"inset-block-end"}}calculateInline(e){const{isLTR:t,surfaceInline:i,anchorInline:r,anchorRect:o,surfaceRect:a,xOffset:n,positioning:s,windowInnerWidth:l,inlineScrollbarWidth:d}=e,c="fixed"===s||"document"===s?1:0,h="document"===s?1:0,p=t?1:0,u=t?0:1,m="start"===i?1:0,f="end"===i?1:0,v=(r!==i?1:0)*o.width+n,g=p*(m*o.left+f*(l-o.right-d))+u*(m*(l-o.right-d)+f*o.left);let y="start"===i?"inset-inline-start":"inset-inline-end";return"document"!==s&&"fixed"!==s||(y="start"===i&&t||"end"===i&&!t?"left":"right"),{inlineInset:c*g+v+h*(p*(m*window.scrollX-f*window.scrollX)+u*(f*window.scrollX-m*window.scrollX)),inlineOutOfBoundsCorrection:Math.abs(Math.min(0,l-g-v-a.width)),surfaceInlineProperty:y}}hostUpdate(){this.onUpdate()}hostUpdated(){this.onUpdate()}async onUpdate(){const e=this.getProperties();let t=!1;for(const[i,r]of Object.entries(e))if(t=t||r!==this.lastValues[i],t)break;const i=this.lastValues.isOpen!==e.isOpen,r=!!e.anchorEl,o=!!e.surfaceEl;t&&r&&o&&(this.lastValues.isOpen=e.isOpen,e.isOpen?(this.lastValues=e,await this.position(),e.onOpen()):i&&(await e.beforeClose(),this.close(),e.onClose()))}close(){this.surfaceStylesInternal={display:"none"},this.host.requestUpdate();const e=this.getProperties().surfaceEl;e?.popover&&e?.isConnected&&e.hidePopover()}}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const yt=0,bt=1,xt=2;class wt{constructor(e){this.getProperties=e,this.typeaheadRecords=[],this.typaheadBuffer="",this.cancelTypeaheadTimeout=0,this.isTypingAhead=!1,this.lastActiveRecord=null,this.onKeydown=e=>{this.isTypingAhead?this.typeahead(e):this.beginTypeahead(e)},this.endTypeahead=()=>{this.isTypingAhead=!1,this.typaheadBuffer="",this.typeaheadRecords=[]}}get items(){return this.getProperties().getItems()}get active(){return this.getProperties().active}beginTypeahead(e){this.active&&("Space"===e.code||"Enter"===e.code||e.code.startsWith("Arrow")||"Escape"===e.code||(this.isTypingAhead=!0,this.typeaheadRecords=this.items.map((e,t)=>[t,e,e.typeaheadText.trim().toLowerCase()]),this.lastActiveRecord=this.typeaheadRecords.find(e=>0===e[bt].tabIndex)??null,this.lastActiveRecord&&(this.lastActiveRecord[bt].tabIndex=-1),this.typeahead(e)))}typeahead(e){if(e.defaultPrevented)return;if(clearTimeout(this.cancelTypeaheadTimeout),"Enter"===e.code||e.code.startsWith("Arrow")||"Escape"===e.code)return this.endTypeahead(),void(this.lastActiveRecord&&(this.lastActiveRecord[bt].tabIndex=-1));"Space"===e.code&&e.preventDefault(),this.cancelTypeaheadTimeout=setTimeout(this.endTypeahead,this.getProperties().typeaheadBufferTime),this.typaheadBuffer+=e.key.toLowerCase();const t=this.lastActiveRecord?this.lastActiveRecord[yt]:-1,i=this.typeaheadRecords.length,r=e=>(e[yt]+i-t)%i,o=this.typeaheadRecords.filter(e=>!e[bt].disabled&&e[xt].startsWith(this.typaheadBuffer)).sort((e,t)=>r(e)-r(t));if(0===o.length)return clearTimeout(this.cancelTypeaheadTimeout),this.lastActiveRecord&&(this.lastActiveRecord[bt].tabIndex=-1),void this.endTypeahead();const a=1===this.typaheadBuffer.length;let n;n=this.lastActiveRecord===o[0]&&a?o[1]??o[0]:o[0],this.lastActiveRecord&&(this.lastActiveRecord[bt].tabIndex=-1),this.lastActiveRecord=n,n[bt].tabIndex=0,n[bt].focus()}}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const _t=new Set([Ke,Xe,tt,it]),kt=new Set([Qe,et,..._t]);class $t extends le{get openDirection(){return"start"===this.menuCorner.split("-")[0]?"DOWN":"UP"}get anchorElement(){return this.anchor?this.getRootNode().querySelector(`#${this.anchor}`):this.currentAnchorElement}set anchorElement(e){this.currentAnchorElement=e,this.requestUpdate("anchorElement")}constructor(){super(),this.anchor="",this.positioning="absolute",this.quick=!1,this.hasOverflow=!1,this.open=!1,this.xOffset=0,this.yOffset=0,this.noHorizontalFlip=!1,this.noVerticalFlip=!1,this.typeaheadDelay=200,this.anchorCorner=ft,this.menuCorner=vt,this.stayOpenOnOutsideClick=!1,this.stayOpenOnFocusout=!1,this.skipRestoreFocus=!1,this.defaultFocus=ut,this.noNavigationWrap=!1,this.typeaheadActive=!0,this.isSubmenu=!1,this.pointerPath=[],this.isRepositioning=!1,this.openCloseAnimationSignal=function(){let e=null;return{start:()=>(e?.abort(),e=new AbortController,e.signal),finish(){e=null}}}(),this.listController=new rt({isItem:e=>e.hasAttribute("md-menu-item"),getPossibleItems:()=>this.slotItems,isRtl:()=>"rtl"===getComputedStyle(this).direction,deactivateItem:e=>{e.selected=!1,e.tabIndex=-1},activateItem:e=>{e.selected=!0,e.tabIndex=0},isNavigableKey:e=>{if(!this.isSubmenu)return kt.has(e);return e===("rtl"===getComputedStyle(this).direction?Qe:et)||_t.has(e)},wrapNavigation:()=>!this.noNavigationWrap}),this.lastFocusedElement=null,this.typeaheadController=new wt(()=>({getItems:()=>this.items,typeaheadBufferTime:this.typeaheadDelay,active:this.typeaheadActive})),this.currentAnchorElement=null,this.internals=this.attachInternals(),this.menuPositionController=new gt(this,()=>({anchorCorner:this.anchorCorner,surfaceCorner:this.menuCorner,surfaceEl:this.surfaceEl,anchorEl:this.anchorElement,positioning:"popover"===this.positioning?"document":this.positioning,isOpen:this.open,xOffset:this.xOffset,yOffset:this.yOffset,disableBlockFlip:this.noVerticalFlip,disableInlineFlip:this.noHorizontalFlip,onOpen:this.onOpened,beforeClose:this.beforeClose,onClose:this.onClosed,repositionStrategy:this.hasOverflow&&"popover"!==this.positioning?"move":"resize"})),this.onWindowResize=()=>{this.isRepositioning||"document"!==this.positioning&&"fixed"!==this.positioning&&"popover"!==this.positioning||(this.isRepositioning=!0,this.reposition(),this.isRepositioning=!1)},this.handleFocusout=async e=>{const t=this.anchorElement;if(this.stayOpenOnFocusout||!this.open||this.pointerPath.includes(t))return;if(e.relatedTarget){if(ct(e.relatedTarget,this)||0!==this.pointerPath.length&&ct(e.relatedTarget,t))return}else if(this.pointerPath.includes(this))return;const i=this.skipRestoreFocus;this.skipRestoreFocus=!0,this.close(),await this.updateComplete,this.skipRestoreFocus=i},this.onOpened=async()=>{this.lastFocusedElement=function(e=document){let t=e.activeElement;for(;t&&t?.shadowRoot?.activeElement;)t=t.shadowRoot.activeElement;return t}();const e=this.items,t=Ge(e);t&&this.defaultFocus!==ht&&(t.item.tabIndex=-1);let i=!this.quick;switch(this.quick?this.dispatchEvent(new Event("opening")):i=!!await this.animateOpen(),this.defaultFocus){case ut:const t=je(e);t&&(t.tabIndex=0,t.focus(),await t.updateComplete);break;case mt:const i=We(e);i&&(i.tabIndex=0,i.focus(),await i.updateComplete);break;case pt:this.focus()}i||this.dispatchEvent(new Event("opened"))},this.beforeClose=async()=>{this.open=!1,this.skipRestoreFocus||this.lastFocusedElement?.focus?.(),this.quick||await this.animateClose()},this.onClosed=()=>{this.quick&&(this.dispatchEvent(new Event("closing")),this.dispatchEvent(new Event("closed")))},this.onWindowPointerdown=e=>{this.pointerPath=e.composedPath()},this.onDocumentClick=e=>{if(!this.open)return;const t=e.composedPath();this.stayOpenOnOutsideClick||t.includes(this)||t.includes(this.anchorElement)||(this.open=!1)},this.internals.role="menu",this.addEventListener("keydown",this.handleKeydown),this.addEventListener("keydown",this.captureKeydown,{capture:!0}),this.addEventListener("focusout",this.handleFocusout)}get items(){return this.listController.items}willUpdate(e){e.has("open")&&(this.open?this.removeAttribute("aria-hidden"):this.setAttribute("aria-hidden","true"))}update(e){e.has("open")&&(this.open?this.setUpGlobalEventListeners():this.cleanUpGlobalEventListeners()),e.has("positioning")&&"popover"===this.positioning&&!this.showPopover&&(this.positioning="fixed"),super.update(e)}connectedCallback(){super.connectedCallback(),this.open&&this.setUpGlobalEventListeners()}disconnectedCallback(){super.disconnectedCallback(),this.cleanUpGlobalEventListeners()}getBoundingClientRect(){return this.surfaceEl?this.surfaceEl.getBoundingClientRect():super.getBoundingClientRect()}getClientRects(){return this.surfaceEl?this.surfaceEl.getClientRects():super.getClientRects()}render(){return this.renderSurface()}renderSurface(){return q`
      <div
        class="menu ${Re(this.getSurfaceClasses())}"
        style=${Ve(this.menuPositionController.surfaceStyles)}
        popover=${"popover"===this.positioning?"manual":G}>
        ${this.renderElevation()}
        <div class="items">
          <div class="item-padding"> ${this.renderMenuItems()} </div>
        </div>
      </div>
    `}renderMenuItems(){return q`<slot
      @close-menu=${this.onCloseMenu}
      @deactivate-items=${this.onDeactivateItems}
      @request-activation=${this.onRequestActivation}
      @deactivate-typeahead=${this.handleDeactivateTypeahead}
      @activate-typeahead=${this.handleActivateTypeahead}
      @stay-open-on-focusout=${this.handleStayOpenOnFocusout}
      @close-on-focusout=${this.handleCloseOnFocusout}
      @slotchange=${this.listController.onSlotchange}></slot>`}renderElevation(){return q`<md-elevation part="elevation"></md-elevation>`}getSurfaceClasses(){return{open:this.open,fixed:"fixed"===this.positioning,"has-overflow":this.hasOverflow}}captureKeydown(e){e.target===this&&!e.defaultPrevented&&dt(e.code)&&(e.preventDefault(),this.close()),this.typeaheadController.onKeydown(e)}async animateOpen(){const e=this.surfaceEl,t=this.slotEl;if(!e||!t)return!0;const i=this.openDirection;this.dispatchEvent(new Event("opening")),e.classList.toggle("animating",!0);const r=this.openCloseAnimationSignal.start(),o=e.offsetHeight,a="UP"===i,n=this.items,s=250/n.length,l=e.animate([{height:"0px"},{height:`${o}px`}],{duration:500,easing:He}),d=t.animate([{transform:a?`translateY(-${o}px)`:""},{transform:""}],{duration:500,easing:He}),c=e.animate([{opacity:0},{opacity:1}],50),h=[];for(let e=0;e<n.length;e++){const t=n[a?n.length-1-e:e],i=t.animate([{opacity:0},{opacity:1}],{duration:250,delay:s*e});t.classList.toggle("md-menu-hidden",!0),i.addEventListener("finish",()=>{t.classList.toggle("md-menu-hidden",!1)}),h.push([t,i])}let p=e=>{};const u=new Promise(e=>{p=e});return r.addEventListener("abort",()=>{l.cancel(),d.cancel(),c.cancel(),h.forEach(([e,t])=>{e.classList.toggle("md-menu-hidden",!1),t.cancel()}),p(!0)}),l.addEventListener("finish",()=>{e.classList.toggle("animating",!1),this.openCloseAnimationSignal.finish(),p(!1)}),await u}animateClose(){let e;const t=new Promise(t=>{e=t}),i=this.surfaceEl,r=this.slotEl;if(!i||!r)return e(!1),t;const o="UP"===this.openDirection;this.dispatchEvent(new Event("closing")),i.classList.toggle("animating",!0);const a=this.openCloseAnimationSignal.start(),n=i.offsetHeight,s=this.items,l=150,d=50/s.length,c=i.animate([{height:`${n}px`},{height:.35*n+"px"}],{duration:l,easing:Ue}),h=r.animate([{transform:""},{transform:o?`translateY(-${.65*n}px)`:""}],{duration:l,easing:Ue}),p=i.animate([{opacity:1},{opacity:0}],{duration:50,delay:100}),u=[];for(let e=0;e<s.length;e++){const t=s[o?e:s.length-1-e],i=t.animate([{opacity:1},{opacity:0}],{duration:50,delay:50+d*e});i.addEventListener("finish",()=>{t.classList.toggle("md-menu-hidden",!0)}),u.push([t,i])}return a.addEventListener("abort",()=>{c.cancel(),h.cancel(),p.cancel(),u.forEach(([e,t])=>{t.cancel(),e.classList.toggle("md-menu-hidden",!1)}),e(!1)}),c.addEventListener("finish",()=>{i.classList.toggle("animating",!1),u.forEach(([e])=>{e.classList.toggle("md-menu-hidden",!1)}),this.openCloseAnimationSignal.finish(),this.dispatchEvent(new Event("closed")),e(!0)}),t}handleKeydown(e){this.pointerPath=[],this.listController.handleKeydown(e)}setUpGlobalEventListeners(){document.addEventListener("click",this.onDocumentClick,{capture:!0}),window.addEventListener("pointerdown",this.onWindowPointerdown),document.addEventListener("resize",this.onWindowResize,{passive:!0}),window.addEventListener("resize",this.onWindowResize,{passive:!0})}cleanUpGlobalEventListeners(){document.removeEventListener("click",this.onDocumentClick,{capture:!0}),window.removeEventListener("pointerdown",this.onWindowPointerdown),document.removeEventListener("resize",this.onWindowResize),window.removeEventListener("resize",this.onWindowResize)}onCloseMenu(){this.close()}onDeactivateItems(e){e.stopPropagation(),this.listController.onDeactivateItems()}onRequestActivation(e){e.stopPropagation(),this.listController.onRequestActivation(e)}handleDeactivateTypeahead(e){e.stopPropagation(),this.typeaheadActive=!1}handleActivateTypeahead(e){e.stopPropagation(),this.typeaheadActive=!0}handleStayOpenOnFocusout(e){e.stopPropagation(),this.stayOpenOnFocusout=!0}handleCloseOnFocusout(e){e.stopPropagation(),this.stayOpenOnFocusout=!1}close(){this.open=!1;this.slotItems.forEach(e=>{e.close?.()})}show(){this.open=!0}activateNextItem(){return this.listController.activateNextItem()??null}activatePreviousItem(){return this.listController.activatePreviousItem()??null}reposition(){this.open&&this.menuPositionController.position()}}e([ve(".menu")],$t.prototype,"surfaceEl",void 0),e([ve("slot")],$t.prototype,"slotEl",void 0),e([ue()],$t.prototype,"anchor",void 0),e([ue()],$t.prototype,"positioning",void 0),e([ue({type:Boolean})],$t.prototype,"quick",void 0),e([ue({type:Boolean,attribute:"has-overflow"})],$t.prototype,"hasOverflow",void 0),e([ue({type:Boolean,reflect:!0})],$t.prototype,"open",void 0),e([ue({type:Number,attribute:"x-offset"})],$t.prototype,"xOffset",void 0),e([ue({type:Number,attribute:"y-offset"})],$t.prototype,"yOffset",void 0),e([ue({type:Boolean,attribute:"no-horizontal-flip"})],$t.prototype,"noHorizontalFlip",void 0),e([ue({type:Boolean,attribute:"no-vertical-flip"})],$t.prototype,"noVerticalFlip",void 0),e([ue({type:Number,attribute:"typeahead-delay"})],$t.prototype,"typeaheadDelay",void 0),e([ue({attribute:"anchor-corner"})],$t.prototype,"anchorCorner",void 0),e([ue({attribute:"menu-corner"})],$t.prototype,"menuCorner",void 0),e([ue({type:Boolean,attribute:"stay-open-on-outside-click"})],$t.prototype,"stayOpenOnOutsideClick",void 0),e([ue({type:Boolean,attribute:"stay-open-on-focusout"})],$t.prototype,"stayOpenOnFocusout",void 0),e([ue({type:Boolean,attribute:"skip-restore-focus"})],$t.prototype,"skipRestoreFocus",void 0),e([ue({attribute:"default-focus"})],$t.prototype,"defaultFocus",void 0),e([ue({type:Boolean,attribute:"no-navigation-wrap"})],$t.prototype,"noNavigationWrap",void 0),e([ye({flatten:!0})],$t.prototype,"slotItems",void 0),e([me()],$t.prototype,"typeaheadActive",void 0);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Ct=s`:host{--md-elevation-level: var(--md-menu-container-elevation, 2);--md-elevation-shadow-color: var(--md-menu-container-shadow-color, var(--md-sys-color-shadow, #000));min-width:112px;color:unset;display:contents}md-focus-ring{--md-focus-ring-shape: var(--md-menu-container-shape, var(--md-sys-shape-corner-extra-small, 4px))}.menu{border-radius:var(--md-menu-container-shape, var(--md-sys-shape-corner-extra-small, 4px));display:none;inset:auto;border:none;padding:0px;overflow:visible;background-color:rgba(0,0,0,0);color:inherit;opacity:0;z-index:20;position:absolute;user-select:none;max-height:inherit;height:inherit;min-width:inherit;max-width:inherit;scrollbar-width:inherit}.menu::backdrop{display:none}.fixed{position:fixed}.items{display:block;list-style-type:none;margin:0;outline:none;box-sizing:border-box;background-color:var(--md-menu-container-color, var(--md-sys-color-surface-container, #f3edf7));height:inherit;max-height:inherit;overflow:auto;min-width:inherit;max-width:inherit;border-radius:inherit;scrollbar-width:inherit}.item-padding{padding-block:var(--md-menu-top-space, 8px) var(--md-menu-bottom-space, 8px)}.has-overflow:not([popover]) .items{overflow:visible}.has-overflow.animating .items,.animating .items{overflow:hidden}.has-overflow.animating .items{pointer-events:none}.animating ::slotted(.md-menu-hidden){opacity:0}slot{display:block;height:inherit;max-height:inherit}::slotted(:is(md-divider,[role=separator])){margin:8px 0}@media(forced-colors: active){.menu{border-style:solid;border-color:CanvasText;border-width:1px}}
`
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let St=class extends $t{};St.styles=[Ct],St=e([ce("md-menu")],St);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Dt extends le{constructor(){super(...arguments),this.multiline=!1}render(){return q`
      <slot name="container"></slot>
      <slot class="non-text" name="start"></slot>
      <div class="text">
        <slot name="overline" @slotchange=${this.handleTextSlotChange}></slot>
        <slot
          class="default-slot"
          @slotchange=${this.handleTextSlotChange}></slot>
        <slot name="headline" @slotchange=${this.handleTextSlotChange}></slot>
        <slot
          name="supporting-text"
          @slotchange=${this.handleTextSlotChange}></slot>
      </div>
      <slot class="non-text" name="trailing-supporting-text"></slot>
      <slot class="non-text" name="end"></slot>
    `}handleTextSlotChange(){let e=!1,t=0;for(const i of this.textSlots)if(Et(i)&&(t+=1),t>1){e=!0;break}this.multiline=e}}function Et(e){for(const t of e.assignedNodes({flatten:!0})){const e=t.nodeType===Node.ELEMENT_NODE,i=t.nodeType===Node.TEXT_NODE&&t.textContent?.match(/\S/);if(e||i)return!0}return!1}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */e([ue({type:Boolean,reflect:!0})],Dt.prototype,"multiline",void 0),e([function(e){return(t,i)=>fe(t,i,{get(){return(this.renderRoot??(ge??=document.createDocumentFragment())).querySelectorAll(e)}})}(".text slot")],Dt.prototype,"textSlots",void 0);const Tt=s`:host{color:var(--md-sys-color-on-surface, #1d1b20);font-family:var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-body-large-size, 1rem);font-weight:var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400));line-height:var(--md-sys-typescale-body-large-line-height, 1.5rem);align-items:center;box-sizing:border-box;display:flex;gap:16px;min-height:56px;overflow:hidden;padding:12px 16px;position:relative;text-overflow:ellipsis}:host([multiline]){min-height:72px}[name=overline]{color:var(--md-sys-color-on-surface-variant, #49454f);font-family:var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-label-small-size, 0.6875rem);font-weight:var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500));line-height:var(--md-sys-typescale-label-small-line-height, 1rem)}[name=supporting-text]{color:var(--md-sys-color-on-surface-variant, #49454f);font-family:var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-body-medium-size, 0.875rem);font-weight:var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400));line-height:var(--md-sys-typescale-body-medium-line-height, 1.25rem)}[name=trailing-supporting-text]{color:var(--md-sys-color-on-surface-variant, #49454f);font-family:var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto));font-size:var(--md-sys-typescale-label-small-size, 0.6875rem);font-weight:var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500));line-height:var(--md-sys-typescale-label-small-line-height, 1rem)}[name=container]::slotted(*){inset:0;position:absolute}.default-slot{display:inline}.default-slot,.text ::slotted(*){overflow:hidden;text-overflow:ellipsis}.text{display:flex;flex:1;flex-direction:column;overflow:hidden}
`
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let At=class extends Dt{};At.styles=[Tt],At=e([ce("md-item")],At);var It;!function(e){e[e.INACTIVE=0]="INACTIVE",e[e.TOUCH_DELAY=1]="TOUCH_DELAY",e[e.HOLDING=2]="HOLDING",e[e.WAITING_FOR_CLICK=3]="WAITING_FOR_CLICK"}(It||(It={}));const Ot=["click","contextmenu","pointercancel","pointerdown","pointerenter","pointerleave","pointerup"],Lt=window.matchMedia("(forced-colors: active)");class zt extends le{constructor(){super(...arguments),this.disabled=!1,this.hovered=!1,this.pressed=!1,this.rippleSize="",this.rippleScale="",this.initialSize=0,this.state=It.INACTIVE,this.attachableController=new Ce(this,this.onControlChange.bind(this))}get htmlFor(){return this.attachableController.htmlFor}set htmlFor(e){this.attachableController.htmlFor=e}get control(){return this.attachableController.control}set control(e){this.attachableController.control=e}attach(e){this.attachableController.attach(e)}detach(){this.attachableController.detach()}connectedCallback(){super.connectedCallback(),this.setAttribute("aria-hidden","true")}render(){const e={hovered:this.hovered,pressed:this.pressed};return q`<div class="surface ${Re(e)}"></div>`}update(e){e.has("disabled")&&this.disabled&&(this.hovered=!1,this.pressed=!1),super.update(e)}handlePointerenter(e){this.shouldReactToEvent(e)&&(this.hovered=!0)}handlePointerleave(e){this.shouldReactToEvent(e)&&(this.hovered=!1,this.state!==It.INACTIVE&&this.endPressAnimation())}handlePointerup(e){if(this.shouldReactToEvent(e)){if(this.state!==It.HOLDING)return this.state===It.TOUCH_DELAY?(this.state=It.WAITING_FOR_CLICK,void this.startPressAnimation(this.rippleStartEvent)):void 0;this.state=It.WAITING_FOR_CLICK}}async handlePointerdown(e){if(this.shouldReactToEvent(e)){if(this.rippleStartEvent=e,!this.isTouch(e))return this.state=It.WAITING_FOR_CLICK,void this.startPressAnimation(e);this.state=It.TOUCH_DELAY,await new Promise(e=>{setTimeout(e,150)}),this.state===It.TOUCH_DELAY&&(this.state=It.HOLDING,this.startPressAnimation(e))}}handleClick(){this.disabled||(this.state!==It.WAITING_FOR_CLICK?this.state===It.INACTIVE&&(this.startPressAnimation(),this.endPressAnimation()):this.endPressAnimation())}handlePointercancel(e){this.shouldReactToEvent(e)&&this.endPressAnimation()}handleContextmenu(){this.disabled||this.endPressAnimation()}determineRippleSize(){const{height:e,width:t}=this.getBoundingClientRect(),i=Math.max(e,t),r=Math.max(.35*i,75),o=this.currentCSSZoom??1,a=Math.floor(.2*i/o),n=Math.sqrt(t**2+e**2)+10;this.initialSize=a;const s=(n+r)/a;this.rippleScale=""+s/o,this.rippleSize=`${a}px`}getNormalizedPointerEventCoords(e){const{scrollX:t,scrollY:i}=window,{left:r,top:o}=this.getBoundingClientRect(),a=t+r,n=i+o,{pageX:s,pageY:l}=e,d=this.currentCSSZoom??1;return{x:(s-a)/d,y:(l-n)/d}}getTranslationCoordinates(e){const{height:t,width:i}=this.getBoundingClientRect(),r=this.currentCSSZoom??1,o={x:(i/r-this.initialSize)/2,y:(t/r-this.initialSize)/2};let a;return a=e instanceof PointerEvent?this.getNormalizedPointerEventCoords(e):{x:i/r/2,y:t/r/2},a={x:a.x-this.initialSize/2,y:a.y-this.initialSize/2},{startPoint:a,endPoint:o}}startPressAnimation(e){if(!this.mdRoot)return;this.pressed=!0,this.growAnimation?.cancel(),this.determineRippleSize();const{startPoint:t,endPoint:i}=this.getTranslationCoordinates(e),r=`${t.x}px, ${t.y}px`,o=`${i.x}px, ${i.y}px`;this.growAnimation=this.mdRoot.animate({top:[0,0],left:[0,0],height:[this.rippleSize,this.rippleSize],width:[this.rippleSize,this.rippleSize],transform:[`translate(${r}) scale(1)`,`translate(${o}) scale(${this.rippleScale})`]},{pseudoElement:"::after",duration:450,easing:Fe,fill:"forwards"})}async endPressAnimation(){this.rippleStartEvent=void 0,this.state=It.INACTIVE;const e=this.growAnimation;let t=1/0;"number"==typeof e?.currentTime?t=e.currentTime:e?.currentTime&&(t=e.currentTime.to("ms").value),t>=225?this.pressed=!1:(await new Promise(e=>{setTimeout(e,225-t)}),this.growAnimation===e&&(this.pressed=!1))}shouldReactToEvent(e){if(this.disabled||!e.isPrimary)return!1;if(this.rippleStartEvent&&this.rippleStartEvent.pointerId!==e.pointerId)return!1;if("pointerenter"===e.type||"pointerleave"===e.type)return!this.isTouch(e);const t=1===e.buttons;return this.isTouch(e)||t}isTouch({pointerType:e}){return"touch"===e}async handleEvent(e){if(!Lt?.matches)switch(e.type){case"click":this.handleClick();break;case"contextmenu":this.handleContextmenu();break;case"pointercancel":this.handlePointercancel(e);break;case"pointerdown":await this.handlePointerdown(e);break;case"pointerenter":this.handlePointerenter(e);break;case"pointerleave":this.handlePointerleave(e);break;case"pointerup":this.handlePointerup(e)}}onControlChange(e,t){for(const i of Ot)e?.removeEventListener(i,this),t?.addEventListener(i,this)}}e([ue({type:Boolean,reflect:!0})],zt.prototype,"disabled",void 0),e([me()],zt.prototype,"hovered",void 0),e([me()],zt.prototype,"pressed",void 0),e([ve(".surface")],zt.prototype,"mdRoot",void 0);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Mt=s`:host{display:flex;margin:auto;pointer-events:none}:host([disabled]){display:none}@media(forced-colors: active){:host{display:none}}:host,.surface{border-radius:inherit;position:absolute;inset:0;overflow:hidden}.surface{-webkit-tap-highlight-color:rgba(0,0,0,0)}.surface::before,.surface::after{content:"";opacity:0;position:absolute}.surface::before{background-color:var(--md-ripple-hover-color, var(--md-sys-color-on-surface, #1d1b20));inset:0;transition:opacity 15ms linear,background-color 15ms linear}.surface::after{background:radial-gradient(closest-side, var(--md-ripple-pressed-color, var(--md-sys-color-on-surface, #1d1b20)) max(100% - 70px, 65%), transparent 100%);transform-origin:center center;transition:opacity 375ms linear}.hovered::before{background-color:var(--md-ripple-hover-color, var(--md-sys-color-on-surface, #1d1b20));opacity:var(--md-ripple-hover-opacity, 0.08)}.pressed::after{opacity:var(--md-ripple-pressed-opacity, 0.12);transition-duration:105ms}
`
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let Rt=class extends zt{};Rt.styles=[Mt],Rt=e([ce("md-ripple")],Rt);
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Pt=Symbol.for(""),Nt=e=>{if(e?.r===Pt)return e?._$litStatic$},Vt=(e,...t)=>({_$litStatic$:t.reduce((t,i,r)=>t+(e=>{if(void 0!==e._$litStatic$)return e._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${e}. Use 'unsafeStatic' to pass non-literal values, but\n            take care to ensure page security.`)})(i)+e[r+1],e[0]),r:Pt}),Ft=new Map,Ht=(e=>(t,...i)=>{const r=i.length;let o,a;const n=[],s=[];let l,d=0,c=!1;for(;d<r;){for(l=t[d];d<r&&void 0!==(a=i[d],o=Nt(a));)l+=o+t[++d],c=!0;d!==r&&s.push(a),n.push(l),d++}if(d===r&&n.push(t[r]),c){const e=n.join("$$lit$$");void 0===(t=Ft.get(e))&&(n.raw=n,Ft.set(e,t=n)),i=s}return e(t,...i)})(q),Ut=["role","ariaAtomic","ariaAutoComplete","ariaBusy","ariaChecked","ariaColCount","ariaColIndex","ariaColSpan","ariaCurrent","ariaDisabled","ariaExpanded","ariaHasPopup","ariaHidden","ariaInvalid","ariaKeyShortcuts","ariaLabel","ariaLevel","ariaLive","ariaModal","ariaMultiLine","ariaMultiSelectable","ariaOrientation","ariaPlaceholder","ariaPosInSet","ariaPressed","ariaReadOnly","ariaRequired","ariaRoleDescription","ariaRowCount","ariaRowIndex","ariaRowSpan","ariaSelected","ariaSetSize","ariaSort","ariaValueMax","ariaValueMin","ariaValueNow","ariaValueText"],qt=Ut.map(Gt);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */function Bt(e){return qt.includes(e)}function Gt(e){return e.replace("aria","aria-").replace(/Elements?/g,"").toLowerCase()}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const jt=Symbol("privateIgnoreAttributeChangesFor");function Wt(e){var t;class i extends e{constructor(){super(...arguments),this[t]=new Set}attributeChangedCallback(e,t,i){if(!Bt(e))return void super.attributeChangedCallback(e,t,i);if(this[jt].has(e))return;this[jt].add(e),this.removeAttribute(e),this[jt].delete(e);const r=Yt(e);null===i?delete this.dataset[r]:this.dataset[r]=i,this.requestUpdate(Yt(e),t)}getAttribute(e){return Bt(e)?super.getAttribute(Zt(e)):super.getAttribute(e)}removeAttribute(e){super.removeAttribute(e),Bt(e)&&(super.removeAttribute(Zt(e)),this.requestUpdate())}}return t=jt,function(e){for(const t of Ut){const i=Gt(t),r=Zt(i),o=Yt(i);e.createProperty(t,{attribute:i,noAccessor:!0}),e.createProperty(Symbol(r),{attribute:r,noAccessor:!0}),Object.defineProperty(e.prototype,t,{configurable:!0,enumerable:!0,get(){return this.dataset[o]??null},set(e){const i=this.dataset[o]??null;e!==i&&(null===e?delete this.dataset[o]:this.dataset[o]=e,this.requestUpdate(t,i))}})}}(i),i}function Zt(e){return`data-${e}`}function Yt(e){return e.replace(/-\w/,e=>e[1].toUpperCase())}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class Jt{constructor(e,t){this.host=e,this.internalTypeaheadText=null,this.onClick=()=>{this.host.keepOpen||this.host.dispatchEvent(ot(this.host,{kind:nt}))},this.onKeydown=e=>{if(this.host.href&&"Enter"===e.code){const e=this.getInteractiveElement();e instanceof HTMLAnchorElement&&e.click()}if(e.defaultPrevented)return;const t=e.code;this.host.keepOpen&&"Escape"!==t||dt(t)&&(e.preventDefault(),this.host.dispatchEvent(ot(this.host,{kind:st,key:t})))},this.getHeadlineElements=t.getHeadlineElements,this.getSupportingTextElements=t.getSupportingTextElements,this.getDefaultElements=t.getDefaultElements,this.getInteractiveElement=t.getInteractiveElement,this.host.addController(this)}get typeaheadText(){if(null!==this.internalTypeaheadText)return this.internalTypeaheadText;const e=this.getHeadlineElements(),t=[];return e.forEach(e=>{e.textContent&&e.textContent.trim()&&t.push(e.textContent.trim())}),0===t.length&&this.getDefaultElements().forEach(e=>{e.textContent&&e.textContent.trim()&&t.push(e.textContent.trim())}),0===t.length&&this.getSupportingTextElements().forEach(e=>{e.textContent&&e.textContent.trim()&&t.push(e.textContent.trim())}),t.join(" ")}get tagName(){switch(this.host.type){case"link":return"a";case"button":return"button";default:return"li"}}get role(){return"option"===this.host.type?"option":"menuitem"}hostConnected(){this.host.toggleAttribute("md-menu-item",!0)}hostUpdate(){this.host.href&&(this.host.type="link")}setTypeaheadText(e){this.internalTypeaheadText=e}}
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Kt=Wt(le);class Qt extends Kt{constructor(){super(...arguments),this.disabled=!1,this.type="menuitem",this.href="",this.target="",this.keepOpen=!1,this.selected=!1,this.menuItemController=new Jt(this,{getHeadlineElements:()=>this.headlineElements,getSupportingTextElements:()=>this.supportingTextElements,getDefaultElements:()=>this.defaultElements,getInteractiveElement:()=>this.listItemRoot})}get typeaheadText(){return this.menuItemController.typeaheadText}set typeaheadText(e){this.menuItemController.setTypeaheadText(e)}render(){return this.renderListItem(q`
      <md-item>
        <div slot="container">
          ${this.renderRipple()} ${this.renderFocusRing()}
        </div>
        <slot name="start" slot="start"></slot>
        <slot name="end" slot="end"></slot>
        ${this.renderBody()}
      </md-item>
    `)}renderListItem(e){const t="link"===this.type;let i;switch(this.menuItemController.tagName){case"a":i=Vt`a`;break;case"button":i=Vt`button`;break;default:i=Vt`li`}const r=t&&this.target?this.target:G;return Ht`
      <${i}
        id="item"
        tabindex=${this.disabled&&!t?-1:0}
        role=${this.menuItemController.role}
        aria-label=${this.ariaLabel||G}
        aria-selected=${this.ariaSelected||G}
        aria-checked=${this.ariaChecked||G}
        aria-expanded=${this.ariaExpanded||G}
        aria-haspopup=${this.ariaHasPopup||G}
        class="list-item ${Re(this.getRenderClasses())}"
        href=${this.href||G}
        target=${r}
        @click=${this.menuItemController.onClick}
        @keydown=${this.menuItemController.onKeydown}
      >${e}</${i}>
    `}renderRipple(){return q` <md-ripple
      part="ripple"
      for="item"
      ?disabled=${this.disabled}></md-ripple>`}renderFocusRing(){return q` <md-focus-ring
      part="focus-ring"
      for="item"
      inward></md-focus-ring>`}getRenderClasses(){return{disabled:this.disabled,selected:this.selected}}renderBody(){return q`
      <slot></slot>
      <slot name="overline" slot="overline"></slot>
      <slot name="headline" slot="headline"></slot>
      <slot name="supporting-text" slot="supporting-text"></slot>
      <slot
        name="trailing-supporting-text"
        slot="trailing-supporting-text"></slot>
    `}focus(){this.listItemRoot?.focus()}}Qt.shadowRootOptions={...le.shadowRootOptions,delegatesFocus:!0},e([ue({type:Boolean,reflect:!0})],Qt.prototype,"disabled",void 0),e([ue()],Qt.prototype,"type",void 0),e([ue()],Qt.prototype,"href",void 0),e([ue()],Qt.prototype,"target",void 0),e([ue({type:Boolean,attribute:"keep-open"})],Qt.prototype,"keepOpen",void 0),e([ue({type:Boolean})],Qt.prototype,"selected",void 0),e([ve(".list-item")],Qt.prototype,"listItemRoot",void 0),e([ye({slot:"headline"})],Qt.prototype,"headlineElements",void 0),e([ye({slot:"supporting-text"})],Qt.prototype,"supportingTextElements",void 0),e([be({slot:""})],Qt.prototype,"defaultElements",void 0),e([ue({attribute:"typeahead-text"})],Qt.prototype,"typeaheadText",null);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Xt=s`:host{display:flex;--md-ripple-hover-color: var(--md-menu-item-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-hover-opacity: var(--md-menu-item-hover-state-layer-opacity, 0.08);--md-ripple-pressed-color: var(--md-menu-item-pressed-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-pressed-opacity: var(--md-menu-item-pressed-state-layer-opacity, 0.12)}:host([disabled]){opacity:var(--md-menu-item-disabled-opacity, 0.3);pointer-events:none}md-focus-ring{z-index:1;--md-focus-ring-shape: 8px}a,button,li{background:none;border:none;padding:0;margin:0;text-align:unset;text-decoration:none}.list-item{border-radius:inherit;display:flex;flex:1;max-width:inherit;min-width:inherit;outline:none;-webkit-tap-highlight-color:rgba(0,0,0,0)}.list-item:not(.disabled){cursor:pointer}[slot=container]{pointer-events:none}md-ripple{border-radius:inherit}md-item{border-radius:inherit;flex:1;color:var(--md-menu-item-label-text-color, var(--md-sys-color-on-surface, #1d1b20));font-family:var(--md-menu-item-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-menu-item-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));line-height:var(--md-menu-item-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));font-weight:var(--md-menu-item-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));min-height:var(--md-menu-item-one-line-container-height, 56px);padding-top:var(--md-menu-item-top-space, 12px);padding-bottom:var(--md-menu-item-bottom-space, 12px);padding-inline-start:var(--md-menu-item-leading-space, 16px);padding-inline-end:var(--md-menu-item-trailing-space, 16px)}md-item[multiline]{min-height:var(--md-menu-item-two-line-container-height, 72px)}[slot=supporting-text]{color:var(--md-menu-item-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));font-family:var(--md-menu-item-supporting-text-font, var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-menu-item-supporting-text-size, var(--md-sys-typescale-body-medium-size, 0.875rem));line-height:var(--md-menu-item-supporting-text-line-height, var(--md-sys-typescale-body-medium-line-height, 1.25rem));font-weight:var(--md-menu-item-supporting-text-weight, var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400)))}[slot=trailing-supporting-text]{color:var(--md-menu-item-trailing-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));font-family:var(--md-menu-item-trailing-supporting-text-font, var(--md-sys-typescale-label-small-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-menu-item-trailing-supporting-text-size, var(--md-sys-typescale-label-small-size, 0.6875rem));line-height:var(--md-menu-item-trailing-supporting-text-line-height, var(--md-sys-typescale-label-small-line-height, 1rem));font-weight:var(--md-menu-item-trailing-supporting-text-weight, var(--md-sys-typescale-label-small-weight, var(--md-ref-typeface-weight-medium, 500)))}:is([slot=start],[slot=end])::slotted(*){fill:currentColor}[slot=start]{color:var(--md-menu-item-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f))}[slot=end]{color:var(--md-menu-item-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f))}.list-item{background-color:var(--md-menu-item-container-color, transparent)}.list-item.selected{background-color:var(--md-menu-item-selected-container-color, var(--md-sys-color-secondary-container, #e8def8))}.selected:not(.disabled) ::slotted(*){color:var(--md-menu-item-selected-label-text-color, var(--md-sys-color-on-secondary-container, #1d192b))}@media(forced-colors: active){:host([disabled]),:host([disabled]) slot{color:GrayText;opacity:1}.list-item{position:relative}.list-item.selected::before{content:"";position:absolute;inset:0;box-sizing:border-box;border-radius:inherit;pointer-events:none;border:3px double CanvasText}}
`
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let ei=class extends Qt{};ei.styles=[Xt],ei=e([ce("md-menu-item")],ei);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const ti=Symbol("internals"),ii=Symbol("privateInternals");function ri(e){return class extends e{get[ti](){return this[ii]||(this[ii]=this.attachInternals()),this[ii]}}}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */function oi(e){e.addInitializer(e=>{const t=e;t.addEventListener("click",async e=>{const{type:i,[ti]:r}=t,{form:o}=r;o&&"button"!==i&&(await new Promise(e=>{setTimeout(e)}),e.defaultPrevented||("reset"!==i?(o.addEventListener("submit",e=>{Object.defineProperty(e,"submitter",{configurable:!0,enumerable:!0,get:()=>t})},{capture:!0,once:!0}),r.setFormValue(t.value),o.requestSubmit()):o.reset()))})})}
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */function ai(e,t=!0){return t&&"rtl"===getComputedStyle(e).getPropertyValue("direction").trim()}
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const ni=Wt(ri(le));class si extends ni{get name(){return this.getAttribute("name")??""}set name(e){this.setAttribute("name",e)}get form(){return this[ti].form}get labels(){return this[ti].labels}constructor(){super(),this.disabled=!1,this.softDisabled=!1,this.flipIconInRtl=!1,this.href="",this.download="",this.target="",this.ariaLabelSelected="",this.toggle=!1,this.selected=!1,this.type="submit",this.value="",this.flipIcon=ai(this,this.flipIconInRtl),this.addEventListener("click",this.handleClick.bind(this))}willUpdate(){this.href&&(this.disabled=!1,this.softDisabled=!1)}render(){const e=this.href?Vt`div`:Vt`button`,{ariaLabel:t,ariaHasPopup:i,ariaExpanded:r}=this,o=t&&this.ariaLabelSelected,a=this.toggle?this.selected:G;let n=G;return this.href||(n=o&&this.selected?this.ariaLabelSelected:t),Ht`<${e}
        class="icon-button ${Re(this.getRenderClasses())}"
        id="button"
        aria-label="${n||G}"
        aria-haspopup="${!this.href&&i||G}"
        aria-expanded="${!this.href&&r||G}"
        aria-pressed="${a}"
        aria-disabled=${!this.href&&this.softDisabled||G}
        ?disabled="${!this.href&&this.disabled}"
        @click="${this.handleClickOnChild}">
        ${this.renderFocusRing()}
        ${this.renderRipple()}
        ${this.selected?G:this.renderIcon()}
        ${this.selected?this.renderSelectedIcon():G}
        ${this.href?this.renderLink():this.renderTouchTarget()}
  </${e}>`}renderLink(){const{ariaLabel:e}=this;return q`
      <a
        class="link"
        id="link"
        href="${this.href}"
        download="${this.download||G}"
        target="${this.target||G}"
        aria-label="${e||G}">
        ${this.renderTouchTarget()}
      </a>
    `}getRenderClasses(){return{"flip-icon":this.flipIcon,selected:this.toggle&&this.selected}}renderIcon(){return q`<span class="icon"><slot></slot></span>`}renderSelectedIcon(){return q`<span class="icon icon--selected"
      ><slot name="selected"><slot></slot></slot
    ></span>`}renderTouchTarget(){return q`<span class="touch"></span>`}renderFocusRing(){return q`<md-focus-ring
      part="focus-ring"
      for=${this.href?"link":"button"}></md-focus-ring>`}renderRipple(){const e=!this.href&&(this.disabled||this.softDisabled);return q`<md-ripple
      for=${this.href?"link":G}
      ?disabled="${e}"></md-ripple>`}connectedCallback(){this.flipIcon=ai(this,this.flipIconInRtl),super.connectedCallback()}handleClick(e){if(!this.href&&this.softDisabled)return e.stopImmediatePropagation(),void e.preventDefault()}async handleClickOnChild(e){await 0,!this.toggle||this.disabled||this.softDisabled||e.defaultPrevented||(this.selected=!this.selected,this.dispatchEvent(new InputEvent("input",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("change",{bubbles:!0})))}}oi(si),si.formAssociated=!0,si.shadowRootOptions={mode:"open",delegatesFocus:!0},e([ue({type:Boolean,reflect:!0})],si.prototype,"disabled",void 0),e([ue({type:Boolean,attribute:"soft-disabled",reflect:!0})],si.prototype,"softDisabled",void 0),e([ue({type:Boolean,attribute:"flip-icon-in-rtl"})],si.prototype,"flipIconInRtl",void 0),e([ue()],si.prototype,"href",void 0),e([ue()],si.prototype,"download",void 0),e([ue()],si.prototype,"target",void 0),e([ue({attribute:"aria-label-selected"})],si.prototype,"ariaLabelSelected",void 0),e([ue({type:Boolean})],si.prototype,"toggle",void 0),e([ue({type:Boolean,reflect:!0})],si.prototype,"selected",void 0),e([ue()],si.prototype,"type",void 0),e([ue({reflect:!0})],si.prototype,"value",void 0),e([me()],si.prototype,"flipIcon",void 0);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const li=s`:host{display:inline-flex;outline:none;-webkit-tap-highlight-color:rgba(0,0,0,0);height:var(--_container-height);width:var(--_container-width);justify-content:center}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--_container-height))/2) max(0px,(48px - var(--_container-width))/2)}md-focus-ring{--md-focus-ring-shape-start-start: var(--_container-shape-start-start);--md-focus-ring-shape-start-end: var(--_container-shape-start-end);--md-focus-ring-shape-end-end: var(--_container-shape-end-end);--md-focus-ring-shape-end-start: var(--_container-shape-end-start)}:host(:is([disabled],[soft-disabled])){pointer-events:none}.icon-button{place-items:center;background:none;border:none;box-sizing:border-box;cursor:pointer;display:flex;place-content:center;outline:none;padding:0;position:relative;text-decoration:none;user-select:none;z-index:0;flex:1;border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-start-radius:var(--_container-shape-end-start);border-end-end-radius:var(--_container-shape-end-end)}.icon ::slotted(*){font-size:var(--_icon-size);height:var(--_icon-size);width:var(--_icon-size);font-weight:inherit}md-ripple{z-index:-1;border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-start-radius:var(--_container-shape-end-start);border-end-end-radius:var(--_container-shape-end-end)}.flip-icon .icon{transform:scaleX(-1)}.icon{display:inline-flex}.link{display:grid;height:100%;outline:none;place-items:center;position:absolute;width:100%}.touch{position:absolute;height:max(48px,100%);width:max(48px,100%)}:host([touch-target=none]) .touch{display:none}@media(forced-colors: active){:host(:is([disabled],[soft-disabled])){--_disabled-icon-color: GrayText;--_disabled-icon-opacity: 1}}
`
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */,di=s`:host{--_disabled-icon-color: var(--md-icon-button-disabled-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-icon-opacity: var(--md-icon-button-disabled-icon-opacity, 0.38);--_icon-size: var(--md-icon-button-icon-size, 24px);--_selected-focus-icon-color: var(--md-icon-button-selected-focus-icon-color, var(--md-sys-color-primary, #6750a4));--_selected-hover-icon-color: var(--md-icon-button-selected-hover-icon-color, var(--md-sys-color-primary, #6750a4));--_selected-hover-state-layer-color: var(--md-icon-button-selected-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--_selected-hover-state-layer-opacity: var(--md-icon-button-selected-hover-state-layer-opacity, 0.08);--_selected-icon-color: var(--md-icon-button-selected-icon-color, var(--md-sys-color-primary, #6750a4));--_selected-pressed-icon-color: var(--md-icon-button-selected-pressed-icon-color, var(--md-sys-color-primary, #6750a4));--_selected-pressed-state-layer-color: var(--md-icon-button-selected-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--_selected-pressed-state-layer-opacity: var(--md-icon-button-selected-pressed-state-layer-opacity, 0.12);--_state-layer-height: var(--md-icon-button-state-layer-height, 40px);--_state-layer-shape: var(--md-icon-button-state-layer-shape, var(--md-sys-shape-corner-full, 9999px));--_state-layer-width: var(--md-icon-button-state-layer-width, 40px);--_focus-icon-color: var(--md-icon-button-focus-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-icon-color: var(--md-icon-button-hover-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-state-layer-color: var(--md-icon-button-hover-state-layer-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-state-layer-opacity: var(--md-icon-button-hover-state-layer-opacity, 0.08);--_icon-color: var(--md-icon-button-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_pressed-icon-color: var(--md-icon-button-pressed-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_pressed-state-layer-color: var(--md-icon-button-pressed-state-layer-color, var(--md-sys-color-on-surface-variant, #49454f));--_pressed-state-layer-opacity: var(--md-icon-button-pressed-state-layer-opacity, 0.12);--_container-shape-start-start: 0;--_container-shape-start-end: 0;--_container-shape-end-end: 0;--_container-shape-end-start: 0;--_container-height: 0;--_container-width: 0;height:var(--_state-layer-height);width:var(--_state-layer-width)}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--_state-layer-height))/2) max(0px,(48px - var(--_state-layer-width))/2)}md-focus-ring{--md-focus-ring-shape-start-start: var(--_state-layer-shape);--md-focus-ring-shape-start-end: var(--_state-layer-shape);--md-focus-ring-shape-end-end: var(--_state-layer-shape);--md-focus-ring-shape-end-start: var(--_state-layer-shape)}.standard{background-color:rgba(0,0,0,0);color:var(--_icon-color);--md-ripple-hover-color: var(--_hover-state-layer-color);--md-ripple-hover-opacity: var(--_hover-state-layer-opacity);--md-ripple-pressed-color: var(--_pressed-state-layer-color);--md-ripple-pressed-opacity: var(--_pressed-state-layer-opacity)}.standard:hover{color:var(--_hover-icon-color)}.standard:focus{color:var(--_focus-icon-color)}.standard:active{color:var(--_pressed-icon-color)}.standard:is(:disabled,[aria-disabled=true]){color:var(--_disabled-icon-color)}md-ripple{border-radius:var(--_state-layer-shape)}.standard:is(:disabled,[aria-disabled=true]){opacity:var(--_disabled-icon-opacity)}.selected:not(:disabled,[aria-disabled=true]){color:var(--_selected-icon-color)}.selected:not(:disabled,[aria-disabled=true]):hover{color:var(--_selected-hover-icon-color)}.selected:not(:disabled,[aria-disabled=true]):focus{color:var(--_selected-focus-icon-color)}.selected:not(:disabled,[aria-disabled=true]):active{color:var(--_selected-pressed-icon-color)}.selected{--md-ripple-hover-color: var(--_selected-hover-state-layer-color);--md-ripple-hover-opacity: var(--_selected-hover-state-layer-opacity);--md-ripple-pressed-color: var(--_selected-pressed-state-layer-color);--md-ripple-pressed-opacity: var(--_selected-pressed-state-layer-opacity)}
`
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let ci=class extends si{getRenderClasses(){return{...super.getRenderClasses(),standard:!0}}};ci.styles=[li,di],ci=e([ce("md-icon-button")],ci);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const hi=Symbol("dispatchHooks");const pi=new WeakMap;
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
function ui(e){const t=new MouseEvent("click",{bubbles:!0});return e.dispatchEvent(t),t}function mi(e){return e.currentTarget===e.target&&(e.composedPath()[0]===e.target&&(!e.target.disabled&&!function(e){const t=fi;t&&(e.preventDefault(),e.stopImmediatePropagation());return async function(){fi=!0,await null,fi=!1}
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */(),t}(e)))}let fi=!1;function vi(e,t){!t.bubbles||e.shadowRoot&&!t.composed||t.stopPropagation();const i=Reflect.construct(t.constructor,[t.type,t]),r=e.dispatchEvent(i);return r||t.preventDefault(),r}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const gi=Symbol("createValidator"),yi=Symbol("getValidityAnchor"),bi=Symbol("privateValidator"),xi=Symbol("privateSyncValidity"),wi=Symbol("privateCustomValidationMessage");function _i(e){var t;class i extends e{constructor(){super(...arguments),this[t]=""}get validity(){return this[xi](),this[ti].validity}get validationMessage(){return this[xi](),this[ti].validationMessage}get willValidate(){return this[xi](),this[ti].willValidate}checkValidity(){return this[xi](),this[ti].checkValidity()}reportValidity(){return this[xi](),this[ti].reportValidity()}setCustomValidity(e){this[wi]=e,this[xi]()}requestUpdate(e,t,i){super.requestUpdate(e,t,i),this[xi]()}firstUpdated(e){super.firstUpdated(e),this[xi]()}[(t=wi,xi)](){this[bi]||(this[bi]=this[gi]());const{validity:e,validationMessage:t}=this[bi].getValidity(),i=!!this[wi],r=this[wi]||t;this[ti].setValidity({...e,customError:i},r,this[yi]()??void 0)}[gi](){throw new Error("Implement [createValidator]")}[yi](){throw new Error("Implement [getValidityAnchor]")}}return i}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const ki=Symbol("getFormValue"),$i=Symbol("getFormState");function Ci(t){class i extends t{get form(){return this[ti].form}get labels(){return this[ti].labels}get name(){return this.getAttribute("name")??""}set name(e){this.setAttribute("name",e)}get disabled(){return this.hasAttribute("disabled")}set disabled(e){this.toggleAttribute("disabled",e)}attributeChangedCallback(e,t,i){if("name"===e||"disabled"===e){const i="disabled"===e?null!==t:t;return void this.requestUpdate(e,i)}super.attributeChangedCallback(e,t,i)}requestUpdate(e,t,i){super.requestUpdate(e,t,i),this[ti].setFormValue(this[ki](),this[$i]())}[ki](){throw new Error("Implement [getFormValue]")}[$i](){return this[ki]()}formDisabledCallback(e){this.disabled=e}}return i.formAssociated=!0,e([ue({noAccessor:!0})],i.prototype,"name",null),e([ue({type:Boolean,noAccessor:!0})],i.prototype,"disabled",null),i}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class Si{constructor(e){this.getCurrentState=e,this.currentValidity={validity:{},validationMessage:""}}getValidity(){const e=this.getCurrentState();if(!(!this.prevState||!this.equals(this.prevState,e)))return this.currentValidity;const{validity:t,validationMessage:i}=this.computeValidity(e);return this.prevState=this.copy(e),this.currentValidity={validationMessage:i,validity:{badInput:t.badInput,customError:t.customError,patternMismatch:t.patternMismatch,rangeOverflow:t.rangeOverflow,rangeUnderflow:t.rangeUnderflow,stepMismatch:t.stepMismatch,tooLong:t.tooLong,tooShort:t.tooShort,typeMismatch:t.typeMismatch,valueMissing:t.valueMissing}},this.currentValidity}}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class Di extends Si{computeValidity(e){return this.checkboxControl||(this.checkboxControl=document.createElement("input"),this.checkboxControl.type="checkbox"),this.checkboxControl.checked=e.checked,this.checkboxControl.required=e.required,{validity:this.checkboxControl.validity,validationMessage:this.checkboxControl.validationMessage}}equals(e,t){return e.checked===t.checked&&e.required===t.required}copy({checked:e,required:t}){return{checked:e,required:t}}}
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Ei=Wt(_i(Ci(ri(le))));class Ti extends Ei{constructor(){super(),this.selected=!1,this.icons=!1,this.showOnlySelectedIcon=!1,this.required=!1,this.value="on",this.addEventListener("click",e=>{mi(e)&&this.input&&(this.focus(),ui(this.input))}),function(e,...t){let i=pi.get(e);i||(i=new Set,pi.set(e,i));for(const r of t){if(i.has(r))continue;let t=!1;e.addEventListener(r,i=>{if(t)return;i.stopImmediatePropagation();const r=Reflect.construct(i.constructor,[i.type,i]),o=new EventTarget;r[hi]=o,t=!0;const a=e.dispatchEvent(r);t=!1,a||i.preventDefault(),o.dispatchEvent(new Event("after"))},{capture:!0}),i.add(r)}}(this,"keydown"),this.addEventListener("keydown",e=>{!function(e,t){const i=e[hi];if(!i)throw new Error(`'${e.type}' event needs setupDispatchHooks().`);i.addEventListener("after",t)}(e,()=>{e.defaultPrevented||"Enter"!==e.key||this.disabled||!this.input||this.input.click()})})}render(){return q`
      <div class="switch ${Re(this.getRenderClasses())}">
        <input
          id="switch"
          class="touch"
          type="checkbox"
          role="switch"
          aria-label=${this.ariaLabel||G}
          ?checked=${this.selected}
          ?disabled=${this.disabled}
          ?required=${this.required}
          @input=${this.handleInput}
          @change=${this.handleChange} />

        <md-focus-ring part="focus-ring" for="switch"></md-focus-ring>
        <span class="track"> ${this.renderHandle()} </span>
      </div>
    `}getRenderClasses(){return{selected:this.selected,unselected:!this.selected,disabled:this.disabled}}renderHandle(){const e={"with-icon":this.showOnlySelectedIcon?this.selected:this.icons};return q`
      ${this.renderTouchTarget()}
      <span class="handle-container">
        <md-ripple for="switch" ?disabled="${this.disabled}"></md-ripple>
        <span class="handle ${Re(e)}">
          ${this.shouldShowIcons()?this.renderIcons():q``}
        </span>
      </span>
    `}renderIcons(){return q`
      <div class="icons">
        ${this.renderOnIcon()}
        ${this.showOnlySelectedIcon?q``:this.renderOffIcon()}
      </div>
    `}renderOnIcon(){return q`
      <slot class="icon icon--on" name="on-icon">
        <svg viewBox="0 0 24 24">
          <path
            d="M9.55 18.2 3.65 12.3 5.275 10.675 9.55 14.95 18.725 5.775 20.35 7.4Z" />
        </svg>
      </slot>
    `}renderOffIcon(){return q`
      <slot class="icon icon--off" name="off-icon">
        <svg viewBox="0 0 24 24">
          <path
            d="M6.4 19.2 4.8 17.6 10.4 12 4.8 6.4 6.4 4.8 12 10.4 17.6 4.8 19.2 6.4 13.6 12 19.2 17.6 17.6 19.2 12 13.6Z" />
        </svg>
      </slot>
    `}renderTouchTarget(){return q`<span class="touch"></span>`}shouldShowIcons(){return this.icons||this.showOnlySelectedIcon}handleInput(e){const t=e.target;this.selected=t.checked}handleChange(e){vi(this,e)}[ki](){return this.selected?this.value:null}[$i](){return String(this.selected)}formResetCallback(){this.selected=this.hasAttribute("selected")}formStateRestoreCallback(e){this.selected="true"===e}[gi](){return new Di(()=>({checked:this.selected,required:this.required}))}[yi](){return this.input}}Ti.shadowRootOptions={mode:"open",delegatesFocus:!0},e([ue({type:Boolean})],Ti.prototype,"selected",void 0),e([ue({type:Boolean})],Ti.prototype,"icons",void 0),e([ue({type:Boolean,attribute:"show-only-selected-icon"})],Ti.prototype,"showOnlySelectedIcon",void 0),e([ue({type:Boolean})],Ti.prototype,"required",void 0),e([ue()],Ti.prototype,"value",void 0),e([ve("input")],Ti.prototype,"input",void 0);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Ai=s`@layer styles, hcm;@layer styles{:host{display:inline-flex;outline:none;vertical-align:top;-webkit-tap-highlight-color:rgba(0,0,0,0);cursor:pointer}:host([disabled]){cursor:default}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--md-switch-track-height, 32px))/2) 0px}md-focus-ring{--md-focus-ring-shape-start-start: var(--md-switch-track-shape-start-start, var(--md-switch-track-shape, var(--md-sys-shape-corner-full, 9999px)));--md-focus-ring-shape-start-end: var(--md-switch-track-shape-start-end, var(--md-switch-track-shape, var(--md-sys-shape-corner-full, 9999px)));--md-focus-ring-shape-end-end: var(--md-switch-track-shape-end-end, var(--md-switch-track-shape, var(--md-sys-shape-corner-full, 9999px)));--md-focus-ring-shape-end-start: var(--md-switch-track-shape-end-start, var(--md-switch-track-shape, var(--md-sys-shape-corner-full, 9999px)))}.switch{align-items:center;display:inline-flex;flex-shrink:0;position:relative;width:var(--md-switch-track-width, 52px);height:var(--md-switch-track-height, 32px);border-start-start-radius:var(--md-switch-track-shape-start-start, var(--md-switch-track-shape, var(--md-sys-shape-corner-full, 9999px)));border-start-end-radius:var(--md-switch-track-shape-start-end, var(--md-switch-track-shape, var(--md-sys-shape-corner-full, 9999px)));border-end-end-radius:var(--md-switch-track-shape-end-end, var(--md-switch-track-shape, var(--md-sys-shape-corner-full, 9999px)));border-end-start-radius:var(--md-switch-track-shape-end-start, var(--md-switch-track-shape, var(--md-sys-shape-corner-full, 9999px)))}input{appearance:none;height:max(100%,var(--md-switch-touch-target-size, 48px));outline:none;margin:0;position:absolute;width:max(100%,var(--md-switch-touch-target-size, 48px));z-index:1;cursor:inherit;top:50%;left:50%;transform:translate(-50%, -50%)}:host([touch-target=none]) input{display:none}}@layer styles{.track{position:absolute;width:100%;height:100%;box-sizing:border-box;border-radius:inherit;display:flex;justify-content:center;align-items:center}.track::before{content:"";display:flex;position:absolute;height:100%;width:100%;border-radius:inherit;box-sizing:border-box;transition-property:opacity,background-color;transition-timing-function:linear;transition-duration:67ms}.disabled .track{background-color:rgba(0,0,0,0);border-color:rgba(0,0,0,0)}.disabled .track::before,.disabled .track::after{transition:none;opacity:var(--md-switch-disabled-track-opacity, 0.12)}.disabled .track::before{background-clip:content-box}.selected .track::before{background-color:var(--md-switch-selected-track-color, var(--md-sys-color-primary, #6750a4))}.selected:hover .track::before{background-color:var(--md-switch-selected-hover-track-color, var(--md-sys-color-primary, #6750a4))}.selected:focus-within .track::before{background-color:var(--md-switch-selected-focus-track-color, var(--md-sys-color-primary, #6750a4))}.selected:active .track::before{background-color:var(--md-switch-selected-pressed-track-color, var(--md-sys-color-primary, #6750a4))}.selected.disabled .track{background-clip:border-box}.selected.disabled .track::before{background-color:var(--md-switch-disabled-selected-track-color, var(--md-sys-color-on-surface, #1d1b20))}.unselected .track::before{background-color:var(--md-switch-track-color, var(--md-sys-color-surface-container-highest, #e6e0e9));border-color:var(--md-switch-track-outline-color, var(--md-sys-color-outline, #79747e));border-style:solid;border-width:var(--md-switch-track-outline-width, 2px)}.unselected:hover .track::before{background-color:var(--md-switch-hover-track-color, var(--md-sys-color-surface-container-highest, #e6e0e9));border-color:var(--md-switch-hover-track-outline-color, var(--md-sys-color-outline, #79747e))}.unselected:focus-visible .track::before{background-color:var(--md-switch-focus-track-color, var(--md-sys-color-surface-container-highest, #e6e0e9));border-color:var(--md-switch-focus-track-outline-color, var(--md-sys-color-outline, #79747e))}.unselected:active .track::before{background-color:var(--md-switch-pressed-track-color, var(--md-sys-color-surface-container-highest, #e6e0e9));border-color:var(--md-switch-pressed-track-outline-color, var(--md-sys-color-outline, #79747e))}.unselected.disabled .track::before{background-color:var(--md-switch-disabled-track-color, var(--md-sys-color-surface-container-highest, #e6e0e9));border-color:var(--md-switch-disabled-track-outline-color, var(--md-sys-color-on-surface, #1d1b20))}}@layer hcm{@media(forced-colors: active){.selected .track::before{background:ButtonText;border-color:ButtonText}.disabled .track::before{border-color:GrayText;opacity:1}.disabled.selected .track::before{background:GrayText}}}@layer styles{.handle-container{display:flex;place-content:center;place-items:center;position:relative;transition:margin 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)}.selected .handle-container{margin-inline-start:calc(var(--md-switch-track-width, 52px) - var(--md-switch-track-height, 32px))}.unselected .handle-container{margin-inline-end:calc(var(--md-switch-track-width, 52px) - var(--md-switch-track-height, 32px))}.disabled .handle-container{transition:none}.handle{border-start-start-radius:var(--md-switch-handle-shape-start-start, var(--md-switch-handle-shape, var(--md-sys-shape-corner-full, 9999px)));border-start-end-radius:var(--md-switch-handle-shape-start-end, var(--md-switch-handle-shape, var(--md-sys-shape-corner-full, 9999px)));border-end-end-radius:var(--md-switch-handle-shape-end-end, var(--md-switch-handle-shape, var(--md-sys-shape-corner-full, 9999px)));border-end-start-radius:var(--md-switch-handle-shape-end-start, var(--md-switch-handle-shape, var(--md-sys-shape-corner-full, 9999px)));height:var(--md-switch-handle-height, 16px);width:var(--md-switch-handle-width, 16px);transform-origin:center;transition-property:height,width;transition-duration:250ms,250ms;transition-timing-function:cubic-bezier(0.2, 0, 0, 1),cubic-bezier(0.2, 0, 0, 1);z-index:0}.handle::before{content:"";display:flex;inset:0;position:absolute;border-radius:inherit;box-sizing:border-box;transition:background-color 67ms linear}.disabled .handle,.disabled .handle::before{transition:none}.selected .handle{height:var(--md-switch-selected-handle-height, 24px);width:var(--md-switch-selected-handle-width, 24px)}.handle.with-icon{height:var(--md-switch-with-icon-handle-height, 24px);width:var(--md-switch-with-icon-handle-width, 24px)}.selected:not(.disabled):active .handle,.unselected:not(.disabled):active .handle{height:var(--md-switch-pressed-handle-height, 28px);width:var(--md-switch-pressed-handle-width, 28px);transition-timing-function:linear;transition-duration:100ms}.selected .handle::before{background-color:var(--md-switch-selected-handle-color, var(--md-sys-color-on-primary, #fff))}.selected:hover .handle::before{background-color:var(--md-switch-selected-hover-handle-color, var(--md-sys-color-primary-container, #eaddff))}.selected:focus-within .handle::before{background-color:var(--md-switch-selected-focus-handle-color, var(--md-sys-color-primary-container, #eaddff))}.selected:active .handle::before{background-color:var(--md-switch-selected-pressed-handle-color, var(--md-sys-color-primary-container, #eaddff))}.selected.disabled .handle::before{background-color:var(--md-switch-disabled-selected-handle-color, var(--md-sys-color-surface, #fef7ff));opacity:var(--md-switch-disabled-selected-handle-opacity, 1)}.unselected .handle::before{background-color:var(--md-switch-handle-color, var(--md-sys-color-outline, #79747e))}.unselected:hover .handle::before{background-color:var(--md-switch-hover-handle-color, var(--md-sys-color-on-surface-variant, #49454f))}.unselected:focus-within .handle::before{background-color:var(--md-switch-focus-handle-color, var(--md-sys-color-on-surface-variant, #49454f))}.unselected:active .handle::before{background-color:var(--md-switch-pressed-handle-color, var(--md-sys-color-on-surface-variant, #49454f))}.unselected.disabled .handle::before{background-color:var(--md-switch-disabled-handle-color, var(--md-sys-color-on-surface, #1d1b20));opacity:var(--md-switch-disabled-handle-opacity, 0.38)}md-ripple{border-radius:var(--md-switch-state-layer-shape, var(--md-sys-shape-corner-full, 9999px));height:var(--md-switch-state-layer-size, 40px);inset:unset;width:var(--md-switch-state-layer-size, 40px)}.selected md-ripple{--md-ripple-hover-color: var(--md-switch-selected-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--md-ripple-pressed-color: var(--md-switch-selected-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--md-ripple-hover-opacity: var(--md-switch-selected-hover-state-layer-opacity, 0.08);--md-ripple-pressed-opacity: var(--md-switch-selected-pressed-state-layer-opacity, 0.12)}.unselected md-ripple{--md-ripple-hover-color: var(--md-switch-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-pressed-color: var(--md-switch-pressed-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-hover-opacity: var(--md-switch-hover-state-layer-opacity, 0.08);--md-ripple-pressed-opacity: var(--md-switch-pressed-state-layer-opacity, 0.12)}}@layer hcm{@media(forced-colors: active){.unselected .handle::before{background:ButtonText}.disabled .handle::before{opacity:1}.disabled.unselected .handle::before{background:GrayText}}}@layer styles{.icons{position:relative;height:100%;width:100%}.icon{position:absolute;inset:0;margin:auto;display:flex;align-items:center;justify-content:center;fill:currentColor;transition:fill 67ms linear,opacity 33ms linear,transform 167ms cubic-bezier(0.2, 0, 0, 1);opacity:0}.disabled .icon{transition:none}.selected .icon--on,.unselected .icon--off{opacity:1}.unselected .handle:not(.with-icon) .icon--on{transform:rotate(-45deg)}.icon--off{width:var(--md-switch-icon-size, 16px);height:var(--md-switch-icon-size, 16px);color:var(--md-switch-icon-color, var(--md-sys-color-surface-container-highest, #e6e0e9))}.unselected:hover .icon--off{color:var(--md-switch-hover-icon-color, var(--md-sys-color-surface-container-highest, #e6e0e9))}.unselected:focus-within .icon--off{color:var(--md-switch-focus-icon-color, var(--md-sys-color-surface-container-highest, #e6e0e9))}.unselected:active .icon--off{color:var(--md-switch-pressed-icon-color, var(--md-sys-color-surface-container-highest, #e6e0e9))}.unselected.disabled .icon--off{color:var(--md-switch-disabled-icon-color, var(--md-sys-color-surface-container-highest, #e6e0e9));opacity:var(--md-switch-disabled-icon-opacity, 0.38)}.icon--on{width:var(--md-switch-selected-icon-size, 16px);height:var(--md-switch-selected-icon-size, 16px);color:var(--md-switch-selected-icon-color, var(--md-sys-color-on-primary-container, #21005d))}.selected:hover .icon--on{color:var(--md-switch-selected-hover-icon-color, var(--md-sys-color-on-primary-container, #21005d))}.selected:focus-within .icon--on{color:var(--md-switch-selected-focus-icon-color, var(--md-sys-color-on-primary-container, #21005d))}.selected:active .icon--on{color:var(--md-switch-selected-pressed-icon-color, var(--md-sys-color-on-primary-container, #21005d))}.selected.disabled .icon--on{color:var(--md-switch-disabled-selected-icon-color, var(--md-sys-color-on-surface, #1d1b20));opacity:var(--md-switch-disabled-selected-icon-opacity, 0.38)}}@layer hcm{@media(forced-colors: active){.icon--off{fill:Canvas}.icon--on{fill:ButtonText}.disabled.unselected .icon--off,.disabled.selected .icon--on{opacity:1}.disabled .icon--on{fill:GrayText}}}
`
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let Ii=class extends Ti{};Ii.styles=[Ai],Ii=e([ce("md-switch")],Ii);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Oi extends le{constructor(){super(...arguments),this.inset=!1,this.insetStart=!1,this.insetEnd=!1}}e([ue({type:Boolean,reflect:!0})],Oi.prototype,"inset",void 0),e([ue({type:Boolean,reflect:!0,attribute:"inset-start"})],Oi.prototype,"insetStart",void 0),e([ue({type:Boolean,reflect:!0,attribute:"inset-end"})],Oi.prototype,"insetEnd",void 0);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Li=s`:host{box-sizing:border-box;color:var(--md-divider-color, var(--md-sys-color-outline-variant, #cac4d0));display:flex;height:var(--md-divider-thickness, 1px);width:100%}:host([inset]),:host([inset-start]){padding-inline-start:16px}:host([inset]),:host([inset-end]){padding-inline-end:16px}:host::before{background:currentColor;content:"";height:100%;width:100%}@media(forced-colors: active){:host::before{background:CanvasText}}
`
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let zi=class extends Oi{};zi.styles=[Li],zi=e([ce("md-divider")],zi);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Mi={dialog:[[[{transform:"translateY(-50px)"},{transform:"translateY(0)"}],{duration:500,easing:He}]],scrim:[[[{opacity:0},{opacity:.32}],{duration:500,easing:"linear"}]],container:[[[{opacity:0},{opacity:1}],{duration:50,easing:"linear",pseudoElement:"::before"}],[[{height:"35%"},{height:"100%"}],{duration:500,easing:He,pseudoElement:"::before"}]],headline:[[[{opacity:0},{opacity:0,offset:.2},{opacity:1}],{duration:250,easing:"linear",fill:"forwards"}]],content:[[[{opacity:0},{opacity:0,offset:.2},{opacity:1}],{duration:250,easing:"linear",fill:"forwards"}]],actions:[[[{opacity:0},{opacity:0,offset:.5},{opacity:1}],{duration:300,easing:"linear",fill:"forwards"}]]},Ri={dialog:[[[{transform:"translateY(0)"},{transform:"translateY(-50px)"}],{duration:150,easing:Ue}]],scrim:[[[{opacity:.32},{opacity:0}],{duration:150,easing:"linear"}]],container:[[[{height:"100%"},{height:"35%"}],{duration:150,easing:Ue,pseudoElement:"::before"}],[[{opacity:"1"},{opacity:"0"}],{delay:100,duration:50,easing:"linear",pseudoElement:"::before"}]],headline:[[[{opacity:1},{opacity:0}],{duration:100,easing:"linear",fill:"forwards"}]],content:[[[{opacity:1},{opacity:0}],{duration:100,easing:"linear",fill:"forwards"}]],actions:[[[{opacity:1},{opacity:0}],{duration:100,easing:"linear",fill:"forwards"}]]},Pi=Wt(le);class Ni extends Pi{get open(){return this.isOpen}set open(e){e!==this.isOpen&&(this.isOpen=e,e?(this.setAttribute("open",""),this.show()):(this.removeAttribute("open"),this.close()))}constructor(){super(),this.quick=!1,this.returnValue="",this.noFocusTrap=!1,this.getOpenAnimation=()=>Mi,this.getCloseAnimation=()=>Ri,this.isOpen=!1,this.isOpening=!1,this.isConnectedPromise=this.getIsConnectedPromise(),this.isAtScrollTop=!1,this.isAtScrollBottom=!1,this.nextClickIsFromContent=!1,this.hasHeadline=!1,this.hasActions=!1,this.hasIcon=!1,this.escapePressedWithoutCancel=!1,this.treewalker=document.createTreeWalker(this,NodeFilter.SHOW_ELEMENT),this.addEventListener("submit",this.handleSubmit)}async show(){this.isOpening=!0,await this.isConnectedPromise,await this.updateComplete;const e=this.dialog;if(e.open||!this.isOpening)return void(this.isOpening=!1);if(!this.dispatchEvent(new Event("open",{cancelable:!0})))return this.open=!1,void(this.isOpening=!1);e.showModal(),this.open=!0,this.scroller&&(this.scroller.scrollTop=0),this.querySelector("[autofocus]")?.focus(),await this.animateDialog(this.getOpenAnimation()),this.dispatchEvent(new Event("opened")),this.isOpening=!1}async close(e=this.returnValue){if(this.isOpening=!1,!this.isConnected)return void(this.open=!1);await this.updateComplete;const t=this.dialog;if(!t.open||this.isOpening)return void(this.open=!1);const i=this.returnValue;this.returnValue=e;this.dispatchEvent(new Event("close",{cancelable:!0}))?(await this.animateDialog(this.getCloseAnimation()),t.close(e),this.open=!1,this.dispatchEvent(new Event("closed"))):this.returnValue=i}connectedCallback(){super.connectedCallback(),this.isConnectedPromiseResolve()}disconnectedCallback(){super.disconnectedCallback(),this.isConnectedPromise=this.getIsConnectedPromise()}render(){const e=this.open&&!(this.isAtScrollTop&&this.isAtScrollBottom),t={"has-headline":this.hasHeadline,"has-actions":this.hasActions,"has-icon":this.hasIcon,scrollable:e,"show-top-divider":e&&!this.isAtScrollTop,"show-bottom-divider":e&&!this.isAtScrollBottom},i=this.open&&!this.noFocusTrap,r=q`
      <div
        class="focus-trap"
        tabindex="0"
        aria-hidden="true"
        @focus=${this.handleFocusTrapFocus}></div>
    `,{ariaLabel:o}=this;return q`
      <div class="scrim"></div>
      <dialog
        class=${Re(t)}
        aria-label=${o||G}
        aria-labelledby=${this.hasHeadline?"headline":G}
        role=${"alert"===this.type?"alertdialog":G}
        @cancel=${this.handleCancel}
        @click=${this.handleDialogClick}
        @close=${this.handleClose}
        @keydown=${this.handleKeydown}
        .returnValue=${this.returnValue||G}>
        ${i?r:G}
        <div class="container" @click=${this.handleContentClick}>
          <div class="headline">
            <div class="icon" aria-hidden="true">
              <slot name="icon" @slotchange=${this.handleIconChange}></slot>
            </div>
            <h2 id="headline" aria-hidden=${!this.hasHeadline||G}>
              <slot
                name="headline"
                @slotchange=${this.handleHeadlineChange}></slot>
            </h2>
            <md-divider></md-divider>
          </div>
          <div class="scroller">
            <div class="content">
              <div class="top anchor"></div>
              <slot name="content"></slot>
              <div class="bottom anchor"></div>
            </div>
          </div>
          <div class="actions">
            <md-divider></md-divider>
            <slot name="actions" @slotchange=${this.handleActionsChange}></slot>
          </div>
        </div>
        ${i?r:G}
      </dialog>
    `}firstUpdated(){this.intersectionObserver=new IntersectionObserver(e=>{for(const t of e)this.handleAnchorIntersection(t)},{root:this.scroller}),this.intersectionObserver.observe(this.topAnchor),this.intersectionObserver.observe(this.bottomAnchor)}handleDialogClick(){if(this.nextClickIsFromContent)return void(this.nextClickIsFromContent=!1);!this.dispatchEvent(new Event("cancel",{cancelable:!0}))||this.close()}handleContentClick(){this.nextClickIsFromContent=!0}handleSubmit(e){const t=e.target,{submitter:i}=e;"dialog"===t.getAttribute("method")&&i&&this.close(i.getAttribute("value")??this.returnValue)}handleCancel(e){if(e.target!==this.dialog)return;this.escapePressedWithoutCancel=!1;const t=!vi(this,e);e.preventDefault(),t||this.close()}handleClose(){this.escapePressedWithoutCancel&&(this.escapePressedWithoutCancel=!1,this.dialog?.dispatchEvent(new Event("cancel",{cancelable:!0})))}handleKeydown(e){"Escape"===e.key&&(this.escapePressedWithoutCancel=!0,setTimeout(()=>{this.escapePressedWithoutCancel=!1}))}async animateDialog(e){if(this.cancelAnimations?.abort(),this.cancelAnimations=new AbortController,this.quick)return;const{dialog:t,scrim:i,container:r,headline:o,content:a,actions:n}=this;if(!(t&&i&&r&&o&&a&&n))return;const{container:s,dialog:l,scrim:d,headline:c,content:h,actions:p}=e,u=[[t,l??[]],[i,d??[]],[r,s??[]],[o,c??[]],[a,h??[]],[n,p??[]]],m=[];for(const[e,t]of u)for(const i of t){const t=e.animate(...i);this.cancelAnimations.signal.addEventListener("abort",()=>{t.cancel()}),m.push(t)}await Promise.all(m.map(e=>e.finished.catch(()=>{})))}handleHeadlineChange(e){const t=e.target;this.hasHeadline=t.assignedElements().length>0}handleActionsChange(e){const t=e.target;this.hasActions=t.assignedElements().length>0}handleIconChange(e){const t=e.target;this.hasIcon=t.assignedElements().length>0}handleAnchorIntersection(e){const{target:t,isIntersecting:i}=e;t===this.topAnchor&&(this.isAtScrollTop=i),t===this.bottomAnchor&&(this.isAtScrollBottom=i)}getIsConnectedPromise(){return new Promise(e=>{this.isConnectedPromiseResolve=e})}handleFocusTrapFocus(e){const[t,i]=this.getFirstAndLastFocusableChildren();if(!t||!i)return void this.dialog?.focus();const r=e.target===this.firstFocusTrap,o=!r,a=e.relatedTarget===t,n=e.relatedTarget===i,s=!a&&!n;if(o&&n||r&&s)return void t.focus();(r&&a||o&&s)&&i.focus()}getFirstAndLastFocusableChildren(){if(!this.treewalker)return[null,null];let e=null,t=null;for(this.treewalker.currentNode=this.treewalker.root;this.treewalker.nextNode();){const i=this.treewalker.currentNode;Vi(i)&&(e||(e=i),t=i)}return[e,t]}}function Vi(e){const t=":not(:disabled,[disabled])";if(e.matches(":is(button,input,select,textarea,object,:is(a,area)[href],[tabindex],[contenteditable=true])"+t+':not([tabindex^="-"])'))return!0;return!!e.localName.includes("-")&&(!!e.matches(t)&&(e.shadowRoot?.delegatesFocus??!1))}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */e([ue({type:Boolean})],Ni.prototype,"open",null),e([ue({type:Boolean})],Ni.prototype,"quick",void 0),e([ue({attribute:!1})],Ni.prototype,"returnValue",void 0),e([ue()],Ni.prototype,"type",void 0),e([ue({type:Boolean,attribute:"no-focus-trap"})],Ni.prototype,"noFocusTrap",void 0),e([ve("dialog")],Ni.prototype,"dialog",void 0),e([ve(".scrim")],Ni.prototype,"scrim",void 0),e([ve(".container")],Ni.prototype,"container",void 0),e([ve(".headline")],Ni.prototype,"headline",void 0),e([ve(".content")],Ni.prototype,"content",void 0),e([ve(".actions")],Ni.prototype,"actions",void 0),e([me()],Ni.prototype,"isAtScrollTop",void 0),e([me()],Ni.prototype,"isAtScrollBottom",void 0),e([ve(".scroller")],Ni.prototype,"scroller",void 0),e([ve(".top.anchor")],Ni.prototype,"topAnchor",void 0),e([ve(".bottom.anchor")],Ni.prototype,"bottomAnchor",void 0),e([ve(".focus-trap")],Ni.prototype,"firstFocusTrap",void 0),e([me()],Ni.prototype,"hasHeadline",void 0),e([me()],Ni.prototype,"hasActions",void 0),e([me()],Ni.prototype,"hasIcon",void 0);const Fi=s`:host{border-start-start-radius:var(--md-dialog-container-shape-start-start, var(--md-dialog-container-shape, var(--md-sys-shape-corner-extra-large, 28px)));border-start-end-radius:var(--md-dialog-container-shape-start-end, var(--md-dialog-container-shape, var(--md-sys-shape-corner-extra-large, 28px)));border-end-end-radius:var(--md-dialog-container-shape-end-end, var(--md-dialog-container-shape, var(--md-sys-shape-corner-extra-large, 28px)));border-end-start-radius:var(--md-dialog-container-shape-end-start, var(--md-dialog-container-shape, var(--md-sys-shape-corner-extra-large, 28px)));display:contents;margin:auto;max-height:min(560px,100% - 48px);max-width:min(560px,100% - 48px);min-height:140px;min-width:280px;position:fixed;height:fit-content;width:fit-content}dialog{background:rgba(0,0,0,0);border:none;border-radius:inherit;flex-direction:column;height:inherit;margin:inherit;max-height:inherit;max-width:inherit;min-height:inherit;min-width:inherit;outline:none;overflow:visible;padding:0;width:inherit}dialog[open]{display:flex}::backdrop{background:none}.scrim{background:var(--md-sys-color-scrim, #000);display:none;inset:0;opacity:32%;pointer-events:none;position:fixed;z-index:1}:host([open]) .scrim{display:flex}h2{all:unset;align-self:stretch}.headline{align-items:center;color:var(--md-dialog-headline-color, var(--md-sys-color-on-surface, #1d1b20));display:flex;flex-direction:column;font-family:var(--md-dialog-headline-font, var(--md-sys-typescale-headline-small-font, var(--md-ref-typeface-brand, Roboto)));font-size:var(--md-dialog-headline-size, var(--md-sys-typescale-headline-small-size, 1.5rem));line-height:var(--md-dialog-headline-line-height, var(--md-sys-typescale-headline-small-line-height, 2rem));font-weight:var(--md-dialog-headline-weight, var(--md-sys-typescale-headline-small-weight, var(--md-ref-typeface-weight-regular, 400)));position:relative}slot[name=headline]::slotted(*){align-items:center;align-self:stretch;box-sizing:border-box;display:flex;gap:8px;padding:24px 24px 0}.icon{display:flex}slot[name=icon]::slotted(*){color:var(--md-dialog-icon-color, var(--md-sys-color-secondary, #625b71));fill:currentColor;font-size:var(--md-dialog-icon-size, 24px);margin-top:24px;height:var(--md-dialog-icon-size, 24px);width:var(--md-dialog-icon-size, 24px)}.has-icon slot[name=headline]::slotted(*){justify-content:center;padding-top:16px}.scrollable slot[name=headline]::slotted(*){padding-bottom:16px}.scrollable.has-headline slot[name=content]::slotted(*){padding-top:8px}.container{border-radius:inherit;display:flex;flex-direction:column;flex-grow:1;overflow:hidden;position:relative;transform-origin:top}.container::before{background:var(--md-dialog-container-color, var(--md-sys-color-surface-container-high, #ece6f0));border-radius:inherit;content:"";inset:0;position:absolute}.scroller{display:flex;flex:1;flex-direction:column;overflow:hidden;z-index:1}.scrollable .scroller{overflow-y:scroll}.content{color:var(--md-dialog-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));font-family:var(--md-dialog-supporting-text-font, var(--md-sys-typescale-body-medium-font, var(--md-ref-typeface-plain, Roboto)));font-size:var(--md-dialog-supporting-text-size, var(--md-sys-typescale-body-medium-size, 0.875rem));line-height:var(--md-dialog-supporting-text-line-height, var(--md-sys-typescale-body-medium-line-height, 1.25rem));flex:1;font-weight:var(--md-dialog-supporting-text-weight, var(--md-sys-typescale-body-medium-weight, var(--md-ref-typeface-weight-regular, 400)));height:min-content;position:relative}slot[name=content]::slotted(*){box-sizing:border-box;padding:24px}.anchor{position:absolute}.top.anchor{top:0}.bottom.anchor{bottom:0}.actions{position:relative}slot[name=actions]::slotted(*){box-sizing:border-box;display:flex;gap:8px;justify-content:flex-end;padding:16px 24px 24px}.has-actions slot[name=content]::slotted(*){padding-bottom:8px}md-divider{display:none;position:absolute}.has-headline.show-top-divider .headline md-divider,.has-actions.show-bottom-divider .actions md-divider{display:flex}.headline md-divider{bottom:0}.actions md-divider{top:0}@media(forced-colors: active){dialog{outline:2px solid WindowText}}
`
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let Hi=class extends Ni{};Hi.styles=[Fi],Hi=e([ce("md-dialog")],Hi);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Ui extends le{constructor(){super(...arguments),this.disabled=!1,this.error=!1,this.focused=!1,this.label="",this.noAsterisk=!1,this.populated=!1,this.required=!1,this.resizable=!1,this.supportingText="",this.errorText="",this.count=-1,this.max=-1,this.hasStart=!1,this.hasEnd=!1,this.isAnimating=!1,this.refreshErrorAlert=!1,this.disableTransitions=!1}get counterText(){const e=this.count??-1,t=this.max??-1;return e<0||t<=0?"":`${e} / ${t}`}get supportingOrErrorText(){return this.error&&this.errorText?this.errorText:this.supportingText}reannounceError(){this.refreshErrorAlert=!0}update(e){e.has("disabled")&&void 0!==e.get("disabled")&&(this.disableTransitions=!0),this.disabled&&this.focused&&(e.set("focused",!0),this.focused=!1),this.animateLabelIfNeeded({wasFocused:e.get("focused"),wasPopulated:e.get("populated")}),super.update(e)}render(){const e=this.renderLabel(!0),t=this.renderLabel(!1),i=this.renderOutline?.(e),r={disabled:this.disabled,"disable-transitions":this.disableTransitions,error:this.error&&!this.disabled,focused:this.focused,"with-start":this.hasStart,"with-end":this.hasEnd,populated:this.populated,resizable:this.resizable,required:this.required,"no-label":!this.label};return q`
      <div class="field ${Re(r)}">
        <div class="container-overflow">
          ${this.renderBackground?.()}
          <slot name="container"></slot>
          ${this.renderStateLayer?.()} ${this.renderIndicator?.()} ${i}
          <div class="container">
            <div class="start">
              <slot name="start"></slot>
            </div>
            <div class="middle">
              <div class="label-wrapper">
                ${t} ${i?G:e}
              </div>
              <div class="content">
                <slot></slot>
              </div>
            </div>
            <div class="end">
              <slot name="end"></slot>
            </div>
          </div>
        </div>
        ${this.renderSupportingText()}
      </div>
    `}updated(e){(e.has("supportingText")||e.has("errorText")||e.has("count")||e.has("max"))&&this.updateSlottedAriaDescribedBy(),this.refreshErrorAlert&&requestAnimationFrame(()=>{this.refreshErrorAlert=!1}),this.disableTransitions&&requestAnimationFrame(()=>{this.disableTransitions=!1})}renderSupportingText(){const{supportingOrErrorText:e,counterText:t}=this;if(!e&&!t)return G;const i=q`<span>${e}</span>`,r=t?q`<span class="counter">${t}</span>`:G,o=this.error&&this.errorText&&!this.refreshErrorAlert;return q`
      <div class="supporting-text" role=${o?"alert":G}>${i}${r}</div>
      <slot
        name="aria-describedby"
        @slotchange=${this.updateSlottedAriaDescribedBy}></slot>
    `}updateSlottedAriaDescribedBy(){for(const e of this.slottedAriaDescribedBy)ne(q`${this.supportingOrErrorText} ${this.counterText}`,e),e.setAttribute("hidden","")}renderLabel(e){if(!this.label)return G;let t;t=e?this.focused||this.populated||this.isAnimating:!this.focused&&!this.populated&&!this.isAnimating;const i={hidden:!t,floating:e,resting:!e},r=`${this.label}${this.required&&!this.noAsterisk?"*":""}`;return q`
      <span class="label ${Re(i)}" aria-hidden=${!t}
        >${r}</span
      >
    `}animateLabelIfNeeded({wasFocused:e,wasPopulated:t}){if(!this.label)return;e??=this.focused,t??=this.populated;(e||t)!==(this.focused||this.populated)&&(this.isAnimating=!0,this.labelAnimation?.cancel(),this.labelAnimation=this.floatingLabelEl?.animate(this.getLabelKeyframes(),{duration:150,easing:Fe}),this.labelAnimation?.addEventListener("finish",()=>{this.isAnimating=!1}))}getLabelKeyframes(){const{floatingLabelEl:e,restingLabelEl:t}=this;if(!e||!t)return[];const{x:i,y:r,height:o}=e.getBoundingClientRect(),{x:a,y:n,height:s}=t.getBoundingClientRect(),l=e.scrollWidth,d=t.scrollWidth,c=d/l,h=`translateX(${a-i}px) translateY(${n-r+Math.round((s-o*c)/2)}px) scale(${c})`,p="translateX(0) translateY(0) scale(1)",u=t.clientWidth,m=d>u?u/c+"px":"";return this.focused||this.populated?[{transform:h,width:m},{transform:p,width:m}]:[{transform:p,width:m},{transform:h,width:m}]}getSurfacePositionClientRect(){return this.containerEl.getBoundingClientRect()}}e([ue({type:Boolean})],Ui.prototype,"disabled",void 0),e([ue({type:Boolean})],Ui.prototype,"error",void 0),e([ue({type:Boolean})],Ui.prototype,"focused",void 0),e([ue()],Ui.prototype,"label",void 0),e([ue({type:Boolean,attribute:"no-asterisk"})],Ui.prototype,"noAsterisk",void 0),e([ue({type:Boolean})],Ui.prototype,"populated",void 0),e([ue({type:Boolean})],Ui.prototype,"required",void 0),e([ue({type:Boolean})],Ui.prototype,"resizable",void 0),e([ue({attribute:"supporting-text"})],Ui.prototype,"supportingText",void 0),e([ue({attribute:"error-text"})],Ui.prototype,"errorText",void 0),e([ue({type:Number})],Ui.prototype,"count",void 0),e([ue({type:Number})],Ui.prototype,"max",void 0),e([ue({type:Boolean,attribute:"has-start"})],Ui.prototype,"hasStart",void 0),e([ue({type:Boolean,attribute:"has-end"})],Ui.prototype,"hasEnd",void 0),e([ye({slot:"aria-describedby"})],Ui.prototype,"slottedAriaDescribedBy",void 0),e([me()],Ui.prototype,"isAnimating",void 0),e([me()],Ui.prototype,"refreshErrorAlert",void 0),e([me()],Ui.prototype,"disableTransitions",void 0),e([ve(".label.floating")],Ui.prototype,"floatingLabelEl",void 0),e([ve(".label.resting")],Ui.prototype,"restingLabelEl",void 0),e([ve(".container")],Ui.prototype,"containerEl",void 0);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class qi extends Ui{renderBackground(){return q` <div class="background"></div> `}renderStateLayer(){return q` <div class="state-layer"></div> `}renderIndicator(){return q`<div class="active-indicator"></div>`}}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Bi=s`@layer styles{:host{--_active-indicator-color: var(--md-filled-field-active-indicator-color, var(--md-sys-color-on-surface-variant, #49454f));--_active-indicator-height: var(--md-filled-field-active-indicator-height, 1px);--_bottom-space: var(--md-filled-field-bottom-space, 16px);--_container-color: var(--md-filled-field-container-color, var(--md-sys-color-surface-container-highest, #e6e0e9));--_content-color: var(--md-filled-field-content-color, var(--md-sys-color-on-surface, #1d1b20));--_content-font: var(--md-filled-field-content-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_content-line-height: var(--md-filled-field-content-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_content-size: var(--md-filled-field-content-size, var(--md-sys-typescale-body-large-size, 1rem));--_content-space: var(--md-filled-field-content-space, 16px);--_content-weight: var(--md-filled-field-content-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_disabled-active-indicator-color: var(--md-filled-field-disabled-active-indicator-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-active-indicator-height: var(--md-filled-field-disabled-active-indicator-height, 1px);--_disabled-active-indicator-opacity: var(--md-filled-field-disabled-active-indicator-opacity, 0.38);--_disabled-container-color: var(--md-filled-field-disabled-container-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-container-opacity: var(--md-filled-field-disabled-container-opacity, 0.04);--_disabled-content-color: var(--md-filled-field-disabled-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-content-opacity: var(--md-filled-field-disabled-content-opacity, 0.38);--_disabled-label-text-color: var(--md-filled-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-filled-field-disabled-label-text-opacity, 0.38);--_disabled-leading-content-color: var(--md-filled-field-disabled-leading-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-leading-content-opacity: var(--md-filled-field-disabled-leading-content-opacity, 0.38);--_disabled-supporting-text-color: var(--md-filled-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-supporting-text-opacity: var(--md-filled-field-disabled-supporting-text-opacity, 0.38);--_disabled-trailing-content-color: var(--md-filled-field-disabled-trailing-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-trailing-content-opacity: var(--md-filled-field-disabled-trailing-content-opacity, 0.38);--_error-active-indicator-color: var(--md-filled-field-error-active-indicator-color, var(--md-sys-color-error, #b3261e));--_error-content-color: var(--md-filled-field-error-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-active-indicator-color: var(--md-filled-field-error-focus-active-indicator-color, var(--md-sys-color-error, #b3261e));--_error-focus-content-color: var(--md-filled-field-error-focus-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-label-text-color: var(--md-filled-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-leading-content-color: var(--md-filled-field-error-focus-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-supporting-text-color: var(--md-filled-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-trailing-content-color: var(--md-filled-field-error-focus-trailing-content-color, var(--md-sys-color-error, #b3261e));--_error-hover-active-indicator-color: var(--md-filled-field-error-hover-active-indicator-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-content-color: var(--md-filled-field-error-hover-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-label-text-color: var(--md-filled-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-leading-content-color: var(--md-filled-field-error-hover-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-hover-state-layer-color: var(--md-filled-field-error-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-state-layer-opacity: var(--md-filled-field-error-hover-state-layer-opacity, 0.08);--_error-hover-supporting-text-color: var(--md-filled-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-hover-trailing-content-color: var(--md-filled-field-error-hover-trailing-content-color, var(--md-sys-color-on-error-container, #410e0b));--_error-label-text-color: var(--md-filled-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_error-leading-content-color: var(--md-filled-field-error-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-supporting-text-color: var(--md-filled-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-trailing-content-color: var(--md-filled-field-error-trailing-content-color, var(--md-sys-color-error, #b3261e));--_focus-active-indicator-color: var(--md-filled-field-focus-active-indicator-color, var(--md-sys-color-primary, #6750a4));--_focus-active-indicator-height: var(--md-filled-field-focus-active-indicator-height, 3px);--_focus-content-color: var(--md-filled-field-focus-content-color, var(--md-sys-color-on-surface, #1d1b20));--_focus-label-text-color: var(--md-filled-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_focus-leading-content-color: var(--md-filled-field-focus-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-supporting-text-color: var(--md-filled-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-trailing-content-color: var(--md-filled-field-focus-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-active-indicator-color: var(--md-filled-field-hover-active-indicator-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-active-indicator-height: var(--md-filled-field-hover-active-indicator-height, 1px);--_hover-content-color: var(--md-filled-field-hover-content-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-label-text-color: var(--md-filled-field-hover-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-leading-content-color: var(--md-filled-field-hover-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-state-layer-color: var(--md-filled-field-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-state-layer-opacity: var(--md-filled-field-hover-state-layer-opacity, 0.08);--_hover-supporting-text-color: var(--md-filled-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-trailing-content-color: var(--md-filled-field-hover-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-color: var(--md-filled-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-font: var(--md-filled-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-filled-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_label-text-populated-line-height: var(--md-filled-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_label-text-populated-size: var(--md-filled-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_label-text-size: var(--md-filled-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_label-text-weight: var(--md-filled-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_leading-content-color: var(--md-filled-field-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_leading-space: var(--md-filled-field-leading-space, 16px);--_supporting-text-color: var(--md-filled-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_supporting-text-font: var(--md-filled-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_supporting-text-leading-space: var(--md-filled-field-supporting-text-leading-space, 16px);--_supporting-text-line-height: var(--md-filled-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_supporting-text-size: var(--md-filled-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_supporting-text-top-space: var(--md-filled-field-supporting-text-top-space, 4px);--_supporting-text-trailing-space: var(--md-filled-field-supporting-text-trailing-space, 16px);--_supporting-text-weight: var(--md-filled-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_top-space: var(--md-filled-field-top-space, 16px);--_trailing-content-color: var(--md-filled-field-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_trailing-space: var(--md-filled-field-trailing-space, 16px);--_with-label-bottom-space: var(--md-filled-field-with-label-bottom-space, 8px);--_with-label-top-space: var(--md-filled-field-with-label-top-space, 8px);--_with-leading-content-leading-space: var(--md-filled-field-with-leading-content-leading-space, 12px);--_with-trailing-content-trailing-space: var(--md-filled-field-with-trailing-content-trailing-space, 12px);--_container-shape-start-start: var(--md-filled-field-container-shape-start-start, var(--md-filled-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-start-end: var(--md-filled-field-container-shape-start-end, var(--md-filled-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-end: var(--md-filled-field-container-shape-end-end, var(--md-filled-field-container-shape, var(--md-sys-shape-corner-none, 0px)));--_container-shape-end-start: var(--md-filled-field-container-shape-end-start, var(--md-filled-field-container-shape, var(--md-sys-shape-corner-none, 0px)))}.background,.state-layer{border-radius:inherit;inset:0;pointer-events:none;position:absolute}.background{background:var(--_container-color)}.state-layer{visibility:hidden}.field:not(.disabled):hover .state-layer{visibility:visible}.label.floating{position:absolute;top:var(--_with-label-top-space)}.field:not(.with-start) .label-wrapper{margin-inline-start:var(--_leading-space)}.field:not(.with-end) .label-wrapper{margin-inline-end:var(--_trailing-space)}.active-indicator{inset:auto 0 0 0;pointer-events:none;position:absolute;width:100%;z-index:1}.active-indicator::before,.active-indicator::after{border-bottom:var(--_active-indicator-height) solid var(--_active-indicator-color);inset:auto 0 0 0;content:"";position:absolute;width:100%}.active-indicator::after{opacity:0;transition:opacity 150ms cubic-bezier(0.2, 0, 0, 1)}.focused .active-indicator::after{opacity:1}.field:not(.with-start) .content ::slotted(*){padding-inline-start:var(--_leading-space)}.field:not(.with-end) .content ::slotted(*){padding-inline-end:var(--_trailing-space)}.field:not(.no-label) .content ::slotted(:not(textarea)){padding-bottom:var(--_with-label-bottom-space);padding-top:calc(var(--_with-label-top-space) + var(--_label-text-populated-line-height))}.field:not(.no-label) .content ::slotted(textarea){margin-bottom:var(--_with-label-bottom-space);margin-top:calc(var(--_with-label-top-space) + var(--_label-text-populated-line-height))}:hover .active-indicator::before{border-bottom-color:var(--_hover-active-indicator-color);border-bottom-width:var(--_hover-active-indicator-height)}.active-indicator::after{border-bottom-color:var(--_focus-active-indicator-color);border-bottom-width:var(--_focus-active-indicator-height)}:hover .state-layer{background:var(--_hover-state-layer-color);opacity:var(--_hover-state-layer-opacity)}.disabled .active-indicator::before{border-bottom-color:var(--_disabled-active-indicator-color);border-bottom-width:var(--_disabled-active-indicator-height);opacity:var(--_disabled-active-indicator-opacity)}.disabled .background{background:var(--_disabled-container-color);opacity:var(--_disabled-container-opacity)}.error .active-indicator::before{border-bottom-color:var(--_error-active-indicator-color)}.error:hover .active-indicator::before{border-bottom-color:var(--_error-hover-active-indicator-color)}.error:hover .state-layer{background:var(--_error-hover-state-layer-color);opacity:var(--_error-hover-state-layer-opacity)}.error .active-indicator::after{border-bottom-color:var(--_error-focus-active-indicator-color)}.resizable .container{bottom:var(--_focus-active-indicator-height);clip-path:inset(var(--_focus-active-indicator-height) 0 0 0)}.resizable .container>*{top:var(--_focus-active-indicator-height)}}@layer hcm{@media(forced-colors: active){.disabled .active-indicator::before{border-color:GrayText;opacity:1}}}
`
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */,Gi=s`:host{display:inline-flex;resize:both}.field{display:flex;flex:1;flex-direction:column;writing-mode:horizontal-tb;max-width:100%}.container-overflow{border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-end-radius:var(--_container-shape-end-end);border-end-start-radius:var(--_container-shape-end-start);display:flex;height:100%;position:relative}.container{align-items:center;border-radius:inherit;display:flex;flex:1;max-height:100%;min-height:100%;min-width:min-content;position:relative}.field,.container-overflow{resize:inherit}.resizable:not(.disabled) .container{resize:inherit;overflow:hidden}.disabled{pointer-events:none}slot[name=container]{border-radius:inherit}slot[name=container]::slotted(*){border-radius:inherit;inset:0;pointer-events:none;position:absolute}@layer styles{.start,.middle,.end{display:flex;box-sizing:border-box;height:100%;position:relative}.start{color:var(--_leading-content-color)}.end{color:var(--_trailing-content-color)}.start,.end{align-items:center;justify-content:center}.with-start .start{margin-inline:var(--_with-leading-content-leading-space) var(--_content-space)}.with-end .end{margin-inline:var(--_content-space) var(--_with-trailing-content-trailing-space)}.middle{align-items:stretch;align-self:baseline;flex:1}.content{color:var(--_content-color);display:flex;flex:1;opacity:0;transition:opacity 83ms cubic-bezier(0.2, 0, 0, 1)}.no-label .content,.focused .content,.populated .content{opacity:1;transition-delay:67ms}:is(.disabled,.disable-transitions) .content{transition:none}.content ::slotted(*){all:unset;color:currentColor;font-family:var(--_content-font);font-size:var(--_content-size);line-height:var(--_content-line-height);font-weight:var(--_content-weight);width:100%;overflow-wrap:revert;white-space:revert}.content ::slotted(:not(textarea)){padding-top:var(--_top-space);padding-bottom:var(--_bottom-space)}.content ::slotted(textarea){margin-top:var(--_top-space);margin-bottom:var(--_bottom-space)}:hover .content{color:var(--_hover-content-color)}:hover .start{color:var(--_hover-leading-content-color)}:hover .end{color:var(--_hover-trailing-content-color)}.focused .content{color:var(--_focus-content-color)}.focused .start{color:var(--_focus-leading-content-color)}.focused .end{color:var(--_focus-trailing-content-color)}.disabled .content{color:var(--_disabled-content-color)}.disabled.no-label .content,.disabled.focused .content,.disabled.populated .content{opacity:var(--_disabled-content-opacity)}.disabled .start{color:var(--_disabled-leading-content-color);opacity:var(--_disabled-leading-content-opacity)}.disabled .end{color:var(--_disabled-trailing-content-color);opacity:var(--_disabled-trailing-content-opacity)}.error .content{color:var(--_error-content-color)}.error .start{color:var(--_error-leading-content-color)}.error .end{color:var(--_error-trailing-content-color)}.error:hover .content{color:var(--_error-hover-content-color)}.error:hover .start{color:var(--_error-hover-leading-content-color)}.error:hover .end{color:var(--_error-hover-trailing-content-color)}.error.focused .content{color:var(--_error-focus-content-color)}.error.focused .start{color:var(--_error-focus-leading-content-color)}.error.focused .end{color:var(--_error-focus-trailing-content-color)}}@layer hcm{@media(forced-colors: active){.disabled :is(.start,.content,.end){color:GrayText;opacity:1}}}@layer styles{.label{box-sizing:border-box;color:var(--_label-text-color);overflow:hidden;max-width:100%;text-overflow:ellipsis;white-space:nowrap;z-index:1;font-family:var(--_label-text-font);font-size:var(--_label-text-size);line-height:var(--_label-text-line-height);font-weight:var(--_label-text-weight);width:min-content}.label-wrapper{inset:0;pointer-events:none;position:absolute}.label.resting{position:absolute;top:var(--_top-space)}.label.floating{font-size:var(--_label-text-populated-size);line-height:var(--_label-text-populated-line-height);transform-origin:top left}.label.hidden{opacity:0}.no-label .label{display:none}.label-wrapper{inset:0;position:absolute;text-align:initial}:hover .label{color:var(--_hover-label-text-color)}.focused .label{color:var(--_focus-label-text-color)}.disabled .label{color:var(--_disabled-label-text-color)}.disabled .label:not(.hidden){opacity:var(--_disabled-label-text-opacity)}.error .label{color:var(--_error-label-text-color)}.error:hover .label{color:var(--_error-hover-label-text-color)}.error.focused .label{color:var(--_error-focus-label-text-color)}}@layer hcm{@media(forced-colors: active){.disabled .label:not(.hidden){color:GrayText;opacity:1}}}@layer styles{.supporting-text{color:var(--_supporting-text-color);display:flex;font-family:var(--_supporting-text-font);font-size:var(--_supporting-text-size);line-height:var(--_supporting-text-line-height);font-weight:var(--_supporting-text-weight);gap:16px;justify-content:space-between;padding-inline-start:var(--_supporting-text-leading-space);padding-inline-end:var(--_supporting-text-trailing-space);padding-top:var(--_supporting-text-top-space)}.supporting-text :nth-child(2){flex-shrink:0}:hover .supporting-text{color:var(--_hover-supporting-text-color)}.focus .supporting-text{color:var(--_focus-supporting-text-color)}.disabled .supporting-text{color:var(--_disabled-supporting-text-color);opacity:var(--_disabled-supporting-text-opacity)}.error .supporting-text{color:var(--_error-supporting-text-color)}.error:hover .supporting-text{color:var(--_error-hover-supporting-text-color)}.error.focus .supporting-text{color:var(--_error-focus-supporting-text-color)}}@layer hcm{@media(forced-colors: active){.disabled .supporting-text{color:GrayText;opacity:1}}}
`
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let ji=class extends qi{};ji.styles=[Gi,Bi],ji=e([ce("md-filled-field")],ji);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Wi=s`:host{--_active-indicator-color: var(--md-filled-text-field-active-indicator-color, var(--md-sys-color-on-surface-variant, #49454f));--_active-indicator-height: var(--md-filled-text-field-active-indicator-height, 1px);--_caret-color: var(--md-filled-text-field-caret-color, var(--md-sys-color-primary, #6750a4));--_container-color: var(--md-filled-text-field-container-color, var(--md-sys-color-surface-container-highest, #e6e0e9));--_disabled-active-indicator-color: var(--md-filled-text-field-disabled-active-indicator-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-active-indicator-height: var(--md-filled-text-field-disabled-active-indicator-height, 1px);--_disabled-active-indicator-opacity: var(--md-filled-text-field-disabled-active-indicator-opacity, 0.38);--_disabled-container-color: var(--md-filled-text-field-disabled-container-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-container-opacity: var(--md-filled-text-field-disabled-container-opacity, 0.04);--_disabled-input-text-color: var(--md-filled-text-field-disabled-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-input-text-opacity: var(--md-filled-text-field-disabled-input-text-opacity, 0.38);--_disabled-label-text-color: var(--md-filled-text-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-filled-text-field-disabled-label-text-opacity, 0.38);--_disabled-leading-icon-color: var(--md-filled-text-field-disabled-leading-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-leading-icon-opacity: var(--md-filled-text-field-disabled-leading-icon-opacity, 0.38);--_disabled-supporting-text-color: var(--md-filled-text-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-supporting-text-opacity: var(--md-filled-text-field-disabled-supporting-text-opacity, 0.38);--_disabled-trailing-icon-color: var(--md-filled-text-field-disabled-trailing-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-trailing-icon-opacity: var(--md-filled-text-field-disabled-trailing-icon-opacity, 0.38);--_error-active-indicator-color: var(--md-filled-text-field-error-active-indicator-color, var(--md-sys-color-error, #b3261e));--_error-focus-active-indicator-color: var(--md-filled-text-field-error-focus-active-indicator-color, var(--md-sys-color-error, #b3261e));--_error-focus-caret-color: var(--md-filled-text-field-error-focus-caret-color, var(--md-sys-color-error, #b3261e));--_error-focus-input-text-color: var(--md-filled-text-field-error-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-label-text-color: var(--md-filled-text-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-leading-icon-color: var(--md-filled-text-field-error-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-supporting-text-color: var(--md-filled-text-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-trailing-icon-color: var(--md-filled-text-field-error-focus-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_error-hover-active-indicator-color: var(--md-filled-text-field-error-hover-active-indicator-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-input-text-color: var(--md-filled-text-field-error-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-label-text-color: var(--md-filled-text-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-leading-icon-color: var(--md-filled-text-field-error-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-hover-state-layer-color: var(--md-filled-text-field-error-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-state-layer-opacity: var(--md-filled-text-field-error-hover-state-layer-opacity, 0.08);--_error-hover-supporting-text-color: var(--md-filled-text-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-hover-trailing-icon-color: var(--md-filled-text-field-error-hover-trailing-icon-color, var(--md-sys-color-on-error-container, #410e0b));--_error-input-text-color: var(--md-filled-text-field-error-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-label-text-color: var(--md-filled-text-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_error-leading-icon-color: var(--md-filled-text-field-error-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-supporting-text-color: var(--md-filled-text-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-trailing-icon-color: var(--md-filled-text-field-error-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_focus-active-indicator-color: var(--md-filled-text-field-focus-active-indicator-color, var(--md-sys-color-primary, #6750a4));--_focus-active-indicator-height: var(--md-filled-text-field-focus-active-indicator-height, 3px);--_focus-input-text-color: var(--md-filled-text-field-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_focus-label-text-color: var(--md-filled-text-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_focus-leading-icon-color: var(--md-filled-text-field-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-supporting-text-color: var(--md-filled-text-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-trailing-icon-color: var(--md-filled-text-field-focus-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-active-indicator-color: var(--md-filled-text-field-hover-active-indicator-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-active-indicator-height: var(--md-filled-text-field-hover-active-indicator-height, 1px);--_hover-input-text-color: var(--md-filled-text-field-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-label-text-color: var(--md-filled-text-field-hover-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-leading-icon-color: var(--md-filled-text-field-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-state-layer-color: var(--md-filled-text-field-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-state-layer-opacity: var(--md-filled-text-field-hover-state-layer-opacity, 0.08);--_hover-supporting-text-color: var(--md-filled-text-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-trailing-icon-color: var(--md-filled-text-field-hover-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-color: var(--md-filled-text-field-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_input-text-font: var(--md-filled-text-field-input-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_input-text-line-height: var(--md-filled-text-field-input-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_input-text-placeholder-color: var(--md-filled-text-field-input-text-placeholder-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-prefix-color: var(--md-filled-text-field-input-text-prefix-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-size: var(--md-filled-text-field-input-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_input-text-suffix-color: var(--md-filled-text-field-input-text-suffix-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-weight: var(--md-filled-text-field-input-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_label-text-color: var(--md-filled-text-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-font: var(--md-filled-text-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-filled-text-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_label-text-populated-line-height: var(--md-filled-text-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_label-text-populated-size: var(--md-filled-text-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_label-text-size: var(--md-filled-text-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_label-text-weight: var(--md-filled-text-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_leading-icon-color: var(--md-filled-text-field-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_leading-icon-size: var(--md-filled-text-field-leading-icon-size, 24px);--_supporting-text-color: var(--md-filled-text-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_supporting-text-font: var(--md-filled-text-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_supporting-text-line-height: var(--md-filled-text-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_supporting-text-size: var(--md-filled-text-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_supporting-text-weight: var(--md-filled-text-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_trailing-icon-color: var(--md-filled-text-field-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_trailing-icon-size: var(--md-filled-text-field-trailing-icon-size, 24px);--_container-shape-start-start: var(--md-filled-text-field-container-shape-start-start, var(--md-filled-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-start-end: var(--md-filled-text-field-container-shape-start-end, var(--md-filled-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-end: var(--md-filled-text-field-container-shape-end-end, var(--md-filled-text-field-container-shape, var(--md-sys-shape-corner-none, 0px)));--_container-shape-end-start: var(--md-filled-text-field-container-shape-end-start, var(--md-filled-text-field-container-shape, var(--md-sys-shape-corner-none, 0px)));--_icon-input-space: var(--md-filled-text-field-icon-input-space, 16px);--_leading-space: var(--md-filled-text-field-leading-space, 16px);--_trailing-space: var(--md-filled-text-field-trailing-space, 16px);--_top-space: var(--md-filled-text-field-top-space, 16px);--_bottom-space: var(--md-filled-text-field-bottom-space, 16px);--_input-text-prefix-trailing-space: var(--md-filled-text-field-input-text-prefix-trailing-space, 2px);--_input-text-suffix-leading-space: var(--md-filled-text-field-input-text-suffix-leading-space, 2px);--_with-label-top-space: var(--md-filled-text-field-with-label-top-space, 8px);--_with-label-bottom-space: var(--md-filled-text-field-with-label-bottom-space, 8px);--_focus-caret-color: var(--md-filled-text-field-focus-caret-color, var(--md-sys-color-primary, #6750a4));--_with-leading-icon-leading-space: var(--md-filled-text-field-with-leading-icon-leading-space, 12px);--_with-trailing-icon-trailing-space: var(--md-filled-text-field-with-trailing-icon-trailing-space, 12px);--md-filled-field-active-indicator-color: var(--_active-indicator-color);--md-filled-field-active-indicator-height: var(--_active-indicator-height);--md-filled-field-bottom-space: var(--_bottom-space);--md-filled-field-container-color: var(--_container-color);--md-filled-field-container-shape-end-end: var(--_container-shape-end-end);--md-filled-field-container-shape-end-start: var(--_container-shape-end-start);--md-filled-field-container-shape-start-end: var(--_container-shape-start-end);--md-filled-field-container-shape-start-start: var(--_container-shape-start-start);--md-filled-field-content-color: var(--_input-text-color);--md-filled-field-content-font: var(--_input-text-font);--md-filled-field-content-line-height: var(--_input-text-line-height);--md-filled-field-content-size: var(--_input-text-size);--md-filled-field-content-space: var(--_icon-input-space);--md-filled-field-content-weight: var(--_input-text-weight);--md-filled-field-disabled-active-indicator-color: var(--_disabled-active-indicator-color);--md-filled-field-disabled-active-indicator-height: var(--_disabled-active-indicator-height);--md-filled-field-disabled-active-indicator-opacity: var(--_disabled-active-indicator-opacity);--md-filled-field-disabled-container-color: var(--_disabled-container-color);--md-filled-field-disabled-container-opacity: var(--_disabled-container-opacity);--md-filled-field-disabled-content-color: var(--_disabled-input-text-color);--md-filled-field-disabled-content-opacity: var(--_disabled-input-text-opacity);--md-filled-field-disabled-label-text-color: var(--_disabled-label-text-color);--md-filled-field-disabled-label-text-opacity: var(--_disabled-label-text-opacity);--md-filled-field-disabled-leading-content-color: var(--_disabled-leading-icon-color);--md-filled-field-disabled-leading-content-opacity: var(--_disabled-leading-icon-opacity);--md-filled-field-disabled-supporting-text-color: var(--_disabled-supporting-text-color);--md-filled-field-disabled-supporting-text-opacity: var(--_disabled-supporting-text-opacity);--md-filled-field-disabled-trailing-content-color: var(--_disabled-trailing-icon-color);--md-filled-field-disabled-trailing-content-opacity: var(--_disabled-trailing-icon-opacity);--md-filled-field-error-active-indicator-color: var(--_error-active-indicator-color);--md-filled-field-error-content-color: var(--_error-input-text-color);--md-filled-field-error-focus-active-indicator-color: var(--_error-focus-active-indicator-color);--md-filled-field-error-focus-content-color: var(--_error-focus-input-text-color);--md-filled-field-error-focus-label-text-color: var(--_error-focus-label-text-color);--md-filled-field-error-focus-leading-content-color: var(--_error-focus-leading-icon-color);--md-filled-field-error-focus-supporting-text-color: var(--_error-focus-supporting-text-color);--md-filled-field-error-focus-trailing-content-color: var(--_error-focus-trailing-icon-color);--md-filled-field-error-hover-active-indicator-color: var(--_error-hover-active-indicator-color);--md-filled-field-error-hover-content-color: var(--_error-hover-input-text-color);--md-filled-field-error-hover-label-text-color: var(--_error-hover-label-text-color);--md-filled-field-error-hover-leading-content-color: var(--_error-hover-leading-icon-color);--md-filled-field-error-hover-state-layer-color: var(--_error-hover-state-layer-color);--md-filled-field-error-hover-state-layer-opacity: var(--_error-hover-state-layer-opacity);--md-filled-field-error-hover-supporting-text-color: var(--_error-hover-supporting-text-color);--md-filled-field-error-hover-trailing-content-color: var(--_error-hover-trailing-icon-color);--md-filled-field-error-label-text-color: var(--_error-label-text-color);--md-filled-field-error-leading-content-color: var(--_error-leading-icon-color);--md-filled-field-error-supporting-text-color: var(--_error-supporting-text-color);--md-filled-field-error-trailing-content-color: var(--_error-trailing-icon-color);--md-filled-field-focus-active-indicator-color: var(--_focus-active-indicator-color);--md-filled-field-focus-active-indicator-height: var(--_focus-active-indicator-height);--md-filled-field-focus-content-color: var(--_focus-input-text-color);--md-filled-field-focus-label-text-color: var(--_focus-label-text-color);--md-filled-field-focus-leading-content-color: var(--_focus-leading-icon-color);--md-filled-field-focus-supporting-text-color: var(--_focus-supporting-text-color);--md-filled-field-focus-trailing-content-color: var(--_focus-trailing-icon-color);--md-filled-field-hover-active-indicator-color: var(--_hover-active-indicator-color);--md-filled-field-hover-active-indicator-height: var(--_hover-active-indicator-height);--md-filled-field-hover-content-color: var(--_hover-input-text-color);--md-filled-field-hover-label-text-color: var(--_hover-label-text-color);--md-filled-field-hover-leading-content-color: var(--_hover-leading-icon-color);--md-filled-field-hover-state-layer-color: var(--_hover-state-layer-color);--md-filled-field-hover-state-layer-opacity: var(--_hover-state-layer-opacity);--md-filled-field-hover-supporting-text-color: var(--_hover-supporting-text-color);--md-filled-field-hover-trailing-content-color: var(--_hover-trailing-icon-color);--md-filled-field-label-text-color: var(--_label-text-color);--md-filled-field-label-text-font: var(--_label-text-font);--md-filled-field-label-text-line-height: var(--_label-text-line-height);--md-filled-field-label-text-populated-line-height: var(--_label-text-populated-line-height);--md-filled-field-label-text-populated-size: var(--_label-text-populated-size);--md-filled-field-label-text-size: var(--_label-text-size);--md-filled-field-label-text-weight: var(--_label-text-weight);--md-filled-field-leading-content-color: var(--_leading-icon-color);--md-filled-field-leading-space: var(--_leading-space);--md-filled-field-supporting-text-color: var(--_supporting-text-color);--md-filled-field-supporting-text-font: var(--_supporting-text-font);--md-filled-field-supporting-text-line-height: var(--_supporting-text-line-height);--md-filled-field-supporting-text-size: var(--_supporting-text-size);--md-filled-field-supporting-text-weight: var(--_supporting-text-weight);--md-filled-field-top-space: var(--_top-space);--md-filled-field-trailing-content-color: var(--_trailing-icon-color);--md-filled-field-trailing-space: var(--_trailing-space);--md-filled-field-with-label-bottom-space: var(--_with-label-bottom-space);--md-filled-field-with-label-top-space: var(--_with-label-top-space);--md-filled-field-with-leading-content-leading-space: var(--_with-leading-icon-leading-space);--md-filled-field-with-trailing-content-trailing-space: var(--_with-trailing-icon-trailing-space)}
`
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */,Zi={},Yi=ze(class extends Me{constructor(e){if(super(e),e.type!==Oe&&e.type!==Ie&&e.type!==Le)throw Error("The `live` directive is not allowed on child or event bindings");if(!(e=>void 0===e.strings)(e))throw Error("`live` bindings can only contain a single expression")}render(e){return e}update(e,[t]){if(t===B||t===G)return t;const i=e.element,r=e.name;if(e.type===Oe){if(t===i[r])return B}else if(e.type===Le){if(!!t===i.hasAttribute(r))return B}else if(e.type===Ie&&i.getAttribute(r)===t+"")return B;return((e,t=Zi)=>{e._$AH=t;
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */})(e),t}}),Ji={fromAttribute:e=>e??"",toAttribute:e=>e||null},Ki=Symbol("onReportValidity"),Qi=Symbol("privateCleanupFormListeners"),Xi=Symbol("privateDoNotReportInvalid"),er=Symbol("privateIsSelfReportingValidity"),tr=Symbol("privateCallOnReportValidity");function ir(e){var t,i,r;class o extends e{constructor(...e){super(...e),this[t]=new AbortController,this[i]=!1,this[r]=!1,this.addEventListener("invalid",e=>{!this[Xi]&&e.isTrusted&&this.addEventListener("invalid",()=>{this[tr](e)},{once:!0})},{capture:!0})}checkValidity(){this[Xi]=!0;const e=super.checkValidity();return this[Xi]=!1,e}reportValidity(){this[er]=!0;const e=super.reportValidity();return e&&this[tr](null),this[er]=!1,e}[(t=Qi,i=Xi,r=er,tr)](e){const t=e?.defaultPrevented;if(t)return;this[Ki](e);!t&&e?.defaultPrevented&&(this[er]||function(e,t){if(!e)return!0;let i;for(const t of e.elements)if(t.matches(":invalid")){i=t;break}return i===t}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */(this[ti].form,this))&&this.focus()}[Ki](e){throw new Error("Implement [onReportValidity]")}formAssociatedCallback(e){super.formAssociatedCallback&&super.formAssociatedCallback(e),this[Qi].abort(),e&&(this[Qi]=new AbortController,function(e,t,i,r){const o=function(e){if(!rr.has(e)){const t=new EventTarget;rr.set(e,t);for(const i of["reportValidity","requestSubmit"]){const r=e[i];e[i]=function(){t.dispatchEvent(new Event("before"));const e=Reflect.apply(r,this,arguments);return t.dispatchEvent(new Event("after")),e}}}return rr.get(e)}(t);let a,n=!1,s=!1;o.addEventListener("before",()=>{s=!0,a=new AbortController,n=!1,e.addEventListener("invalid",()=>{n=!0},{signal:a.signal})},{signal:r}),o.addEventListener("after",()=>{s=!1,a?.abort(),n||i()},{signal:r}),t.addEventListener("submit",()=>{s||i()},{signal:r})}(this,e,()=>{this[tr](null)},this[Qi].signal))}}return o}const rr=new WeakMap;class or extends Si{computeValidity({state:e,renderedControl:t}){let i=t;ar(e)&&!i?(i=this.inputControl||document.createElement("input"),this.inputControl=i):i||(i=this.textAreaControl||document.createElement("textarea"),this.textAreaControl=i);const r=ar(e)?i:null;if(r&&(r.type=e.type),i.value!==e.value&&(i.value=e.value),i.required=e.required,r){const t=e;t.pattern?r.pattern=t.pattern:r.removeAttribute("pattern"),t.min?r.min=t.min:r.removeAttribute("min"),t.max?r.max=t.max:r.removeAttribute("max"),t.step?r.step=t.step:r.removeAttribute("step")}return(e.minLength??-1)>-1?i.setAttribute("minlength",String(e.minLength)):i.removeAttribute("minlength"),(e.maxLength??-1)>-1?i.setAttribute("maxlength",String(e.maxLength)):i.removeAttribute("maxlength"),{validity:i.validity,validationMessage:i.validationMessage}}equals({state:e},{state:t}){const i=e.type===t.type&&e.value===t.value&&e.required===t.required&&e.minLength===t.minLength&&e.maxLength===t.maxLength;return ar(e)&&ar(t)?i&&e.pattern===t.pattern&&e.min===t.min&&e.max===t.max&&e.step===t.step:i}copy({state:e}){return{state:ar(e)?this.copyInput(e):this.copyTextArea(e),renderedControl:null}}copyInput(e){const{type:t,pattern:i,min:r,max:o,step:a}=e;return{...this.copySharedState(e),type:t,pattern:i,min:r,max:o,step:a}}copyTextArea(e){return{...this.copySharedState(e),type:e.type}}copySharedState({value:e,required:t,minLength:i,maxLength:r}){return{value:e,required:t,minLength:i,maxLength:r}}}function ar(e){return"textarea"!==e.type}
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const nr=Wt(ir(_i(Ci(ri(le)))));class sr extends nr{constructor(){super(...arguments),this.error=!1,this.errorText="",this.label="",this.noAsterisk=!1,this.required=!1,this.value="",this.prefixText="",this.suffixText="",this.hasLeadingIcon=!1,this.hasTrailingIcon=!1,this.supportingText="",this.textDirection="",this.rows=2,this.cols=20,this.inputMode="",this.max="",this.maxLength=-1,this.min="",this.minLength=-1,this.noSpinner=!1,this.pattern="",this.placeholder="",this.readOnly=!1,this.multiple=!1,this.step="",this.type="text",this.autocomplete="",this.dirty=!1,this.focused=!1,this.nativeError=!1,this.nativeErrorText=""}get selectionDirection(){return this.getInputOrTextarea().selectionDirection}set selectionDirection(e){this.getInputOrTextarea().selectionDirection=e}get selectionEnd(){return this.getInputOrTextarea().selectionEnd}set selectionEnd(e){this.getInputOrTextarea().selectionEnd=e}get selectionStart(){return this.getInputOrTextarea().selectionStart}set selectionStart(e){this.getInputOrTextarea().selectionStart=e}get valueAsNumber(){const e=this.getInput();return e?e.valueAsNumber:NaN}set valueAsNumber(e){const t=this.getInput();t&&(t.valueAsNumber=e,this.value=t.value)}get valueAsDate(){const e=this.getInput();return e?e.valueAsDate:null}set valueAsDate(e){const t=this.getInput();t&&(t.valueAsDate=e,this.value=t.value)}get hasError(){return this.error||this.nativeError}select(){this.getInputOrTextarea().select()}setRangeText(...e){this.getInputOrTextarea().setRangeText(...e),this.value=this.getInputOrTextarea().value}setSelectionRange(e,t,i){this.getInputOrTextarea().setSelectionRange(e,t,i)}showPicker(){const e=this.getInput();e&&e.showPicker()}stepDown(e){const t=this.getInput();t&&(t.stepDown(e),this.value=t.value)}stepUp(e){const t=this.getInput();t&&(t.stepUp(e),this.value=t.value)}reset(){this.dirty=!1,this.value=this.getAttribute("value")??"",this.nativeError=!1,this.nativeErrorText=""}attributeChangedCallback(e,t,i){"value"===e&&this.dirty||super.attributeChangedCallback(e,t,i)}render(){const e={disabled:this.disabled,error:!this.disabled&&this.hasError,textarea:"textarea"===this.type,"no-spinner":this.noSpinner};return q`
      <span class="text-field ${Re(e)}">
        ${this.renderField()}
      </span>
    `}updated(e){const t=this.getInputOrTextarea().value;this.value!==t&&(this.value=t)}renderField(){return Ht`<${this.fieldTag}
      class="field"
      count=${this.value.length}
      ?disabled=${this.disabled}
      ?error=${this.hasError}
      error-text=${this.getErrorText()}
      ?focused=${this.focused}
      ?has-end=${this.hasTrailingIcon}
      ?has-start=${this.hasLeadingIcon}
      label=${this.label}
      ?no-asterisk=${this.noAsterisk}
      max=${this.maxLength}
      ?populated=${!!this.value}
      ?required=${this.required}
      ?resizable=${"textarea"===this.type}
      supporting-text=${this.supportingText}
    >
      ${this.renderLeadingIcon()}
      ${this.renderInputOrTextarea()}
      ${this.renderTrailingIcon()}
      <div id="description" slot="aria-describedby"></div>
      <slot name="container" slot="container"></slot>
    </${this.fieldTag}>`}renderLeadingIcon(){return q`
      <span class="icon leading" slot="start">
        <slot name="leading-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `}renderTrailingIcon(){return q`
      <span class="icon trailing" slot="end">
        <slot name="trailing-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `}renderInputOrTextarea(){const e={direction:this.textDirection},t=this.ariaLabel||this.label||G,i=this.autocomplete,r=(this.maxLength??-1)>-1,o=(this.minLength??-1)>-1;if("textarea"===this.type)return q`
        <textarea
          class="input"
          style=${Ve(e)}
          aria-describedby="description"
          aria-invalid=${this.hasError}
          aria-label=${t}
          autocomplete=${i||G}
          name=${this.name||G}
          ?disabled=${this.disabled}
          maxlength=${r?this.maxLength:G}
          minlength=${o?this.minLength:G}
          placeholder=${this.placeholder||G}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          rows=${this.rows}
          cols=${this.cols}
          .value=${Yi(this.value)}
          @change=${this.redispatchEvent}
          @focus=${this.handleFocusChange}
          @blur=${this.handleFocusChange}
          @input=${this.handleInput}
          @select=${this.redispatchEvent}></textarea>
      `;const a=this.renderPrefix(),n=this.renderSuffix(),s=this.inputMode;return q`
      <div class="input-wrapper">
        ${a}
        <input
          class="input"
          style=${Ve(e)}
          aria-describedby="description"
          aria-invalid=${this.hasError}
          aria-label=${t}
          autocomplete=${i||G}
          name=${this.name||G}
          ?disabled=${this.disabled}
          inputmode=${s||G}
          max=${this.max||G}
          maxlength=${r?this.maxLength:G}
          min=${this.min||G}
          minlength=${o?this.minLength:G}
          pattern=${this.pattern||G}
          placeholder=${this.placeholder||G}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          ?multiple=${this.multiple}
          step=${this.step||G}
          type=${this.type}
          .value=${Yi(this.value)}
          @change=${this.redispatchEvent}
          @focus=${this.handleFocusChange}
          @blur=${this.handleFocusChange}
          @input=${this.handleInput}
          @select=${this.redispatchEvent} />
        ${n}
      </div>
    `}renderPrefix(){return this.renderAffix(this.prefixText,!1)}renderSuffix(){return this.renderAffix(this.suffixText,!0)}renderAffix(e,t){if(!e)return G;return q`<span class="${Re({suffix:t,prefix:!t})}">${e}</span>`}getErrorText(){return this.error?this.errorText:this.nativeErrorText}handleFocusChange(){this.focused=this.inputOrTextarea?.matches(":focus")??!1}handleInput(e){this.dirty=!0,this.value=e.target.value}redispatchEvent(e){vi(this,e)}getInputOrTextarea(){return this.inputOrTextarea||(this.connectedCallback(),this.scheduleUpdate()),this.isUpdatePending&&this.scheduleUpdate(),this.inputOrTextarea}getInput(){return"textarea"===this.type?null:this.getInputOrTextarea()}handleIconChange(){this.hasLeadingIcon=this.leadingIcons.length>0,this.hasTrailingIcon=this.trailingIcons.length>0}[ki](){return this.value}formResetCallback(){this.reset()}formStateRestoreCallback(e){this.value=e}focus(){this.getInputOrTextarea().focus()}[gi](){return new or(()=>({state:this,renderedControl:this.inputOrTextarea}))}[yi](){return this.inputOrTextarea}[Ki](e){e?.preventDefault();const t=this.getErrorText();this.nativeError=!!e,this.nativeErrorText=this.validationMessage,t===this.getErrorText()&&this.field?.reannounceError()}}sr.shadowRootOptions={...le.shadowRootOptions,delegatesFocus:!0},e([ue({type:Boolean,reflect:!0})],sr.prototype,"error",void 0),e([ue({attribute:"error-text"})],sr.prototype,"errorText",void 0),e([ue()],sr.prototype,"label",void 0),e([ue({type:Boolean,attribute:"no-asterisk"})],sr.prototype,"noAsterisk",void 0),e([ue({type:Boolean,reflect:!0})],sr.prototype,"required",void 0),e([ue()],sr.prototype,"value",void 0),e([ue({attribute:"prefix-text"})],sr.prototype,"prefixText",void 0),e([ue({attribute:"suffix-text"})],sr.prototype,"suffixText",void 0),e([ue({type:Boolean,attribute:"has-leading-icon"})],sr.prototype,"hasLeadingIcon",void 0),e([ue({type:Boolean,attribute:"has-trailing-icon"})],sr.prototype,"hasTrailingIcon",void 0),e([ue({attribute:"supporting-text"})],sr.prototype,"supportingText",void 0),e([ue({attribute:"text-direction"})],sr.prototype,"textDirection",void 0),e([ue({type:Number})],sr.prototype,"rows",void 0),e([ue({type:Number})],sr.prototype,"cols",void 0),e([ue({reflect:!0})],sr.prototype,"inputMode",void 0),e([ue()],sr.prototype,"max",void 0),e([ue({type:Number})],sr.prototype,"maxLength",void 0),e([ue()],sr.prototype,"min",void 0),e([ue({type:Number})],sr.prototype,"minLength",void 0),e([ue({type:Boolean,attribute:"no-spinner"})],sr.prototype,"noSpinner",void 0),e([ue()],sr.prototype,"pattern",void 0),e([ue({reflect:!0,converter:Ji})],sr.prototype,"placeholder",void 0),e([ue({type:Boolean,reflect:!0})],sr.prototype,"readOnly",void 0),e([ue({type:Boolean,reflect:!0})],sr.prototype,"multiple",void 0),e([ue()],sr.prototype,"step",void 0),e([ue({reflect:!0})],sr.prototype,"type",void 0),e([ue({reflect:!0})],sr.prototype,"autocomplete",void 0),e([me()],sr.prototype,"dirty",void 0),e([me()],sr.prototype,"focused",void 0),e([me()],sr.prototype,"nativeError",void 0),e([me()],sr.prototype,"nativeErrorText",void 0),e([ve(".input")],sr.prototype,"inputOrTextarea",void 0),e([ve(".field")],sr.prototype,"field",void 0),e([ye({slot:"leading-icon"})],sr.prototype,"leadingIcons",void 0),e([ye({slot:"trailing-icon"})],sr.prototype,"trailingIcons",void 0);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class lr extends sr{constructor(){super(...arguments),this.fieldTag=Vt`md-filled-field`}}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const dr=s`:host{display:inline-flex;outline:none;resize:both;text-align:start;-webkit-tap-highlight-color:rgba(0,0,0,0)}.text-field,.field{width:100%}.text-field{display:inline-flex}.field{cursor:text}.disabled .field{cursor:default}.text-field,.textarea .field{resize:inherit}slot[name=container]{border-radius:inherit}.icon{color:currentColor;display:flex;align-items:center;justify-content:center;fill:currentColor;position:relative}.icon ::slotted(*){display:flex;position:absolute}[has-start] .icon.leading{font-size:var(--_leading-icon-size);height:var(--_leading-icon-size);width:var(--_leading-icon-size)}[has-end] .icon.trailing{font-size:var(--_trailing-icon-size);height:var(--_trailing-icon-size);width:var(--_trailing-icon-size)}.input-wrapper{display:flex}.input-wrapper>*{all:inherit;padding:0}.input{caret-color:var(--_caret-color);overflow-x:hidden;text-align:inherit}.input::placeholder{color:currentColor;opacity:1}.input::-webkit-calendar-picker-indicator{display:none}.input::-webkit-search-decoration,.input::-webkit-search-cancel-button{display:none}@media(forced-colors: active){.input{background:none}}.no-spinner .input::-webkit-inner-spin-button,.no-spinner .input::-webkit-outer-spin-button{display:none}.no-spinner .input[type=number]{-moz-appearance:textfield}:focus-within .input{caret-color:var(--_focus-caret-color)}.error:focus-within .input{caret-color:var(--_error-focus-caret-color)}.text-field:not(.disabled) .prefix{color:var(--_input-text-prefix-color)}.text-field:not(.disabled) .suffix{color:var(--_input-text-suffix-color)}.text-field:not(.disabled) .input::placeholder{color:var(--_input-text-placeholder-color)}.prefix,.suffix{text-wrap:nowrap;width:min-content}.prefix{padding-inline-end:var(--_input-text-prefix-trailing-space)}.suffix{padding-inline-start:var(--_input-text-suffix-leading-space)}
`
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let cr=class extends lr{constructor(){super(...arguments),this.fieldTag=Vt`md-filled-field`}};cr.styles=[dr,Wi],cr=e([ce("md-filled-text-field")],cr);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class hr extends Ui{renderOutline(e){return q`
      <div class="outline">
        <div class="outline-start"></div>
        <div class="outline-notch">
          <div class="outline-panel-inactive"></div>
          <div class="outline-panel-active"></div>
          <div class="outline-label">${e}</div>
        </div>
        <div class="outline-end"></div>
      </div>
    `}}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const pr=s`@layer styles{:host{--_bottom-space: var(--md-outlined-field-bottom-space, 16px);--_content-color: var(--md-outlined-field-content-color, var(--md-sys-color-on-surface, #1d1b20));--_content-font: var(--md-outlined-field-content-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_content-line-height: var(--md-outlined-field-content-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_content-size: var(--md-outlined-field-content-size, var(--md-sys-typescale-body-large-size, 1rem));--_content-space: var(--md-outlined-field-content-space, 16px);--_content-weight: var(--md-outlined-field-content-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_disabled-content-color: var(--md-outlined-field-disabled-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-content-opacity: var(--md-outlined-field-disabled-content-opacity, 0.38);--_disabled-label-text-color: var(--md-outlined-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-outlined-field-disabled-label-text-opacity, 0.38);--_disabled-leading-content-color: var(--md-outlined-field-disabled-leading-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-leading-content-opacity: var(--md-outlined-field-disabled-leading-content-opacity, 0.38);--_disabled-outline-color: var(--md-outlined-field-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-outline-opacity: var(--md-outlined-field-disabled-outline-opacity, 0.12);--_disabled-outline-width: var(--md-outlined-field-disabled-outline-width, 1px);--_disabled-supporting-text-color: var(--md-outlined-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-supporting-text-opacity: var(--md-outlined-field-disabled-supporting-text-opacity, 0.38);--_disabled-trailing-content-color: var(--md-outlined-field-disabled-trailing-content-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-trailing-content-opacity: var(--md-outlined-field-disabled-trailing-content-opacity, 0.38);--_error-content-color: var(--md-outlined-field-error-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-content-color: var(--md-outlined-field-error-focus-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-label-text-color: var(--md-outlined-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-leading-content-color: var(--md-outlined-field-error-focus-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-outline-color: var(--md-outlined-field-error-focus-outline-color, var(--md-sys-color-error, #b3261e));--_error-focus-supporting-text-color: var(--md-outlined-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-trailing-content-color: var(--md-outlined-field-error-focus-trailing-content-color, var(--md-sys-color-error, #b3261e));--_error-hover-content-color: var(--md-outlined-field-error-hover-content-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-label-text-color: var(--md-outlined-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-leading-content-color: var(--md-outlined-field-error-hover-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-hover-outline-color: var(--md-outlined-field-error-hover-outline-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-supporting-text-color: var(--md-outlined-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-hover-trailing-content-color: var(--md-outlined-field-error-hover-trailing-content-color, var(--md-sys-color-on-error-container, #410e0b));--_error-label-text-color: var(--md-outlined-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_error-leading-content-color: var(--md-outlined-field-error-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-outline-color: var(--md-outlined-field-error-outline-color, var(--md-sys-color-error, #b3261e));--_error-supporting-text-color: var(--md-outlined-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-trailing-content-color: var(--md-outlined-field-error-trailing-content-color, var(--md-sys-color-error, #b3261e));--_focus-content-color: var(--md-outlined-field-focus-content-color, var(--md-sys-color-on-surface, #1d1b20));--_focus-label-text-color: var(--md-outlined-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_focus-leading-content-color: var(--md-outlined-field-focus-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-outline-color: var(--md-outlined-field-focus-outline-color, var(--md-sys-color-primary, #6750a4));--_focus-outline-width: var(--md-outlined-field-focus-outline-width, 3px);--_focus-supporting-text-color: var(--md-outlined-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-trailing-content-color: var(--md-outlined-field-focus-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-content-color: var(--md-outlined-field-hover-content-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-label-text-color: var(--md-outlined-field-hover-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-leading-content-color: var(--md-outlined-field-hover-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-outline-color: var(--md-outlined-field-hover-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-outline-width: var(--md-outlined-field-hover-outline-width, 1px);--_hover-supporting-text-color: var(--md-outlined-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-trailing-content-color: var(--md-outlined-field-hover-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-color: var(--md-outlined-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-font: var(--md-outlined-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-outlined-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_label-text-padding-bottom: var(--md-outlined-field-label-text-padding-bottom, 8px);--_label-text-populated-line-height: var(--md-outlined-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_label-text-populated-size: var(--md-outlined-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_label-text-size: var(--md-outlined-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_label-text-weight: var(--md-outlined-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_leading-content-color: var(--md-outlined-field-leading-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_leading-space: var(--md-outlined-field-leading-space, 16px);--_outline-color: var(--md-outlined-field-outline-color, var(--md-sys-color-outline, #79747e));--_outline-label-padding: var(--md-outlined-field-outline-label-padding, 4px);--_outline-width: var(--md-outlined-field-outline-width, 1px);--_supporting-text-color: var(--md-outlined-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_supporting-text-font: var(--md-outlined-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_supporting-text-leading-space: var(--md-outlined-field-supporting-text-leading-space, 16px);--_supporting-text-line-height: var(--md-outlined-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_supporting-text-size: var(--md-outlined-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_supporting-text-top-space: var(--md-outlined-field-supporting-text-top-space, 4px);--_supporting-text-trailing-space: var(--md-outlined-field-supporting-text-trailing-space, 16px);--_supporting-text-weight: var(--md-outlined-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_top-space: var(--md-outlined-field-top-space, 16px);--_trailing-content-color: var(--md-outlined-field-trailing-content-color, var(--md-sys-color-on-surface-variant, #49454f));--_trailing-space: var(--md-outlined-field-trailing-space, 16px);--_with-leading-content-leading-space: var(--md-outlined-field-with-leading-content-leading-space, 12px);--_with-trailing-content-trailing-space: var(--md-outlined-field-with-trailing-content-trailing-space, 12px);--_container-shape-start-start: var(--md-outlined-field-container-shape-start-start, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-start-end: var(--md-outlined-field-container-shape-start-end, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-end: var(--md-outlined-field-container-shape-end-end, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-start: var(--md-outlined-field-container-shape-end-start, var(--md-outlined-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)))}.outline{border-color:var(--_outline-color);border-radius:inherit;display:flex;pointer-events:none;height:100%;position:absolute;width:100%;z-index:1}.outline-start::before,.outline-start::after,.outline-panel-inactive::before,.outline-panel-inactive::after,.outline-panel-active::before,.outline-panel-active::after,.outline-end::before,.outline-end::after{border:inherit;content:"";inset:0;position:absolute}.outline-start,.outline-end{border:inherit;border-radius:inherit;box-sizing:border-box;position:relative}.outline-start::before,.outline-start::after,.outline-end::before,.outline-end::after{border-bottom-style:solid;border-top-style:solid}.outline-start::after,.outline-end::after{opacity:0;transition:opacity 150ms cubic-bezier(0.2, 0, 0, 1)}.focused .outline-start::after,.focused .outline-end::after{opacity:1}.outline-start::before,.outline-start::after{border-inline-start-style:solid;border-inline-end-style:none;border-start-start-radius:inherit;border-start-end-radius:0;border-end-start-radius:inherit;border-end-end-radius:0;margin-inline-end:var(--_outline-label-padding)}.outline-end{flex-grow:1;margin-inline-start:calc(-1*var(--_outline-label-padding))}.outline-end::before,.outline-end::after{border-inline-start-style:none;border-inline-end-style:solid;border-start-start-radius:0;border-start-end-radius:inherit;border-end-start-radius:0;border-end-end-radius:inherit}.outline-notch{align-items:flex-start;border:inherit;display:flex;margin-inline-start:calc(-1*var(--_outline-label-padding));margin-inline-end:var(--_outline-label-padding);max-width:calc(100% - var(--_leading-space) - var(--_trailing-space));padding:0 var(--_outline-label-padding);position:relative}.no-label .outline-notch{display:none}.outline-panel-inactive,.outline-panel-active{border:inherit;border-bottom-style:solid;inset:0;position:absolute}.outline-panel-inactive::before,.outline-panel-inactive::after,.outline-panel-active::before,.outline-panel-active::after{border-top-style:solid;border-bottom:none;bottom:auto;transform:scaleX(1);transition:transform 150ms cubic-bezier(0.2, 0, 0, 1)}.outline-panel-inactive::before,.outline-panel-active::before{right:50%;transform-origin:top left}.outline-panel-inactive::after,.outline-panel-active::after{left:50%;transform-origin:top right}.populated .outline-panel-inactive::before,.populated .outline-panel-inactive::after,.populated .outline-panel-active::before,.populated .outline-panel-active::after,.focused .outline-panel-inactive::before,.focused .outline-panel-inactive::after,.focused .outline-panel-active::before,.focused .outline-panel-active::after{transform:scaleX(0)}.outline-panel-active{opacity:0;transition:opacity 150ms cubic-bezier(0.2, 0, 0, 1)}.focused .outline-panel-active{opacity:1}.outline-label{display:flex;max-width:100%;transform:translateY(calc(-100% + var(--_label-text-padding-bottom)))}.outline-start,.field:not(.with-start) .content ::slotted(*){padding-inline-start:max(var(--_leading-space),max(var(--_container-shape-start-start),var(--_container-shape-end-start)) + var(--_outline-label-padding))}.field:not(.with-start) .label-wrapper{margin-inline-start:max(var(--_leading-space),max(var(--_container-shape-start-start),var(--_container-shape-end-start)) + var(--_outline-label-padding))}.field:not(.with-end) .content ::slotted(*){padding-inline-end:max(var(--_trailing-space),max(var(--_container-shape-start-end),var(--_container-shape-end-end)))}.field:not(.with-end) .label-wrapper{margin-inline-end:max(var(--_trailing-space),max(var(--_container-shape-start-end),var(--_container-shape-end-end)))}.outline-start::before,.outline-end::before,.outline-panel-inactive,.outline-panel-inactive::before,.outline-panel-inactive::after{border-width:var(--_outline-width)}:hover .outline{border-color:var(--_hover-outline-color);color:var(--_hover-outline-color)}:hover .outline-start::before,:hover .outline-end::before,:hover .outline-panel-inactive,:hover .outline-panel-inactive::before,:hover .outline-panel-inactive::after{border-width:var(--_hover-outline-width)}.focused .outline{border-color:var(--_focus-outline-color);color:var(--_focus-outline-color)}.outline-start::after,.outline-end::after,.outline-panel-active,.outline-panel-active::before,.outline-panel-active::after{border-width:var(--_focus-outline-width)}.disabled .outline{border-color:var(--_disabled-outline-color);color:var(--_disabled-outline-color)}.disabled .outline-start,.disabled .outline-end,.disabled .outline-panel-inactive{opacity:var(--_disabled-outline-opacity)}.disabled .outline-start::before,.disabled .outline-end::before,.disabled .outline-panel-inactive,.disabled .outline-panel-inactive::before,.disabled .outline-panel-inactive::after{border-width:var(--_disabled-outline-width)}.error .outline{border-color:var(--_error-outline-color);color:var(--_error-outline-color)}.error:hover .outline{border-color:var(--_error-hover-outline-color);color:var(--_error-hover-outline-color)}.error.focused .outline{border-color:var(--_error-focus-outline-color);color:var(--_error-focus-outline-color)}.resizable .container{bottom:var(--_focus-outline-width);inset-inline-end:var(--_focus-outline-width);clip-path:inset(var(--_focus-outline-width) 0 0 var(--_focus-outline-width))}.resizable .container>*{top:var(--_focus-outline-width);inset-inline-start:var(--_focus-outline-width)}.resizable .container:dir(rtl){clip-path:inset(var(--_focus-outline-width) var(--_focus-outline-width) 0 0)}}@layer hcm{@media(forced-colors: active){.disabled .outline{border-color:GrayText;color:GrayText}.disabled :is(.outline-start,.outline-end,.outline-panel-inactive){opacity:1}}}
`
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let ur=class extends hr{};ur.styles=[Gi,pr],ur=e([ce("md-outlined-field")],ur);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const mr=s`:host{--_caret-color: var(--md-outlined-text-field-caret-color, var(--md-sys-color-primary, #6750a4));--_disabled-input-text-color: var(--md-outlined-text-field-disabled-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-input-text-opacity: var(--md-outlined-text-field-disabled-input-text-opacity, 0.38);--_disabled-label-text-color: var(--md-outlined-text-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-outlined-text-field-disabled-label-text-opacity, 0.38);--_disabled-leading-icon-color: var(--md-outlined-text-field-disabled-leading-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-leading-icon-opacity: var(--md-outlined-text-field-disabled-leading-icon-opacity, 0.38);--_disabled-outline-color: var(--md-outlined-text-field-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-outline-opacity: var(--md-outlined-text-field-disabled-outline-opacity, 0.12);--_disabled-outline-width: var(--md-outlined-text-field-disabled-outline-width, 1px);--_disabled-supporting-text-color: var(--md-outlined-text-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-supporting-text-opacity: var(--md-outlined-text-field-disabled-supporting-text-opacity, 0.38);--_disabled-trailing-icon-color: var(--md-outlined-text-field-disabled-trailing-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-trailing-icon-opacity: var(--md-outlined-text-field-disabled-trailing-icon-opacity, 0.38);--_error-focus-caret-color: var(--md-outlined-text-field-error-focus-caret-color, var(--md-sys-color-error, #b3261e));--_error-focus-input-text-color: var(--md-outlined-text-field-error-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-focus-label-text-color: var(--md-outlined-text-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-leading-icon-color: var(--md-outlined-text-field-error-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-focus-outline-color: var(--md-outlined-text-field-error-focus-outline-color, var(--md-sys-color-error, #b3261e));--_error-focus-supporting-text-color: var(--md-outlined-text-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-focus-trailing-icon-color: var(--md-outlined-text-field-error-focus-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_error-hover-input-text-color: var(--md-outlined-text-field-error-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-hover-label-text-color: var(--md-outlined-text-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-leading-icon-color: var(--md-outlined-text-field-error-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-hover-outline-color: var(--md-outlined-text-field-error-hover-outline-color, var(--md-sys-color-on-error-container, #410e0b));--_error-hover-supporting-text-color: var(--md-outlined-text-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-hover-trailing-icon-color: var(--md-outlined-text-field-error-hover-trailing-icon-color, var(--md-sys-color-on-error-container, #410e0b));--_error-input-text-color: var(--md-outlined-text-field-error-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_error-label-text-color: var(--md-outlined-text-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_error-leading-icon-color: var(--md-outlined-text-field-error-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_error-outline-color: var(--md-outlined-text-field-error-outline-color, var(--md-sys-color-error, #b3261e));--_error-supporting-text-color: var(--md-outlined-text-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_error-trailing-icon-color: var(--md-outlined-text-field-error-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_focus-input-text-color: var(--md-outlined-text-field-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_focus-label-text-color: var(--md-outlined-text-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_focus-leading-icon-color: var(--md-outlined-text-field-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-outline-color: var(--md-outlined-text-field-focus-outline-color, var(--md-sys-color-primary, #6750a4));--_focus-outline-width: var(--md-outlined-text-field-focus-outline-width, 3px);--_focus-supporting-text-color: var(--md-outlined-text-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_focus-trailing-icon-color: var(--md-outlined-text-field-focus-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-input-text-color: var(--md-outlined-text-field-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-label-text-color: var(--md-outlined-text-field-hover-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-leading-icon-color: var(--md-outlined-text-field-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-outline-color: var(--md-outlined-text-field-hover-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_hover-outline-width: var(--md-outlined-text-field-hover-outline-width, 1px);--_hover-supporting-text-color: var(--md-outlined-text-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_hover-trailing-icon-color: var(--md-outlined-text-field-hover-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-color: var(--md-outlined-text-field-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_input-text-font: var(--md-outlined-text-field-input-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_input-text-line-height: var(--md-outlined-text-field-input-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_input-text-placeholder-color: var(--md-outlined-text-field-input-text-placeholder-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-prefix-color: var(--md-outlined-text-field-input-text-prefix-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-size: var(--md-outlined-text-field-input-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_input-text-suffix-color: var(--md-outlined-text-field-input-text-suffix-color, var(--md-sys-color-on-surface-variant, #49454f));--_input-text-weight: var(--md-outlined-text-field-input-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_label-text-color: var(--md-outlined-text-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_label-text-font: var(--md-outlined-text-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-outlined-text-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_label-text-populated-line-height: var(--md-outlined-text-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_label-text-populated-size: var(--md-outlined-text-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_label-text-size: var(--md-outlined-text-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_label-text-weight: var(--md-outlined-text-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_leading-icon-color: var(--md-outlined-text-field-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_leading-icon-size: var(--md-outlined-text-field-leading-icon-size, 24px);--_outline-color: var(--md-outlined-text-field-outline-color, var(--md-sys-color-outline, #79747e));--_outline-width: var(--md-outlined-text-field-outline-width, 1px);--_supporting-text-color: var(--md-outlined-text-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_supporting-text-font: var(--md-outlined-text-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_supporting-text-line-height: var(--md-outlined-text-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_supporting-text-size: var(--md-outlined-text-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_supporting-text-weight: var(--md-outlined-text-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_trailing-icon-color: var(--md-outlined-text-field-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_trailing-icon-size: var(--md-outlined-text-field-trailing-icon-size, 24px);--_container-shape-start-start: var(--md-outlined-text-field-container-shape-start-start, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-start-end: var(--md-outlined-text-field-container-shape-start-end, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-end: var(--md-outlined-text-field-container-shape-end-end, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_container-shape-end-start: var(--md-outlined-text-field-container-shape-end-start, var(--md-outlined-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_icon-input-space: var(--md-outlined-text-field-icon-input-space, 16px);--_leading-space: var(--md-outlined-text-field-leading-space, 16px);--_trailing-space: var(--md-outlined-text-field-trailing-space, 16px);--_top-space: var(--md-outlined-text-field-top-space, 16px);--_bottom-space: var(--md-outlined-text-field-bottom-space, 16px);--_input-text-prefix-trailing-space: var(--md-outlined-text-field-input-text-prefix-trailing-space, 2px);--_input-text-suffix-leading-space: var(--md-outlined-text-field-input-text-suffix-leading-space, 2px);--_focus-caret-color: var(--md-outlined-text-field-focus-caret-color, var(--md-sys-color-primary, #6750a4));--_with-leading-icon-leading-space: var(--md-outlined-text-field-with-leading-icon-leading-space, 12px);--_with-trailing-icon-trailing-space: var(--md-outlined-text-field-with-trailing-icon-trailing-space, 12px);--md-outlined-field-bottom-space: var(--_bottom-space);--md-outlined-field-container-shape-end-end: var(--_container-shape-end-end);--md-outlined-field-container-shape-end-start: var(--_container-shape-end-start);--md-outlined-field-container-shape-start-end: var(--_container-shape-start-end);--md-outlined-field-container-shape-start-start: var(--_container-shape-start-start);--md-outlined-field-content-color: var(--_input-text-color);--md-outlined-field-content-font: var(--_input-text-font);--md-outlined-field-content-line-height: var(--_input-text-line-height);--md-outlined-field-content-size: var(--_input-text-size);--md-outlined-field-content-space: var(--_icon-input-space);--md-outlined-field-content-weight: var(--_input-text-weight);--md-outlined-field-disabled-content-color: var(--_disabled-input-text-color);--md-outlined-field-disabled-content-opacity: var(--_disabled-input-text-opacity);--md-outlined-field-disabled-label-text-color: var(--_disabled-label-text-color);--md-outlined-field-disabled-label-text-opacity: var(--_disabled-label-text-opacity);--md-outlined-field-disabled-leading-content-color: var(--_disabled-leading-icon-color);--md-outlined-field-disabled-leading-content-opacity: var(--_disabled-leading-icon-opacity);--md-outlined-field-disabled-outline-color: var(--_disabled-outline-color);--md-outlined-field-disabled-outline-opacity: var(--_disabled-outline-opacity);--md-outlined-field-disabled-outline-width: var(--_disabled-outline-width);--md-outlined-field-disabled-supporting-text-color: var(--_disabled-supporting-text-color);--md-outlined-field-disabled-supporting-text-opacity: var(--_disabled-supporting-text-opacity);--md-outlined-field-disabled-trailing-content-color: var(--_disabled-trailing-icon-color);--md-outlined-field-disabled-trailing-content-opacity: var(--_disabled-trailing-icon-opacity);--md-outlined-field-error-content-color: var(--_error-input-text-color);--md-outlined-field-error-focus-content-color: var(--_error-focus-input-text-color);--md-outlined-field-error-focus-label-text-color: var(--_error-focus-label-text-color);--md-outlined-field-error-focus-leading-content-color: var(--_error-focus-leading-icon-color);--md-outlined-field-error-focus-outline-color: var(--_error-focus-outline-color);--md-outlined-field-error-focus-supporting-text-color: var(--_error-focus-supporting-text-color);--md-outlined-field-error-focus-trailing-content-color: var(--_error-focus-trailing-icon-color);--md-outlined-field-error-hover-content-color: var(--_error-hover-input-text-color);--md-outlined-field-error-hover-label-text-color: var(--_error-hover-label-text-color);--md-outlined-field-error-hover-leading-content-color: var(--_error-hover-leading-icon-color);--md-outlined-field-error-hover-outline-color: var(--_error-hover-outline-color);--md-outlined-field-error-hover-supporting-text-color: var(--_error-hover-supporting-text-color);--md-outlined-field-error-hover-trailing-content-color: var(--_error-hover-trailing-icon-color);--md-outlined-field-error-label-text-color: var(--_error-label-text-color);--md-outlined-field-error-leading-content-color: var(--_error-leading-icon-color);--md-outlined-field-error-outline-color: var(--_error-outline-color);--md-outlined-field-error-supporting-text-color: var(--_error-supporting-text-color);--md-outlined-field-error-trailing-content-color: var(--_error-trailing-icon-color);--md-outlined-field-focus-content-color: var(--_focus-input-text-color);--md-outlined-field-focus-label-text-color: var(--_focus-label-text-color);--md-outlined-field-focus-leading-content-color: var(--_focus-leading-icon-color);--md-outlined-field-focus-outline-color: var(--_focus-outline-color);--md-outlined-field-focus-outline-width: var(--_focus-outline-width);--md-outlined-field-focus-supporting-text-color: var(--_focus-supporting-text-color);--md-outlined-field-focus-trailing-content-color: var(--_focus-trailing-icon-color);--md-outlined-field-hover-content-color: var(--_hover-input-text-color);--md-outlined-field-hover-label-text-color: var(--_hover-label-text-color);--md-outlined-field-hover-leading-content-color: var(--_hover-leading-icon-color);--md-outlined-field-hover-outline-color: var(--_hover-outline-color);--md-outlined-field-hover-outline-width: var(--_hover-outline-width);--md-outlined-field-hover-supporting-text-color: var(--_hover-supporting-text-color);--md-outlined-field-hover-trailing-content-color: var(--_hover-trailing-icon-color);--md-outlined-field-label-text-color: var(--_label-text-color);--md-outlined-field-label-text-font: var(--_label-text-font);--md-outlined-field-label-text-line-height: var(--_label-text-line-height);--md-outlined-field-label-text-populated-line-height: var(--_label-text-populated-line-height);--md-outlined-field-label-text-populated-size: var(--_label-text-populated-size);--md-outlined-field-label-text-size: var(--_label-text-size);--md-outlined-field-label-text-weight: var(--_label-text-weight);--md-outlined-field-leading-content-color: var(--_leading-icon-color);--md-outlined-field-leading-space: var(--_leading-space);--md-outlined-field-outline-color: var(--_outline-color);--md-outlined-field-outline-width: var(--_outline-width);--md-outlined-field-supporting-text-color: var(--_supporting-text-color);--md-outlined-field-supporting-text-font: var(--_supporting-text-font);--md-outlined-field-supporting-text-line-height: var(--_supporting-text-line-height);--md-outlined-field-supporting-text-size: var(--_supporting-text-size);--md-outlined-field-supporting-text-weight: var(--_supporting-text-weight);--md-outlined-field-top-space: var(--_top-space);--md-outlined-field-trailing-content-color: var(--_trailing-icon-color);--md-outlined-field-trailing-space: var(--_trailing-space);--md-outlined-field-with-leading-content-leading-space: var(--_with-leading-icon-leading-space);--md-outlined-field-with-trailing-content-trailing-space: var(--_with-trailing-icon-trailing-space)}
`
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;class fr extends sr{constructor(){super(...arguments),this.fieldTag=Vt`md-outlined-field`}}
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */let vr=class extends fr{constructor(){super(...arguments),this.fieldTag=Vt`md-outlined-field`}};vr.styles=[dr,mr],vr=e([ce("md-outlined-text-field")],vr);
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const gr=Wt(ri(le));class yr extends gr{get name(){return this.getAttribute("name")??""}set name(e){this.setAttribute("name",e)}get form(){return this[ti].form}constructor(){super(),this.disabled=!1,this.softDisabled=!1,this.href="",this.download="",this.target="",this.trailingIcon=!1,this.hasIcon=!1,this.type="submit",this.value="",this.addEventListener("click",this.handleClick.bind(this))}focus(){this.buttonElement?.focus()}blur(){this.buttonElement?.blur()}render(){const e=this.disabled||this.softDisabled,t=this.href?this.renderLink():this.renderButton(),i=this.href?"link":"button";return q`
      ${this.renderElevationOrOutline?.()}
      <div class="background"></div>
      <md-focus-ring part="focus-ring" for=${i}></md-focus-ring>
      <md-ripple
        part="ripple"
        for=${i}
        ?disabled="${e}"></md-ripple>
      ${t}
    `}renderButton(){const{ariaLabel:e,ariaHasPopup:t,ariaExpanded:i}=this;return q`<button
      id="button"
      class="button"
      ?disabled=${this.disabled}
      aria-disabled=${this.softDisabled||G}
      aria-label="${e||G}"
      aria-haspopup="${t||G}"
      aria-expanded="${i||G}">
      ${this.renderContent()}
    </button>`}renderLink(){const{ariaLabel:e,ariaHasPopup:t,ariaExpanded:i}=this;return q`<a
      id="link"
      class="button"
      aria-label="${e||G}"
      aria-haspopup="${t||G}"
      aria-expanded="${i||G}"
      aria-disabled=${this.disabled||this.softDisabled||G}
      tabindex="${this.disabled&&!this.softDisabled?-1:G}"
      href=${this.href}
      download=${this.download||G}
      target=${this.target||G}
      >${this.renderContent()}
    </a>`}renderContent(){const e=q`<slot
      name="icon"
      @slotchange="${this.handleSlotChange}"></slot>`;return q`
      <span class="touch"></span>
      ${this.trailingIcon?G:e}
      <span class="label"><slot></slot></span>
      ${this.trailingIcon?e:G}
    `}handleClick(e){if(this.softDisabled||this.disabled&&this.href)return e.stopImmediatePropagation(),void e.preventDefault();mi(e)&&this.buttonElement&&(this.focus(),ui(this.buttonElement))}handleSlotChange(){this.hasIcon=this.assignedIcons.length>0}}oi(yr),yr.formAssociated=!0,yr.shadowRootOptions={mode:"open",delegatesFocus:!0},e([ue({type:Boolean,reflect:!0})],yr.prototype,"disabled",void 0),e([ue({type:Boolean,attribute:"soft-disabled",reflect:!0})],yr.prototype,"softDisabled",void 0),e([ue()],yr.prototype,"href",void 0),e([ue()],yr.prototype,"download",void 0),e([ue()],yr.prototype,"target",void 0),e([ue({type:Boolean,attribute:"trailing-icon",reflect:!0})],yr.prototype,"trailingIcon",void 0),e([ue({type:Boolean,attribute:"has-icon",reflect:!0})],yr.prototype,"hasIcon",void 0),e([ue()],yr.prototype,"type",void 0),e([ue({reflect:!0})],yr.prototype,"value",void 0),e([ve(".button")],yr.prototype,"buttonElement",void 0),e([ye({slot:"icon",flatten:!0})],yr.prototype,"assignedIcons",void 0);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class br extends yr{renderElevationOrOutline(){return q`<md-elevation part="elevation"></md-elevation>`}}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const xr=s`:host{--_container-color: var(--md-filled-button-container-color, var(--md-sys-color-primary, #6750a4));--_container-elevation: var(--md-filled-button-container-elevation, 0);--_container-height: var(--md-filled-button-container-height, 40px);--_container-shadow-color: var(--md-filled-button-container-shadow-color, var(--md-sys-color-shadow, #000));--_disabled-container-color: var(--md-filled-button-disabled-container-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-container-elevation: var(--md-filled-button-disabled-container-elevation, 0);--_disabled-container-opacity: var(--md-filled-button-disabled-container-opacity, 0.12);--_disabled-label-text-color: var(--md-filled-button-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-filled-button-disabled-label-text-opacity, 0.38);--_focus-container-elevation: var(--md-filled-button-focus-container-elevation, 0);--_focus-label-text-color: var(--md-filled-button-focus-label-text-color, var(--md-sys-color-on-primary, #fff));--_hover-container-elevation: var(--md-filled-button-hover-container-elevation, 1);--_hover-label-text-color: var(--md-filled-button-hover-label-text-color, var(--md-sys-color-on-primary, #fff));--_hover-state-layer-color: var(--md-filled-button-hover-state-layer-color, var(--md-sys-color-on-primary, #fff));--_hover-state-layer-opacity: var(--md-filled-button-hover-state-layer-opacity, 0.08);--_label-text-color: var(--md-filled-button-label-text-color, var(--md-sys-color-on-primary, #fff));--_label-text-font: var(--md-filled-button-label-text-font, var(--md-sys-typescale-label-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-filled-button-label-text-line-height, var(--md-sys-typescale-label-large-line-height, 1.25rem));--_label-text-size: var(--md-filled-button-label-text-size, var(--md-sys-typescale-label-large-size, 0.875rem));--_label-text-weight: var(--md-filled-button-label-text-weight, var(--md-sys-typescale-label-large-weight, var(--md-ref-typeface-weight-medium, 500)));--_pressed-container-elevation: var(--md-filled-button-pressed-container-elevation, 0);--_pressed-label-text-color: var(--md-filled-button-pressed-label-text-color, var(--md-sys-color-on-primary, #fff));--_pressed-state-layer-color: var(--md-filled-button-pressed-state-layer-color, var(--md-sys-color-on-primary, #fff));--_pressed-state-layer-opacity: var(--md-filled-button-pressed-state-layer-opacity, 0.12);--_disabled-icon-color: var(--md-filled-button-disabled-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-icon-opacity: var(--md-filled-button-disabled-icon-opacity, 0.38);--_focus-icon-color: var(--md-filled-button-focus-icon-color, var(--md-sys-color-on-primary, #fff));--_hover-icon-color: var(--md-filled-button-hover-icon-color, var(--md-sys-color-on-primary, #fff));--_icon-color: var(--md-filled-button-icon-color, var(--md-sys-color-on-primary, #fff));--_icon-size: var(--md-filled-button-icon-size, 18px);--_pressed-icon-color: var(--md-filled-button-pressed-icon-color, var(--md-sys-color-on-primary, #fff));--_container-shape-start-start: var(--md-filled-button-container-shape-start-start, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-start-end: var(--md-filled-button-container-shape-start-end, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-end: var(--md-filled-button-container-shape-end-end, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-start: var(--md-filled-button-container-shape-end-start, var(--md-filled-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_leading-space: var(--md-filled-button-leading-space, 24px);--_trailing-space: var(--md-filled-button-trailing-space, 24px);--_with-leading-icon-leading-space: var(--md-filled-button-with-leading-icon-leading-space, 16px);--_with-leading-icon-trailing-space: var(--md-filled-button-with-leading-icon-trailing-space, 24px);--_with-trailing-icon-leading-space: var(--md-filled-button-with-trailing-icon-leading-space, 24px);--_with-trailing-icon-trailing-space: var(--md-filled-button-with-trailing-icon-trailing-space, 16px)}
`
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */,wr=s`md-elevation{transition-duration:280ms}:host(:is([disabled],[soft-disabled])) md-elevation{transition:none}md-elevation{--md-elevation-level: var(--_container-elevation);--md-elevation-shadow-color: var(--_container-shadow-color)}:host(:focus-within) md-elevation{--md-elevation-level: var(--_focus-container-elevation)}:host(:hover) md-elevation{--md-elevation-level: var(--_hover-container-elevation)}:host(:active) md-elevation{--md-elevation-level: var(--_pressed-container-elevation)}:host(:is([disabled],[soft-disabled])) md-elevation{--md-elevation-level: var(--_disabled-container-elevation)}
`
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */,_r=s`:host{border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-start-radius:var(--_container-shape-end-start);border-end-end-radius:var(--_container-shape-end-end);box-sizing:border-box;cursor:pointer;display:inline-flex;gap:8px;min-height:var(--_container-height);outline:none;padding-block:calc((var(--_container-height) - max(var(--_label-text-line-height),var(--_icon-size)))/2);padding-inline-start:var(--_leading-space);padding-inline-end:var(--_trailing-space);place-content:center;place-items:center;position:relative;font-family:var(--_label-text-font);font-size:var(--_label-text-size);line-height:var(--_label-text-line-height);font-weight:var(--_label-text-weight);text-overflow:ellipsis;text-wrap:nowrap;user-select:none;-webkit-tap-highlight-color:rgba(0,0,0,0);vertical-align:top;--md-ripple-hover-color: var(--_hover-state-layer-color);--md-ripple-pressed-color: var(--_pressed-state-layer-color);--md-ripple-hover-opacity: var(--_hover-state-layer-opacity);--md-ripple-pressed-opacity: var(--_pressed-state-layer-opacity)}md-focus-ring{--md-focus-ring-shape-start-start: var(--_container-shape-start-start);--md-focus-ring-shape-start-end: var(--_container-shape-start-end);--md-focus-ring-shape-end-end: var(--_container-shape-end-end);--md-focus-ring-shape-end-start: var(--_container-shape-end-start)}:host(:is([disabled],[soft-disabled])){cursor:default;pointer-events:none}.button{border-radius:inherit;cursor:inherit;display:inline-flex;align-items:center;justify-content:center;border:none;outline:none;-webkit-appearance:none;vertical-align:middle;background:rgba(0,0,0,0);text-decoration:none;min-width:calc(64px - var(--_leading-space) - var(--_trailing-space));width:100%;z-index:0;height:100%;font:inherit;color:var(--_label-text-color);padding:0;gap:inherit;text-transform:inherit}.button::-moz-focus-inner{padding:0;border:0}:host(:hover) .button{color:var(--_hover-label-text-color)}:host(:focus-within) .button{color:var(--_focus-label-text-color)}:host(:active) .button{color:var(--_pressed-label-text-color)}.background{background:var(--_container-color);border-radius:inherit;inset:0;position:absolute}.label{overflow:hidden}:is(.button,.label,.label slot),.label ::slotted(*){text-overflow:inherit}:host(:is([disabled],[soft-disabled])) .label{color:var(--_disabled-label-text-color);opacity:var(--_disabled-label-text-opacity)}:host(:is([disabled],[soft-disabled])) .background{background:var(--_disabled-container-color);opacity:var(--_disabled-container-opacity)}@media(forced-colors: active){.background{border:1px solid CanvasText}:host(:is([disabled],[soft-disabled])){--_disabled-icon-color: GrayText;--_disabled-icon-opacity: 1;--_disabled-container-opacity: 1;--_disabled-label-text-color: GrayText;--_disabled-label-text-opacity: 1}}:host([has-icon]:not([trailing-icon])){padding-inline-start:var(--_with-leading-icon-leading-space);padding-inline-end:var(--_with-leading-icon-trailing-space)}:host([has-icon][trailing-icon]){padding-inline-start:var(--_with-trailing-icon-leading-space);padding-inline-end:var(--_with-trailing-icon-trailing-space)}::slotted([slot=icon]){display:inline-flex;position:relative;writing-mode:horizontal-tb;fill:currentColor;flex-shrink:0;color:var(--_icon-color);font-size:var(--_icon-size);inline-size:var(--_icon-size);block-size:var(--_icon-size)}:host(:hover) ::slotted([slot=icon]){color:var(--_hover-icon-color)}:host(:focus-within) ::slotted([slot=icon]){color:var(--_focus-icon-color)}:host(:active) ::slotted([slot=icon]){color:var(--_pressed-icon-color)}:host(:is([disabled],[soft-disabled])) ::slotted([slot=icon]){color:var(--_disabled-icon-color);opacity:var(--_disabled-icon-opacity)}.touch{position:absolute;top:50%;height:48px;left:0;right:0;transform:translateY(-50%)}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--_container-height))/2) 0}:host([touch-target=none]) .touch{display:none}
`
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let kr=class extends br{};kr.styles=[_r,wr,xr],kr=e([ce("md-filled-button")],kr);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class $r extends yr{renderElevationOrOutline(){return q`<div class="outline"></div>`}}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Cr=s`:host{--_container-height: var(--md-outlined-button-container-height, 40px);--_disabled-label-text-color: var(--md-outlined-button-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-outlined-button-disabled-label-text-opacity, 0.38);--_disabled-outline-color: var(--md-outlined-button-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-outline-opacity: var(--md-outlined-button-disabled-outline-opacity, 0.12);--_focus-label-text-color: var(--md-outlined-button-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_hover-label-text-color: var(--md-outlined-button-hover-label-text-color, var(--md-sys-color-primary, #6750a4));--_hover-state-layer-color: var(--md-outlined-button-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--_hover-state-layer-opacity: var(--md-outlined-button-hover-state-layer-opacity, 0.08);--_label-text-color: var(--md-outlined-button-label-text-color, var(--md-sys-color-primary, #6750a4));--_label-text-font: var(--md-outlined-button-label-text-font, var(--md-sys-typescale-label-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-outlined-button-label-text-line-height, var(--md-sys-typescale-label-large-line-height, 1.25rem));--_label-text-size: var(--md-outlined-button-label-text-size, var(--md-sys-typescale-label-large-size, 0.875rem));--_label-text-weight: var(--md-outlined-button-label-text-weight, var(--md-sys-typescale-label-large-weight, var(--md-ref-typeface-weight-medium, 500)));--_outline-color: var(--md-outlined-button-outline-color, var(--md-sys-color-outline, #79747e));--_outline-width: var(--md-outlined-button-outline-width, 1px);--_pressed-label-text-color: var(--md-outlined-button-pressed-label-text-color, var(--md-sys-color-primary, #6750a4));--_pressed-outline-color: var(--md-outlined-button-pressed-outline-color, var(--md-sys-color-outline, #79747e));--_pressed-state-layer-color: var(--md-outlined-button-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--_pressed-state-layer-opacity: var(--md-outlined-button-pressed-state-layer-opacity, 0.12);--_disabled-icon-color: var(--md-outlined-button-disabled-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-icon-opacity: var(--md-outlined-button-disabled-icon-opacity, 0.38);--_focus-icon-color: var(--md-outlined-button-focus-icon-color, var(--md-sys-color-primary, #6750a4));--_hover-icon-color: var(--md-outlined-button-hover-icon-color, var(--md-sys-color-primary, #6750a4));--_icon-color: var(--md-outlined-button-icon-color, var(--md-sys-color-primary, #6750a4));--_icon-size: var(--md-outlined-button-icon-size, 18px);--_pressed-icon-color: var(--md-outlined-button-pressed-icon-color, var(--md-sys-color-primary, #6750a4));--_container-shape-start-start: var(--md-outlined-button-container-shape-start-start, var(--md-outlined-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-start-end: var(--md-outlined-button-container-shape-start-end, var(--md-outlined-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-end: var(--md-outlined-button-container-shape-end-end, var(--md-outlined-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-start: var(--md-outlined-button-container-shape-end-start, var(--md-outlined-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_leading-space: var(--md-outlined-button-leading-space, 24px);--_trailing-space: var(--md-outlined-button-trailing-space, 24px);--_with-leading-icon-leading-space: var(--md-outlined-button-with-leading-icon-leading-space, 16px);--_with-leading-icon-trailing-space: var(--md-outlined-button-with-leading-icon-trailing-space, 24px);--_with-trailing-icon-leading-space: var(--md-outlined-button-with-trailing-icon-leading-space, 24px);--_with-trailing-icon-trailing-space: var(--md-outlined-button-with-trailing-icon-trailing-space, 16px);--_container-color: none;--_disabled-container-color: none;--_disabled-container-opacity: 0}.outline{inset:0;border-style:solid;position:absolute;box-sizing:border-box;border-color:var(--_outline-color);border-start-start-radius:var(--_container-shape-start-start);border-start-end-radius:var(--_container-shape-start-end);border-end-start-radius:var(--_container-shape-end-start);border-end-end-radius:var(--_container-shape-end-end)}:host(:active) .outline{border-color:var(--_pressed-outline-color)}:host(:is([disabled],[soft-disabled])) .outline{border-color:var(--_disabled-outline-color);opacity:var(--_disabled-outline-opacity)}@media(forced-colors: active){:host(:is([disabled],[soft-disabled])) .background{border-color:GrayText}:host(:is([disabled],[soft-disabled])) .outline{opacity:1}}.outline,md-ripple{border-width:var(--_outline-width)}md-ripple{inline-size:calc(100% - 2*var(--_outline-width));block-size:calc(100% - 2*var(--_outline-width));border-style:solid;border-color:rgba(0,0,0,0)}
`
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let Sr=class extends $r{};Sr.styles=[_r,Cr],Sr=e([ce("md-outlined-button")],Sr);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Dr extends yr{}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Er=s`:host{--_container-height: var(--md-text-button-container-height, 40px);--_disabled-label-text-color: var(--md-text-button-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-label-text-opacity: var(--md-text-button-disabled-label-text-opacity, 0.38);--_focus-label-text-color: var(--md-text-button-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_hover-label-text-color: var(--md-text-button-hover-label-text-color, var(--md-sys-color-primary, #6750a4));--_hover-state-layer-color: var(--md-text-button-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--_hover-state-layer-opacity: var(--md-text-button-hover-state-layer-opacity, 0.08);--_label-text-color: var(--md-text-button-label-text-color, var(--md-sys-color-primary, #6750a4));--_label-text-font: var(--md-text-button-label-text-font, var(--md-sys-typescale-label-large-font, var(--md-ref-typeface-plain, Roboto)));--_label-text-line-height: var(--md-text-button-label-text-line-height, var(--md-sys-typescale-label-large-line-height, 1.25rem));--_label-text-size: var(--md-text-button-label-text-size, var(--md-sys-typescale-label-large-size, 0.875rem));--_label-text-weight: var(--md-text-button-label-text-weight, var(--md-sys-typescale-label-large-weight, var(--md-ref-typeface-weight-medium, 500)));--_pressed-label-text-color: var(--md-text-button-pressed-label-text-color, var(--md-sys-color-primary, #6750a4));--_pressed-state-layer-color: var(--md-text-button-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--_pressed-state-layer-opacity: var(--md-text-button-pressed-state-layer-opacity, 0.12);--_disabled-icon-color: var(--md-text-button-disabled-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_disabled-icon-opacity: var(--md-text-button-disabled-icon-opacity, 0.38);--_focus-icon-color: var(--md-text-button-focus-icon-color, var(--md-sys-color-primary, #6750a4));--_hover-icon-color: var(--md-text-button-hover-icon-color, var(--md-sys-color-primary, #6750a4));--_icon-color: var(--md-text-button-icon-color, var(--md-sys-color-primary, #6750a4));--_icon-size: var(--md-text-button-icon-size, 18px);--_pressed-icon-color: var(--md-text-button-pressed-icon-color, var(--md-sys-color-primary, #6750a4));--_container-shape-start-start: var(--md-text-button-container-shape-start-start, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-start-end: var(--md-text-button-container-shape-start-end, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-end: var(--md-text-button-container-shape-end-end, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_container-shape-end-start: var(--md-text-button-container-shape-end-start, var(--md-text-button-container-shape, var(--md-sys-shape-corner-full, 9999px)));--_leading-space: var(--md-text-button-leading-space, 12px);--_trailing-space: var(--md-text-button-trailing-space, 12px);--_with-leading-icon-leading-space: var(--md-text-button-with-leading-icon-leading-space, 12px);--_with-leading-icon-trailing-space: var(--md-text-button-with-leading-icon-trailing-space, 16px);--_with-trailing-icon-leading-space: var(--md-text-button-with-trailing-icon-leading-space, 16px);--_with-trailing-icon-trailing-space: var(--md-text-button-with-trailing-icon-trailing-space, 12px);--_container-color: none;--_disabled-container-color: none;--_disabled-container-opacity: 0}
`
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let Tr=class extends Dr{};Tr.styles=[_r,Er],Tr=e([ce("md-text-button")],Tr);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Ar extends Si{computeValidity(e){return this.selectControl||(this.selectControl=document.createElement("select")),ne(q`<option value=${e.value}></option>`,this.selectControl),this.selectControl.value=e.value,this.selectControl.required=e.required,{validity:this.selectControl.validity,validationMessage:this.selectControl.validationMessage}}equals(e,t){return e.value===t.value&&e.required===t.required}copy({value:e,required:t}){return{value:e,required:t}}}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
var Ir;const Or=Symbol("value"),Lr=Wt(ir(_i(Ci(ri(le)))));class zr extends Lr{get value(){return this[Or]}set value(e){this.lastUserSetValue=e,this.select(e)}get options(){return this.menu?.items??[]}get selectedIndex(){const[e,t]=(this.getSelectedOptions()??[])[0]??[];return t??-1}set selectedIndex(e){this.lastUserSetSelectedIndex=e,this.selectIndex(e)}get selectedOptions(){return(this.getSelectedOptions()??[]).map(([e])=>e)}get hasError(){return this.error||this.nativeError}constructor(){super(),this.quick=!1,this.required=!1,this.errorText="",this.label="",this.noAsterisk=!1,this.supportingText="",this.error=!1,this.menuPositioning="popover",this.clampMenuWidth=!1,this.typeaheadDelay=200,this.hasLeadingIcon=!1,this.displayText="",this.menuAlign="start",this[Ir]="",this.lastUserSetValue=null,this.lastUserSetSelectedIndex=null,this.lastSelectedOption=null,this.lastSelectedOptionRecords=[],this.nativeError=!1,this.nativeErrorText="",this.focused=!1,this.open=!1,this.defaultFocus=ht,this.prevOpen=this.open,this.selectWidth=0,this.addEventListener("focus",this.handleFocus.bind(this)),this.addEventListener("blur",this.handleBlur.bind(this))}select(e){const t=this.options.find(t=>t.value===e);t&&this.selectItem(t)}selectIndex(e){const t=this.options[e];t&&this.selectItem(t)}reset(){for(const e of this.options)e.selected=e.hasAttribute("selected");this.updateValueAndDisplayText(),this.nativeError=!1,this.nativeErrorText=""}showPicker(){this.open=!0}[(Ir=Or,Ki)](e){e?.preventDefault();const t=this.getErrorText();this.nativeError=!!e,this.nativeErrorText=this.validationMessage,t===this.getErrorText()&&this.field?.reannounceError()}update(e){if(this.hasUpdated||this.initUserSelection(),this.prevOpen!==this.open&&this.open){const e=this.getBoundingClientRect();this.selectWidth=e.width}this.prevOpen=this.open,super.update(e)}render(){return q`
      <span
        class="select ${Re(this.getRenderClasses())}"
        @focusout=${this.handleFocusout}>
        ${this.renderField()} ${this.renderMenu()}
      </span>
    `}async firstUpdated(e){await(this.menu?.updateComplete),this.lastSelectedOptionRecords.length||this.initUserSelection(),this.lastSelectedOptionRecords.length||this.options.length||setTimeout(()=>{this.updateValueAndDisplayText()}),super.firstUpdated(e)}getRenderClasses(){return{disabled:this.disabled,error:this.error,open:this.open}}renderField(){const e=this.ariaLabel||this.label;return Ht`
      <${this.fieldTag}
          aria-haspopup="listbox"
          role="combobox"
          part="field"
          id="field"
          tabindex=${this.disabled?"-1":"0"}
          aria-label=${e||G}
          aria-describedby="description"
          aria-expanded=${this.open?"true":"false"}
          aria-controls="listbox"
          class="field"
          label=${this.label}
          ?no-asterisk=${this.noAsterisk}
          .focused=${this.focused||this.open}
          .populated=${!!this.displayText}
          .disabled=${this.disabled}
          .required=${this.required}
          .error=${this.hasError}
          ?has-start=${this.hasLeadingIcon}
          has-end
          supporting-text=${this.supportingText}
          error-text=${this.getErrorText()}
          @keydown=${this.handleKeydown}
          @click=${this.handleClick}>
         ${this.renderFieldContent()}
         <div id="description" slot="aria-describedby"></div>
      </${this.fieldTag}>`}renderFieldContent(){return[this.renderLeadingIcon(),this.renderLabel(),this.renderTrailingIcon()]}renderLeadingIcon(){return q`
      <span class="icon leading" slot="start">
        <slot name="leading-icon" @slotchange=${this.handleIconChange}></slot>
      </span>
    `}renderTrailingIcon(){return q`
      <span class="icon trailing" slot="end">
        <slot name="trailing-icon" @slotchange=${this.handleIconChange}>
          <svg height="5" viewBox="7 10 10 5" focusable="false">
            <polygon
              class="down"
              stroke="none"
              fill-rule="evenodd"
              points="7 10 12 15 17 10"></polygon>
            <polygon
              class="up"
              stroke="none"
              fill-rule="evenodd"
              points="7 15 12 10 17 15"></polygon>
          </svg>
        </slot>
      </span>
    `}renderLabel(){return q`<div id="label">${this.displayText||q`&nbsp;`}</div>`}renderMenu(){const e=this.label||this.ariaLabel;return q`<div class="menu-wrapper">
      <md-menu
        id="listbox"
        .defaultFocus=${this.defaultFocus}
        role="listbox"
        tabindex="-1"
        aria-label=${e||G}
        stay-open-on-focusout
        part="menu"
        exportparts="focus-ring: menu-focus-ring"
        anchor="field"
        style=${Ve({"--__menu-min-width":`${this.selectWidth}px`,"--__menu-max-width":this.clampMenuWidth?`${this.selectWidth}px`:void 0})}
        no-navigation-wrap
        .open=${this.open}
        .quick=${this.quick}
        .positioning=${this.menuPositioning}
        .typeaheadDelay=${this.typeaheadDelay}
        .anchorCorner=${"start"===this.menuAlign?"end-start":"end-end"}
        .menuCorner=${"start"===this.menuAlign?"start-start":"start-end"}
        @opening=${this.handleOpening}
        @opened=${this.redispatchEvent}
        @closing=${this.redispatchEvent}
        @closed=${this.handleClosed}
        @close-menu=${this.handleCloseMenu}
        @request-selection=${this.handleRequestSelection}
        @request-deselection=${this.handleRequestDeselection}>
        ${this.renderMenuContent()}
      </md-menu>
    </div>`}renderMenuContent(){return q`<slot></slot>`}handleKeydown(e){if(this.open||this.disabled||!this.menu)return;const t=this.menu.typeaheadController,i="Space"===e.code||"ArrowDown"===e.code||"ArrowUp"===e.code||"End"===e.code||"Home"===e.code||"Enter"===e.code;if(!t.isTypingAhead&&i){switch(e.preventDefault(),this.open=!0,e.code){case"Space":case"ArrowDown":case"Enter":this.defaultFocus=ht;break;case"End":this.defaultFocus=mt;break;case"ArrowUp":case"Home":this.defaultFocus=ut}return}if(1===e.key.length){t.onKeydown(e),e.preventDefault();const{lastActiveRecord:i}=t;if(!i)return;this.labelEl?.setAttribute?.("aria-live","polite");this.selectItem(i[bt])&&this.dispatchInteractionEvents()}}handleClick(){this.open=!this.open}handleFocus(){this.focused=!0}handleBlur(){this.focused=!1}handleFocusout(e){e.relatedTarget&&ct(e.relatedTarget,this)||(this.open=!1)}getSelectedOptions(){if(!this.menu)return this.lastSelectedOptionRecords=[],null;const e=this.menu.items;return this.lastSelectedOptionRecords=function(e){const t=[];for(let i=0;i<e.length;i++){const r=e[i];r.selected&&t.push([r,i])}return t}(e),this.lastSelectedOptionRecords}async getUpdateComplete(){return await(this.menu?.updateComplete),super.getUpdateComplete()}updateValueAndDisplayText(){const e=this.getSelectedOptions()??[];let t=!1;if(e.length){const[i]=e[0];t=this.lastSelectedOption!==i,this.lastSelectedOption=i,this[Or]=i.value,this.displayText=i.displayText}else t=null!==this.lastSelectedOption,this.lastSelectedOption=null,this[Or]="",this.displayText="";return t}async handleOpening(e){if(this.labelEl?.removeAttribute?.("aria-live"),this.redispatchEvent(e),this.defaultFocus!==ht)return;const t=this.menu.items,i=Ge(t)?.item;let[r]=this.lastSelectedOptionRecords[0]??[null];i&&i!==r&&(i.tabIndex=-1),r=r??t[0],r&&(r.tabIndex=0,r.focus())}redispatchEvent(e){vi(this,e)}handleClosed(e){this.open=!1,this.redispatchEvent(e)}handleCloseMenu(e){const t=e.detail.reason,i=e.detail.itemPath[0];this.open=!1;let r=!1;var o;"click-selection"===t.kind||"keydown"===t.kind&&(o=t.key,Object.values(at).some(e=>e===o))?r=this.selectItem(i):(i.tabIndex=-1,i.blur()),r&&this.dispatchInteractionEvents()}selectItem(e){return(this.getSelectedOptions()??[]).forEach(([t])=>{e!==t&&(t.selected=!1)}),e.selected=!0,this.updateValueAndDisplayText()}handleRequestSelection(e){const t=e.target;this.lastSelectedOptionRecords.some(([e])=>e===t)||this.selectItem(t)}handleRequestDeselection(e){const t=e.target;this.lastSelectedOptionRecords.some(([e])=>e===t)&&this.updateValueAndDisplayText()}initUserSelection(){this.lastUserSetValue&&!this.lastSelectedOptionRecords.length?this.select(this.lastUserSetValue):null===this.lastUserSetSelectedIndex||this.lastSelectedOptionRecords.length?this.updateValueAndDisplayText():this.selectIndex(this.lastUserSetSelectedIndex)}handleIconChange(){this.hasLeadingIcon=this.leadingIcons.length>0}dispatchInteractionEvents(){this.dispatchEvent(new Event("input",{bubbles:!0,composed:!0})),this.dispatchEvent(new Event("change",{bubbles:!0}))}getErrorText(){return this.error?this.errorText:this.nativeErrorText}[ki](){return this.value}formResetCallback(){this.reset()}formStateRestoreCallback(e){this.value=e}click(){this.field?.click()}[gi](){return new Ar(()=>this)}[yi](){return this.field}}zr.shadowRootOptions={...le.shadowRootOptions,delegatesFocus:!0},e([ue({type:Boolean})],zr.prototype,"quick",void 0),e([ue({type:Boolean})],zr.prototype,"required",void 0),e([ue({type:String,attribute:"error-text"})],zr.prototype,"errorText",void 0),e([ue()],zr.prototype,"label",void 0),e([ue({type:Boolean,attribute:"no-asterisk"})],zr.prototype,"noAsterisk",void 0),e([ue({type:String,attribute:"supporting-text"})],zr.prototype,"supportingText",void 0),e([ue({type:Boolean,reflect:!0})],zr.prototype,"error",void 0),e([ue({attribute:"menu-positioning"})],zr.prototype,"menuPositioning",void 0),e([ue({type:Boolean,attribute:"clamp-menu-width"})],zr.prototype,"clampMenuWidth",void 0),e([ue({type:Number,attribute:"typeahead-delay"})],zr.prototype,"typeaheadDelay",void 0),e([ue({type:Boolean,attribute:"has-leading-icon"})],zr.prototype,"hasLeadingIcon",void 0),e([ue({attribute:"display-text"})],zr.prototype,"displayText",void 0),e([ue({attribute:"menu-align"})],zr.prototype,"menuAlign",void 0),e([ue()],zr.prototype,"value",null),e([ue({type:Number,attribute:"selected-index"})],zr.prototype,"selectedIndex",null),e([me()],zr.prototype,"nativeError",void 0),e([me()],zr.prototype,"nativeErrorText",void 0),e([me()],zr.prototype,"focused",void 0),e([me()],zr.prototype,"open",void 0),e([me()],zr.prototype,"defaultFocus",void 0),e([ve(".field")],zr.prototype,"field",void 0),e([ve("md-menu")],zr.prototype,"menu",void 0),e([ve("#label")],zr.prototype,"labelEl",void 0),e([ye({slot:"leading-icon",flatten:!0})],zr.prototype,"leadingIcons",void 0);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Mr extends zr{constructor(){super(...arguments),this.fieldTag=Vt`md-filled-field`}}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Rr=s`:host{--_text-field-active-indicator-color: var(--md-filled-select-text-field-active-indicator-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-active-indicator-height: var(--md-filled-select-text-field-active-indicator-height, 1px);--_text-field-container-color: var(--md-filled-select-text-field-container-color, var(--md-sys-color-surface-container-highest, #e6e0e9));--_text-field-disabled-active-indicator-color: var(--md-filled-select-text-field-disabled-active-indicator-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-active-indicator-height: var(--md-filled-select-text-field-disabled-active-indicator-height, 1px);--_text-field-disabled-active-indicator-opacity: var(--md-filled-select-text-field-disabled-active-indicator-opacity, 0.38);--_text-field-disabled-container-color: var(--md-filled-select-text-field-disabled-container-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-container-opacity: var(--md-filled-select-text-field-disabled-container-opacity, 0.04);--_text-field-disabled-input-text-color: var(--md-filled-select-text-field-disabled-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-input-text-opacity: var(--md-filled-select-text-field-disabled-input-text-opacity, 0.38);--_text-field-disabled-label-text-color: var(--md-filled-select-text-field-disabled-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-label-text-opacity: var(--md-filled-select-text-field-disabled-label-text-opacity, 0.38);--_text-field-disabled-leading-icon-color: var(--md-filled-select-text-field-disabled-leading-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-leading-icon-opacity: var(--md-filled-select-text-field-disabled-leading-icon-opacity, 0.38);--_text-field-disabled-supporting-text-color: var(--md-filled-select-text-field-disabled-supporting-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-supporting-text-opacity: var(--md-filled-select-text-field-disabled-supporting-text-opacity, 0.38);--_text-field-disabled-trailing-icon-color: var(--md-filled-select-text-field-disabled-trailing-icon-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-disabled-trailing-icon-opacity: var(--md-filled-select-text-field-disabled-trailing-icon-opacity, 0.38);--_text-field-error-active-indicator-color: var(--md-filled-select-text-field-error-active-indicator-color, var(--md-sys-color-error, #b3261e));--_text-field-error-focus-active-indicator-color: var(--md-filled-select-text-field-error-focus-active-indicator-color, var(--md-sys-color-error, #b3261e));--_text-field-error-focus-input-text-color: var(--md-filled-select-text-field-error-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-error-focus-label-text-color: var(--md-filled-select-text-field-error-focus-label-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-focus-leading-icon-color: var(--md-filled-select-text-field-error-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-error-focus-supporting-text-color: var(--md-filled-select-text-field-error-focus-supporting-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-focus-trailing-icon-color: var(--md-filled-select-text-field-error-focus-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_text-field-error-hover-active-indicator-color: var(--md-filled-select-text-field-error-hover-active-indicator-color, var(--md-sys-color-on-error-container, #410e0b));--_text-field-error-hover-input-text-color: var(--md-filled-select-text-field-error-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-error-hover-label-text-color: var(--md-filled-select-text-field-error-hover-label-text-color, var(--md-sys-color-on-error-container, #410e0b));--_text-field-error-hover-leading-icon-color: var(--md-filled-select-text-field-error-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-error-hover-state-layer-color: var(--md-filled-select-text-field-error-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-error-hover-state-layer-opacity: var(--md-filled-select-text-field-error-hover-state-layer-opacity, 0.08);--_text-field-error-hover-supporting-text-color: var(--md-filled-select-text-field-error-hover-supporting-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-hover-trailing-icon-color: var(--md-filled-select-text-field-error-hover-trailing-icon-color, var(--md-sys-color-on-error-container, #410e0b));--_text-field-error-input-text-color: var(--md-filled-select-text-field-error-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-error-label-text-color: var(--md-filled-select-text-field-error-label-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-leading-icon-color: var(--md-filled-select-text-field-error-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-error-supporting-text-color: var(--md-filled-select-text-field-error-supporting-text-color, var(--md-sys-color-error, #b3261e));--_text-field-error-trailing-icon-color: var(--md-filled-select-text-field-error-trailing-icon-color, var(--md-sys-color-error, #b3261e));--_text-field-focus-active-indicator-color: var(--md-filled-select-text-field-focus-active-indicator-color, var(--md-sys-color-primary, #6750a4));--_text-field-focus-active-indicator-height: var(--md-filled-select-text-field-focus-active-indicator-height, 3px);--_text-field-focus-input-text-color: var(--md-filled-select-text-field-focus-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-focus-label-text-color: var(--md-filled-select-text-field-focus-label-text-color, var(--md-sys-color-primary, #6750a4));--_text-field-focus-leading-icon-color: var(--md-filled-select-text-field-focus-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-focus-supporting-text-color: var(--md-filled-select-text-field-focus-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-focus-trailing-icon-color: var(--md-filled-select-text-field-focus-trailing-icon-color, var(--md-sys-color-primary, #6750a4));--_text-field-hover-active-indicator-color: var(--md-filled-select-text-field-hover-active-indicator-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-hover-active-indicator-height: var(--md-filled-select-text-field-hover-active-indicator-height, 1px);--_text-field-hover-input-text-color: var(--md-filled-select-text-field-hover-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-hover-label-text-color: var(--md-filled-select-text-field-hover-label-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-hover-leading-icon-color: var(--md-filled-select-text-field-hover-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-hover-state-layer-color: var(--md-filled-select-text-field-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-hover-state-layer-opacity: var(--md-filled-select-text-field-hover-state-layer-opacity, 0.08);--_text-field-hover-supporting-text-color: var(--md-filled-select-text-field-hover-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-hover-trailing-icon-color: var(--md-filled-select-text-field-hover-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-input-text-color: var(--md-filled-select-text-field-input-text-color, var(--md-sys-color-on-surface, #1d1b20));--_text-field-input-text-font: var(--md-filled-select-text-field-input-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_text-field-input-text-line-height: var(--md-filled-select-text-field-input-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_text-field-input-text-size: var(--md-filled-select-text-field-input-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_text-field-input-text-weight: var(--md-filled-select-text-field-input-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_text-field-label-text-color: var(--md-filled-select-text-field-label-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-label-text-font: var(--md-filled-select-text-field-label-text-font, var(--md-sys-typescale-body-large-font, var(--md-ref-typeface-plain, Roboto)));--_text-field-label-text-line-height: var(--md-filled-select-text-field-label-text-line-height, var(--md-sys-typescale-body-large-line-height, 1.5rem));--_text-field-label-text-populated-line-height: var(--md-filled-select-text-field-label-text-populated-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_text-field-label-text-populated-size: var(--md-filled-select-text-field-label-text-populated-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_text-field-label-text-size: var(--md-filled-select-text-field-label-text-size, var(--md-sys-typescale-body-large-size, 1rem));--_text-field-label-text-weight: var(--md-filled-select-text-field-label-text-weight, var(--md-sys-typescale-body-large-weight, var(--md-ref-typeface-weight-regular, 400)));--_text-field-leading-icon-color: var(--md-filled-select-text-field-leading-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-leading-icon-size: var(--md-filled-select-text-field-leading-icon-size, 24px);--_text-field-supporting-text-color: var(--md-filled-select-text-field-supporting-text-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-supporting-text-font: var(--md-filled-select-text-field-supporting-text-font, var(--md-sys-typescale-body-small-font, var(--md-ref-typeface-plain, Roboto)));--_text-field-supporting-text-line-height: var(--md-filled-select-text-field-supporting-text-line-height, var(--md-sys-typescale-body-small-line-height, 1rem));--_text-field-supporting-text-size: var(--md-filled-select-text-field-supporting-text-size, var(--md-sys-typescale-body-small-size, 0.75rem));--_text-field-supporting-text-weight: var(--md-filled-select-text-field-supporting-text-weight, var(--md-sys-typescale-body-small-weight, var(--md-ref-typeface-weight-regular, 400)));--_text-field-trailing-icon-color: var(--md-filled-select-text-field-trailing-icon-color, var(--md-sys-color-on-surface-variant, #49454f));--_text-field-trailing-icon-size: var(--md-filled-select-text-field-trailing-icon-size, 24px);--_text-field-container-shape-start-start: var(--md-filled-select-text-field-container-shape-start-start, var(--md-filled-select-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_text-field-container-shape-start-end: var(--md-filled-select-text-field-container-shape-start-end, var(--md-filled-select-text-field-container-shape, var(--md-sys-shape-corner-extra-small, 4px)));--_text-field-container-shape-end-end: var(--md-filled-select-text-field-container-shape-end-end, var(--md-filled-select-text-field-container-shape, var(--md-sys-shape-corner-none, 0px)));--_text-field-container-shape-end-start: var(--md-filled-select-text-field-container-shape-end-start, var(--md-filled-select-text-field-container-shape, var(--md-sys-shape-corner-none, 0px)));--md-filled-field-active-indicator-color: var(--_text-field-active-indicator-color);--md-filled-field-active-indicator-height: var(--_text-field-active-indicator-height);--md-filled-field-container-color: var(--_text-field-container-color);--md-filled-field-container-shape-end-end: var(--_text-field-container-shape-end-end);--md-filled-field-container-shape-end-start: var(--_text-field-container-shape-end-start);--md-filled-field-container-shape-start-end: var(--_text-field-container-shape-start-end);--md-filled-field-container-shape-start-start: var(--_text-field-container-shape-start-start);--md-filled-field-content-color: var(--_text-field-input-text-color);--md-filled-field-content-font: var(--_text-field-input-text-font);--md-filled-field-content-line-height: var(--_text-field-input-text-line-height);--md-filled-field-content-size: var(--_text-field-input-text-size);--md-filled-field-content-weight: var(--_text-field-input-text-weight);--md-filled-field-disabled-active-indicator-color: var(--_text-field-disabled-active-indicator-color);--md-filled-field-disabled-active-indicator-height: var(--_text-field-disabled-active-indicator-height);--md-filled-field-disabled-active-indicator-opacity: var(--_text-field-disabled-active-indicator-opacity);--md-filled-field-disabled-container-color: var(--_text-field-disabled-container-color);--md-filled-field-disabled-container-opacity: var(--_text-field-disabled-container-opacity);--md-filled-field-disabled-content-color: var(--_text-field-disabled-input-text-color);--md-filled-field-disabled-content-opacity: var(--_text-field-disabled-input-text-opacity);--md-filled-field-disabled-label-text-color: var(--_text-field-disabled-label-text-color);--md-filled-field-disabled-label-text-opacity: var(--_text-field-disabled-label-text-opacity);--md-filled-field-disabled-leading-content-color: var(--_text-field-disabled-leading-icon-color);--md-filled-field-disabled-leading-content-opacity: var(--_text-field-disabled-leading-icon-opacity);--md-filled-field-disabled-supporting-text-color: var(--_text-field-disabled-supporting-text-color);--md-filled-field-disabled-supporting-text-opacity: var(--_text-field-disabled-supporting-text-opacity);--md-filled-field-disabled-trailing-content-color: var(--_text-field-disabled-trailing-icon-color);--md-filled-field-disabled-trailing-content-opacity: var(--_text-field-disabled-trailing-icon-opacity);--md-filled-field-error-active-indicator-color: var(--_text-field-error-active-indicator-color);--md-filled-field-error-content-color: var(--_text-field-error-input-text-color);--md-filled-field-error-focus-active-indicator-color: var(--_text-field-error-focus-active-indicator-color);--md-filled-field-error-focus-content-color: var(--_text-field-error-focus-input-text-color);--md-filled-field-error-focus-label-text-color: var(--_text-field-error-focus-label-text-color);--md-filled-field-error-focus-leading-content-color: var(--_text-field-error-focus-leading-icon-color);--md-filled-field-error-focus-supporting-text-color: var(--_text-field-error-focus-supporting-text-color);--md-filled-field-error-focus-trailing-content-color: var(--_text-field-error-focus-trailing-icon-color);--md-filled-field-error-hover-active-indicator-color: var(--_text-field-error-hover-active-indicator-color);--md-filled-field-error-hover-content-color: var(--_text-field-error-hover-input-text-color);--md-filled-field-error-hover-label-text-color: var(--_text-field-error-hover-label-text-color);--md-filled-field-error-hover-leading-content-color: var(--_text-field-error-hover-leading-icon-color);--md-filled-field-error-hover-state-layer-color: var(--_text-field-error-hover-state-layer-color);--md-filled-field-error-hover-state-layer-opacity: var(--_text-field-error-hover-state-layer-opacity);--md-filled-field-error-hover-supporting-text-color: var(--_text-field-error-hover-supporting-text-color);--md-filled-field-error-hover-trailing-content-color: var(--_text-field-error-hover-trailing-icon-color);--md-filled-field-error-label-text-color: var(--_text-field-error-label-text-color);--md-filled-field-error-leading-content-color: var(--_text-field-error-leading-icon-color);--md-filled-field-error-supporting-text-color: var(--_text-field-error-supporting-text-color);--md-filled-field-error-trailing-content-color: var(--_text-field-error-trailing-icon-color);--md-filled-field-focus-active-indicator-color: var(--_text-field-focus-active-indicator-color);--md-filled-field-focus-active-indicator-height: var(--_text-field-focus-active-indicator-height);--md-filled-field-focus-content-color: var(--_text-field-focus-input-text-color);--md-filled-field-focus-label-text-color: var(--_text-field-focus-label-text-color);--md-filled-field-focus-leading-content-color: var(--_text-field-focus-leading-icon-color);--md-filled-field-focus-supporting-text-color: var(--_text-field-focus-supporting-text-color);--md-filled-field-focus-trailing-content-color: var(--_text-field-focus-trailing-icon-color);--md-filled-field-hover-active-indicator-color: var(--_text-field-hover-active-indicator-color);--md-filled-field-hover-active-indicator-height: var(--_text-field-hover-active-indicator-height);--md-filled-field-hover-content-color: var(--_text-field-hover-input-text-color);--md-filled-field-hover-label-text-color: var(--_text-field-hover-label-text-color);--md-filled-field-hover-leading-content-color: var(--_text-field-hover-leading-icon-color);--md-filled-field-hover-state-layer-color: var(--_text-field-hover-state-layer-color);--md-filled-field-hover-state-layer-opacity: var(--_text-field-hover-state-layer-opacity);--md-filled-field-hover-supporting-text-color: var(--_text-field-hover-supporting-text-color);--md-filled-field-hover-trailing-content-color: var(--_text-field-hover-trailing-icon-color);--md-filled-field-label-text-color: var(--_text-field-label-text-color);--md-filled-field-label-text-font: var(--_text-field-label-text-font);--md-filled-field-label-text-line-height: var(--_text-field-label-text-line-height);--md-filled-field-label-text-populated-line-height: var(--_text-field-label-text-populated-line-height);--md-filled-field-label-text-populated-size: var(--_text-field-label-text-populated-size);--md-filled-field-label-text-size: var(--_text-field-label-text-size);--md-filled-field-label-text-weight: var(--_text-field-label-text-weight);--md-filled-field-leading-content-color: var(--_text-field-leading-icon-color);--md-filled-field-supporting-text-color: var(--_text-field-supporting-text-color);--md-filled-field-supporting-text-font: var(--_text-field-supporting-text-font);--md-filled-field-supporting-text-line-height: var(--_text-field-supporting-text-line-height);--md-filled-field-supporting-text-size: var(--_text-field-supporting-text-size);--md-filled-field-supporting-text-weight: var(--_text-field-supporting-text-weight);--md-filled-field-trailing-content-color: var(--_text-field-trailing-icon-color)}[has-start] .icon.leading{font-size:var(--_text-field-leading-icon-size);height:var(--_text-field-leading-icon-size);width:var(--_text-field-leading-icon-size)}.icon.trailing{font-size:var(--_text-field-trailing-icon-size);height:var(--_text-field-trailing-icon-size);width:var(--_text-field-trailing-icon-size)}
`
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */,Pr=s`:host{color:unset;min-width:210px;display:flex}.field{cursor:default;outline:none}.select{position:relative;flex-direction:column}.icon.trailing svg,.icon ::slotted(*){fill:currentColor}.icon ::slotted(*){width:inherit;height:inherit;font-size:inherit}.icon slot{display:flex;height:100%;width:100%;align-items:center;justify-content:center}.icon.trailing :is(.up,.down){opacity:0;transition:opacity 75ms linear 75ms}.select:not(.open) .down,.select.open .up{opacity:1}.field,.select,md-menu{min-width:inherit;width:inherit;max-width:inherit;display:flex}md-menu{min-width:var(--__menu-min-width);max-width:var(--__menu-max-width, inherit)}.menu-wrapper{width:0px;height:0px;max-width:inherit}md-menu ::slotted(:not[disabled]){cursor:pointer}.field,.select{width:100%}:host{display:inline-flex}:host([disabled]){pointer-events:none}
`
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let Nr=class extends Mr{};Nr.styles=[Pr,Rr],Nr=e([ce("md-filled-select")],Nr);class Vr{get role(){return this.menuItemController.role}get typeaheadText(){return this.menuItemController.typeaheadText}setTypeaheadText(e){this.menuItemController.setTypeaheadText(e)}get displayText(){return null!==this.internalDisplayText?this.internalDisplayText:this.menuItemController.typeaheadText}setDisplayText(e){this.internalDisplayText=e}constructor(e,t){this.host=e,this.internalDisplayText=null,this.firstUpdate=!0,this.onClick=()=>{this.menuItemController.onClick()},this.onKeydown=e=>{this.menuItemController.onKeydown(e)},this.lastSelected=this.host.selected,this.menuItemController=new Jt(e,t),e.addController(this)}hostUpdate(){this.lastSelected!==this.host.selected&&(this.host.ariaSelected=this.host.selected?"true":"false")}hostUpdated(){this.lastSelected===this.host.selected||this.firstUpdate||(this.host.selected?this.host.dispatchEvent(new Event("request-selection",{bubbles:!0,composed:!0})):this.host.dispatchEvent(new Event("request-deselection",{bubbles:!0,composed:!0}))),this.lastSelected=this.host.selected,this.firstUpdate=!1}}
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const Fr=Wt(le);class Hr extends Fr{constructor(){super(...arguments),this.disabled=!1,this.isMenuItem=!0,this.selected=!1,this.value="",this.type="option",this.selectOptionController=new Vr(this,{getHeadlineElements:()=>this.headlineElements,getSupportingTextElements:()=>this.supportingTextElements,getDefaultElements:()=>this.defaultElements,getInteractiveElement:()=>this.listItemRoot})}get typeaheadText(){return this.selectOptionController.typeaheadText}set typeaheadText(e){this.selectOptionController.setTypeaheadText(e)}get displayText(){return this.selectOptionController.displayText}set displayText(e){this.selectOptionController.setDisplayText(e)}render(){return this.renderListItem(q`
      <md-item>
        <div slot="container">
          ${this.renderRipple()} ${this.renderFocusRing()}
        </div>
        <slot name="start" slot="start"></slot>
        <slot name="end" slot="end"></slot>
        ${this.renderBody()}
      </md-item>
    `)}renderListItem(e){return q`
      <li
        id="item"
        tabindex=${this.disabled?-1:0}
        role=${this.selectOptionController.role}
        aria-label=${this.ariaLabel||G}
        aria-selected=${this.ariaSelected||G}
        aria-checked=${this.ariaChecked||G}
        aria-expanded=${this.ariaExpanded||G}
        aria-haspopup=${this.ariaHasPopup||G}
        class="list-item ${Re(this.getRenderClasses())}"
        @click=${this.selectOptionController.onClick}
        @keydown=${this.selectOptionController.onKeydown}
        >${e}</li
      >
    `}renderRipple(){return q` <md-ripple
      part="ripple"
      for="item"
      ?disabled=${this.disabled}></md-ripple>`}renderFocusRing(){return q` <md-focus-ring
      part="focus-ring"
      for="item"
      inward></md-focus-ring>`}getRenderClasses(){return{disabled:this.disabled,selected:this.selected}}renderBody(){return q`
      <slot></slot>
      <slot name="overline" slot="overline"></slot>
      <slot name="headline" slot="headline"></slot>
      <slot name="supporting-text" slot="supporting-text"></slot>
      <slot
        name="trailing-supporting-text"
        slot="trailing-supporting-text"></slot>
    `}focus(){this.listItemRoot?.focus()}}Hr.shadowRootOptions={...le.shadowRootOptions,delegatesFocus:!0},e([ue({type:Boolean,reflect:!0})],Hr.prototype,"disabled",void 0),e([ue({type:Boolean,attribute:"md-menu-item",reflect:!0})],Hr.prototype,"isMenuItem",void 0),e([ue({type:Boolean})],Hr.prototype,"selected",void 0),e([ue()],Hr.prototype,"value",void 0),e([ve(".list-item")],Hr.prototype,"listItemRoot",void 0),e([ye({slot:"headline"})],Hr.prototype,"headlineElements",void 0),e([ye({slot:"supporting-text"})],Hr.prototype,"supportingTextElements",void 0),e([be({slot:""})],Hr.prototype,"defaultElements",void 0),e([ue({attribute:"typeahead-text"})],Hr.prototype,"typeaheadText",null),e([ue({attribute:"display-text"})],Hr.prototype,"displayText",null);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
let Ur=class extends Hr{};Ur.styles=[Xt],Ur=e([ce("md-select-option")],Ur);
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const qr=Wt(_i(Ci(ri(le))));class Br extends qr{constructor(){super(),this.checked=!1,this.indeterminate=!1,this.required=!1,this.value="on",this.prevChecked=!1,this.prevDisabled=!1,this.prevIndeterminate=!1,this.addEventListener("click",e=>{mi(e)&&this.input&&(this.focus(),ui(this.input))})}update(e){(e.has("checked")||e.has("disabled")||e.has("indeterminate"))&&(this.prevChecked=e.get("checked")??this.checked,this.prevDisabled=e.get("disabled")??this.disabled,this.prevIndeterminate=e.get("indeterminate")??this.indeterminate),super.update(e)}render(){const e=!this.prevChecked&&!this.prevIndeterminate,t=this.prevChecked&&!this.prevIndeterminate,i=this.prevIndeterminate,r=this.checked&&!this.indeterminate,o=this.indeterminate,a=Re({disabled:this.disabled,selected:r||o,unselected:!r&&!o,checked:r,indeterminate:o,"prev-unselected":e,"prev-checked":t,"prev-indeterminate":i,"prev-disabled":this.prevDisabled}),{ariaLabel:n,ariaInvalid:s}=this;return q`
      <div class="container ${a}">
        <input
          type="checkbox"
          id="input"
          aria-checked=${o?"mixed":G}
          aria-label=${n||G}
          aria-invalid=${s||G}
          ?disabled=${this.disabled}
          ?required=${this.required}
          .indeterminate=${this.indeterminate}
          .checked=${this.checked}
          @input=${this.handleInput}
          @change=${this.handleChange} />

        <div class="outline"></div>
        <div class="background"></div>
        <md-focus-ring part="focus-ring" for="input"></md-focus-ring>
        <md-ripple for="input" ?disabled=${this.disabled}></md-ripple>
        <svg class="icon" viewBox="0 0 18 18" aria-hidden="true">
          <rect class="mark short" />
          <rect class="mark long" />
        </svg>
      </div>
    `}handleInput(e){const t=e.target;this.checked=t.checked,this.indeterminate=t.indeterminate}handleChange(e){vi(this,e)}[ki](){return!this.checked||this.indeterminate?null:this.value}[$i](){return String(this.checked)}formResetCallback(){this.checked=this.hasAttribute("checked")}formStateRestoreCallback(e){this.checked="true"===e}[gi](){return new Di(()=>this)}[yi](){return this.input}}Br.shadowRootOptions={...le.shadowRootOptions,delegatesFocus:!0},e([ue({type:Boolean})],Br.prototype,"checked",void 0),e([ue({type:Boolean})],Br.prototype,"indeterminate",void 0),e([ue({type:Boolean})],Br.prototype,"required",void 0),e([ue()],Br.prototype,"value",void 0),e([me()],Br.prototype,"prevChecked",void 0),e([me()],Br.prototype,"prevDisabled",void 0),e([me()],Br.prototype,"prevIndeterminate",void 0),e([ve("input")],Br.prototype,"input",void 0);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Gr=s`:host{border-start-start-radius:var(--md-checkbox-container-shape-start-start, var(--md-checkbox-container-shape, 2px));border-start-end-radius:var(--md-checkbox-container-shape-start-end, var(--md-checkbox-container-shape, 2px));border-end-end-radius:var(--md-checkbox-container-shape-end-end, var(--md-checkbox-container-shape, 2px));border-end-start-radius:var(--md-checkbox-container-shape-end-start, var(--md-checkbox-container-shape, 2px));display:inline-flex;height:var(--md-checkbox-container-size, 18px);position:relative;vertical-align:top;width:var(--md-checkbox-container-size, 18px);-webkit-tap-highlight-color:rgba(0,0,0,0);cursor:pointer}:host([disabled]){cursor:default}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--md-checkbox-container-size, 18px))/2)}md-focus-ring{height:44px;inset:unset;width:44px}input{appearance:none;height:48px;margin:0;opacity:0;outline:none;position:absolute;width:48px;z-index:1;cursor:inherit}:host([touch-target=none]) input{height:100%;width:100%}.container{border-radius:inherit;display:flex;height:100%;place-content:center;place-items:center;position:relative;width:100%}.outline,.background,.icon{inset:0;position:absolute}.outline,.background{border-radius:inherit}.outline{border-color:var(--md-checkbox-outline-color, var(--md-sys-color-on-surface-variant, #49454f));border-style:solid;border-width:var(--md-checkbox-outline-width, 2px);box-sizing:border-box}.background{background-color:var(--md-checkbox-selected-container-color, var(--md-sys-color-primary, #6750a4))}.background,.icon{opacity:0;transition-duration:150ms,50ms;transition-property:transform,opacity;transition-timing-function:cubic-bezier(0.3, 0, 0.8, 0.15),linear;transform:scale(0.6)}:where(.selected) :is(.background,.icon){opacity:1;transition-duration:350ms,50ms;transition-timing-function:cubic-bezier(0.05, 0.7, 0.1, 1),linear;transform:scale(1)}md-ripple{border-radius:var(--md-checkbox-state-layer-shape, var(--md-sys-shape-corner-full, 9999px));height:var(--md-checkbox-state-layer-size, 40px);inset:unset;width:var(--md-checkbox-state-layer-size, 40px);--md-ripple-hover-color: var(--md-checkbox-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-hover-opacity: var(--md-checkbox-hover-state-layer-opacity, 0.08);--md-ripple-pressed-color: var(--md-checkbox-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--md-ripple-pressed-opacity: var(--md-checkbox-pressed-state-layer-opacity, 0.12)}.selected md-ripple{--md-ripple-hover-color: var(--md-checkbox-selected-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--md-ripple-hover-opacity: var(--md-checkbox-selected-hover-state-layer-opacity, 0.08);--md-ripple-pressed-color: var(--md-checkbox-selected-pressed-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-pressed-opacity: var(--md-checkbox-selected-pressed-state-layer-opacity, 0.12)}.icon{fill:var(--md-checkbox-selected-icon-color, var(--md-sys-color-on-primary, #fff));height:var(--md-checkbox-icon-size, 18px);width:var(--md-checkbox-icon-size, 18px)}.mark.short{height:2px;transition-property:transform,height;width:2px}.mark.long{height:2px;transition-property:transform,width;width:10px}.mark{animation-duration:150ms;animation-timing-function:cubic-bezier(0.3, 0, 0.8, 0.15);transition-duration:150ms;transition-timing-function:cubic-bezier(0.3, 0, 0.8, 0.15)}.selected .mark{animation-duration:350ms;animation-timing-function:cubic-bezier(0.05, 0.7, 0.1, 1);transition-duration:350ms;transition-timing-function:cubic-bezier(0.05, 0.7, 0.1, 1)}.checked .mark,.prev-checked.unselected .mark{transform:scaleY(-1) translate(7px, -14px) rotate(45deg)}.checked .mark.short,.prev-checked.unselected .mark.short{height:5.6568542495px}.checked .mark.long,.prev-checked.unselected .mark.long{width:11.313708499px}.indeterminate .mark,.prev-indeterminate.unselected .mark{transform:scaleY(-1) translate(4px, -10px) rotate(0deg)}.prev-unselected .mark{transition-property:none}.prev-unselected.checked .mark.long{animation-name:prev-unselected-to-checked}@keyframes prev-unselected-to-checked{from{width:0}}:where(:hover) .outline{border-color:var(--md-checkbox-hover-outline-color, var(--md-sys-color-on-surface, #1d1b20));border-width:var(--md-checkbox-hover-outline-width, 2px)}:where(:hover) .background{background:var(--md-checkbox-selected-hover-container-color, var(--md-sys-color-primary, #6750a4))}:where(:hover) .icon{fill:var(--md-checkbox-selected-hover-icon-color, var(--md-sys-color-on-primary, #fff))}:where(:focus-within) .outline{border-color:var(--md-checkbox-focus-outline-color, var(--md-sys-color-on-surface, #1d1b20));border-width:var(--md-checkbox-focus-outline-width, 2px)}:where(:focus-within) .background{background:var(--md-checkbox-selected-focus-container-color, var(--md-sys-color-primary, #6750a4))}:where(:focus-within) .icon{fill:var(--md-checkbox-selected-focus-icon-color, var(--md-sys-color-on-primary, #fff))}:where(:active) .outline{border-color:var(--md-checkbox-pressed-outline-color, var(--md-sys-color-on-surface, #1d1b20));border-width:var(--md-checkbox-pressed-outline-width, 2px)}:where(:active) .background{background:var(--md-checkbox-selected-pressed-container-color, var(--md-sys-color-primary, #6750a4))}:where(:active) .icon{fill:var(--md-checkbox-selected-pressed-icon-color, var(--md-sys-color-on-primary, #fff))}:where(.disabled,.prev-disabled) :is(.background,.icon,.mark){animation-duration:0s;transition-duration:0s}:where(.disabled) .outline{border-color:var(--md-checkbox-disabled-outline-color, var(--md-sys-color-on-surface, #1d1b20));border-width:var(--md-checkbox-disabled-outline-width, 2px);opacity:var(--md-checkbox-disabled-container-opacity, 0.38)}:where(.selected.disabled) .outline{visibility:hidden}:where(.selected.disabled) .background{background:var(--md-checkbox-selected-disabled-container-color, var(--md-sys-color-on-surface, #1d1b20));opacity:var(--md-checkbox-selected-disabled-container-opacity, 0.38)}:where(.disabled) .icon{fill:var(--md-checkbox-selected-disabled-icon-color, var(--md-sys-color-surface, #fef7ff))}@media(forced-colors: active){.background{background-color:CanvasText}.selected.disabled .background{background-color:GrayText;opacity:1}.outline{border-color:CanvasText}.disabled .outline{border-color:GrayText;opacity:1}.icon{fill:Canvas}}
`
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let jr=class extends Br{};jr.styles=[Gr],jr=e([ce("md-checkbox")],jr);
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const Wr=Symbol("isFocusable"),Zr=Symbol("privateIsFocusable"),Yr=Symbol("externalTabIndex"),Jr=Symbol("isUpdatingTabIndex"),Kr=Symbol("updateTabIndex");
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class Qr extends Si{computeValidity(e){this.radioElement||(this.radioElement=document.createElement("input"),this.radioElement.type="radio",this.radioElement.name="group");let t=!1,i=!1;for(const{checked:r,required:o}of e)o&&(t=!0),r&&(i=!0);return this.radioElement.checked=i,this.radioElement.required=t,{validity:{valueMissing:t&&!i},validationMessage:this.radioElement.validationMessage}}equals(e,t){if(e.length!==t.length)return!1;for(let i=0;i<e.length;i++){const r=e[i],o=t[i];if(r.checked!==o.checked||r.required!==o.required)return!1}return!0}copy(e){return e.map(({checked:e,required:t})=>({checked:e,required:t}))}}
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */class Xr{get controls(){const e=this.host.getAttribute("name");return e&&this.root&&this.host.isConnected?Array.from(this.root.querySelectorAll(`[name="${e}"]`)):[this.host]}constructor(e){this.host=e,this.focused=!1,this.root=null,this.handleFocusIn=()=>{this.focused=!0,this.updateTabIndices()},this.handleFocusOut=()=>{this.focused=!1,this.updateTabIndices()},this.handleKeyDown=e=>{const t="ArrowDown"===e.key,i="ArrowUp"===e.key,r="ArrowLeft"===e.key,o="ArrowRight"===e.key;if(!(r||o||t||i))return;const a=this.controls;if(!a.length)return;e.preventDefault();const n="rtl"===getComputedStyle(this.host).direction?r||t:o||t,s=a.indexOf(this.host);let l=n?s+1:s-1;for(;l!==s;){l>=a.length?l=0:l<0&&(l=a.length-1);const e=a[l];if(!e.hasAttribute("disabled")){for(const t of a)t!==e&&(t.checked=!1,t.tabIndex=-1,t.blur());e.checked=!0,e.tabIndex=0,e.focus(),e.dispatchEvent(new Event("change",{bubbles:!0}));break}n?l++:l--}}}hostConnected(){this.host.addEventListener("keydown",this.handleKeyDown),this.host.addEventListener("focusin",this.handleFocusIn),this.host.addEventListener("focusout",this.handleFocusOut),queueMicrotask(()=>{this.root=this.host.getRootNode(),this.host.checked&&this.uncheckSiblings(),this.updateTabIndices()})}hostDisconnected(){this.host.removeEventListener("keydown",this.handleKeyDown),this.host.removeEventListener("focusin",this.handleFocusIn),this.host.removeEventListener("focusout",this.handleFocusOut),queueMicrotask(()=>{this.updateTabIndices(),this.root=null})}handleCheckedChange(){this.host.checked&&(this.uncheckSiblings(),this.updateTabIndices())}uncheckSiblings(){for(const e of this.controls)e!==this.host&&(e.checked=!1)}updateTabIndices(){const e=this.controls,t=e.find(e=>e.checked);if(t||this.focused){const i=t||this.host;i.tabIndex=0;for(const t of e)t!==i&&(t.tabIndex=-1);return}for(const t of e)t.tabIndex=0}}
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */var eo;const to=Symbol("checked");let io=0;const ro=_i(Ci(ri(function(t){var i,r,o;class a extends t{constructor(){super(...arguments),this[i]=!0,this[r]=null,this[o]=!1}get[Wr](){return this[Zr]}set[Wr](e){this[Wr]!==e&&(this[Zr]=e,this[Kr]())}connectedCallback(){super.connectedCallback(),this[Kr]()}attributeChangedCallback(e,t,i){if("tabindex"===e){if(this.requestUpdate("tabIndex",Number(t??-1)),!this[Jr])return this.hasAttribute("tabindex")?void(this[Yr]=this.tabIndex):(this[Yr]=null,void this[Kr]())}else super.attributeChangedCallback(e,t,i)}[(i=Zr,r=Yr,o=Jr,Kr)](){const e=this[Wr]?0:-1,t=this[Yr]??e;this[Jr]=!0,this.tabIndex=t,this[Jr]=!1}}return e([ue({noAccessor:!0})],a.prototype,"tabIndex",void 0),a}(le))));class oo extends ro{get checked(){return this[to]}set checked(e){const t=this.checked;t!==e&&(this[to]=e,this.requestUpdate("checked",t),this.selectionController.handleCheckedChange())}constructor(){super(),this.maskId="cutout"+ ++io,this[eo]=!1,this.required=!1,this.value="on",this.selectionController=new Xr(this),this.addController(this.selectionController),this[ti].role="radio",this.addEventListener("click",this.handleClick.bind(this)),this.addEventListener("keydown",this.handleKeydown.bind(this))}render(){const e={checked:this.checked};return q`
      <div class="container ${Re(e)}" aria-hidden="true">
        <md-ripple
          part="ripple"
          .control=${this}
          ?disabled=${this.disabled}></md-ripple>
        <md-focus-ring part="focus-ring" .control=${this}></md-focus-ring>
        <svg class="icon" viewBox="0 0 20 20">
          <mask id="${this.maskId}">
            <rect width="100%" height="100%" fill="white" />
            <circle cx="10" cy="10" r="8" fill="black" />
          </mask>
          <circle
            class="outer circle"
            cx="10"
            cy="10"
            r="10"
            mask="url(#${this.maskId})" />
          <circle class="inner circle" cx="10" cy="10" r="5" />
        </svg>

        <div class="touch-target"></div>
      </div>
    `}updated(){this[ti].ariaChecked=String(this.checked)}async handleClick(e){this.disabled||(await 0,e.defaultPrevented||(mi(e)&&this.focus(),this.checked=!0,this.dispatchEvent(new Event("change",{bubbles:!0})),this.dispatchEvent(new InputEvent("input",{bubbles:!0,composed:!0}))))}async handleKeydown(e){await 0," "!==e.key||e.defaultPrevented||this.click()}[(eo=to,ki)](){return this.checked?this.value:null}[$i](){return String(this.checked)}formResetCallback(){this.checked=this.hasAttribute("checked")}formStateRestoreCallback(e){this.checked="true"===e}[gi](){return new Qr(()=>this.selectionController?this.selectionController.controls:[this])}[yi](){return this.container}}e([ue({type:Boolean})],oo.prototype,"checked",null),e([ue({type:Boolean})],oo.prototype,"required",void 0),e([ue()],oo.prototype,"value",void 0),e([ve(".container")],oo.prototype,"container",void 0);
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const ao=s`@layer{:host{display:inline-flex;height:var(--md-radio-icon-size, 20px);outline:none;position:relative;vertical-align:top;width:var(--md-radio-icon-size, 20px);-webkit-tap-highlight-color:rgba(0,0,0,0);cursor:pointer;--md-ripple-hover-color: var(--md-radio-hover-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-hover-opacity: var(--md-radio-hover-state-layer-opacity, 0.08);--md-ripple-pressed-color: var(--md-radio-pressed-state-layer-color, var(--md-sys-color-primary, #6750a4));--md-ripple-pressed-opacity: var(--md-radio-pressed-state-layer-opacity, 0.12)}:host([disabled]){cursor:default}:host([touch-target=wrapper]){margin:max(0px,(48px - var(--md-radio-icon-size, 20px))/2)}.container{display:flex;height:100%;place-content:center;place-items:center;width:100%}md-focus-ring{height:44px;inset:unset;width:44px}.checked{--md-ripple-hover-color: var(--md-radio-selected-hover-state-layer-color, var(--md-sys-color-primary, #6750a4));--md-ripple-hover-opacity: var(--md-radio-selected-hover-state-layer-opacity, 0.08);--md-ripple-pressed-color: var(--md-radio-selected-pressed-state-layer-color, var(--md-sys-color-on-surface, #1d1b20));--md-ripple-pressed-opacity: var(--md-radio-selected-pressed-state-layer-opacity, 0.12)}.touch-target{height:48px;position:absolute;width:48px}:host([touch-target=none]) .touch-target{display:none}md-ripple{border-radius:50%;height:var(--md-radio-state-layer-size, 40px);inset:unset;width:var(--md-radio-state-layer-size, 40px)}.icon{fill:var(--md-radio-icon-color, var(--md-sys-color-on-surface-variant, #49454f));inset:0;position:absolute}.outer.circle{transition:fill 50ms linear}.inner.circle{opacity:0;transform-origin:center;transition:opacity 50ms linear}.checked .icon{fill:var(--md-radio-selected-icon-color, var(--md-sys-color-primary, #6750a4))}.checked .inner.circle{animation:inner-circle-grow 300ms cubic-bezier(0.05, 0.7, 0.1, 1);opacity:1}@keyframes inner-circle-grow{from{transform:scale(0)}to{transform:scale(1)}}:host([disabled]) .circle{animation-duration:0s;transition-duration:0s}:host(:hover) .icon{fill:var(--md-radio-hover-icon-color, var(--md-sys-color-on-surface, #1d1b20))}:host(:focus-within) .icon{fill:var(--md-radio-focus-icon-color, var(--md-sys-color-on-surface, #1d1b20))}:host(:active) .icon{fill:var(--md-radio-pressed-icon-color, var(--md-sys-color-on-surface, #1d1b20))}:host([disabled]) .icon{fill:var(--md-radio-disabled-unselected-icon-color, var(--md-sys-color-on-surface, #1d1b20));opacity:var(--md-radio-disabled-unselected-icon-opacity, 0.38)}:host(:hover) .checked .icon{fill:var(--md-radio-selected-hover-icon-color, var(--md-sys-color-primary, #6750a4))}:host(:focus-within) .checked .icon{fill:var(--md-radio-selected-focus-icon-color, var(--md-sys-color-primary, #6750a4))}:host(:active) .checked .icon{fill:var(--md-radio-selected-pressed-icon-color, var(--md-sys-color-primary, #6750a4))}:host([disabled]) .checked .icon{fill:var(--md-radio-disabled-selected-icon-color, var(--md-sys-color-on-surface, #1d1b20));opacity:var(--md-radio-disabled-selected-icon-opacity, 0.38)}}@layer hcm{@media(forced-colors: active){.icon{fill:CanvasText}:host([disabled]) .icon{fill:GrayText;opacity:1}}}
`
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let no=class extends oo{};no.styles=[ao],no=e([ce("md-radio")],no);
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
class so extends le{render(){return q`<slot></slot>`}connectedCallback(){super.connectedCallback();"false"!==this.getAttribute("aria-hidden")?this.setAttribute("aria-hidden","true"):this.removeAttribute("aria-hidden")}}
/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */const lo=s`:host{font-size:var(--md-icon-size, 24px);width:var(--md-icon-size, 24px);height:var(--md-icon-size, 24px);color:inherit;font-variation-settings:inherit;font-weight:400;font-family:var(--md-icon-font, Material Symbols Outlined);display:inline-flex;font-style:normal;place-items:center;place-content:center;line-height:1;overflow:hidden;letter-spacing:normal;text-transform:none;user-select:none;white-space:nowrap;word-wrap:normal;flex-shrink:0;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;-moz-osx-font-smoothing:grayscale}::slotted(svg){fill:currentColor}::slotted(*){height:100%;width:100%}
`
/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */;let co=class extends so{};co.styles=[lo],co=e([ce("md-icon")],co);var ho="M21.33,12.91C21.42,14.46 20.71,15.95 19.44,16.86L20.21,18.35C20.44,18.8 20.47,19.33 20.27,19.8C20.08,20.27 19.69,20.64 19.21,20.8L18.42,21.05C18.25,21.11 18.06,21.14 17.88,21.14C17.37,21.14 16.89,20.91 16.56,20.5L14.44,18C13.55,17.85 12.71,17.47 12,16.9C11.5,17.05 11,17.13 10.5,17.13C9.62,17.13 8.74,16.86 8,16.34C7.47,16.5 6.93,16.57 6.38,16.56C5.59,16.57 4.81,16.41 4.08,16.11C2.65,15.47 1.7,14.07 1.65,12.5C1.57,11.78 1.69,11.05 2,10.39C1.71,9.64 1.68,8.82 1.93,8.06C2.3,7.11 3,6.32 3.87,5.82C4.45,4.13 6.08,3 7.87,3.12C9.47,1.62 11.92,1.46 13.7,2.75C14.12,2.64 14.56,2.58 15,2.58C16.36,2.55 17.65,3.15 18.5,4.22C20.54,4.75 22,6.57 22.08,8.69C22.13,9.8 21.83,10.89 21.22,11.82C21.29,12.18 21.33,12.54 21.33,12.91M16.33,11.5C16.9,11.57 17.35,12 17.35,12.57A1,1 0 0,1 16.35,13.57H15.72C15.4,14.47 14.84,15.26 14.1,15.86C14.35,15.95 14.61,16 14.87,16.07C20,16 19.4,12.87 19.4,12.82C19.34,11.39 18.14,10.27 16.71,10.33A1,1 0 0,1 15.71,9.33A1,1 0 0,1 16.71,8.33C17.94,8.36 19.12,8.82 20.04,9.63C20.09,9.34 20.12,9.04 20.12,8.74C20.06,7.5 19.5,6.42 17.25,6.21C16,3.25 12.85,4.89 12.85,5.81V5.81C12.82,6.04 13.06,6.53 13.1,6.56A1,1 0 0,1 14.1,7.56C14.1,8.11 13.65,8.56 13.1,8.56V8.56C12.57,8.54 12.07,8.34 11.67,8C11.19,8.31 10.64,8.5 10.07,8.56V8.56C9.5,8.61 9.03,8.21 9,7.66C8.92,7.1 9.33,6.61 9.88,6.56C10.04,6.54 10.82,6.42 10.82,5.79V5.79C10.82,5.13 11.07,4.5 11.5,4C10.58,3.75 9.59,4.08 8.59,5.29C6.75,5 6,5.25 5.45,7.2C4.5,7.67 4,8 3.78,9C4.86,8.78 5.97,8.87 7,9.25C7.5,9.44 7.78,10 7.59,10.54C7.4,11.06 6.82,11.32 6.3,11.13C5.57,10.81 4.75,10.79 4,11.07C3.68,11.34 3.68,11.9 3.68,12.34C3.68,13.08 4.05,13.77 4.68,14.17C5.21,14.44 5.8,14.58 6.39,14.57C6.24,14.31 6.11,14.04 6,13.76C5.81,13.22 6.1,12.63 6.64,12.44C7.18,12.25 7.77,12.54 7.96,13.08C8.36,14.22 9.38,15 10.58,15.13C11.95,15.06 13.17,14.25 13.77,13C14,11.62 15.11,11.5 16.33,11.5M18.33,18.97L17.71,17.67L17,17.83L18,19.08L18.33,18.97M13.68,10.36C13.7,9.83 13.3,9.38 12.77,9.33C12.06,9.29 11.37,9.53 10.84,10C10.27,10.58 9.97,11.38 10,12.19A1,1 0 0,0 11,13.19C11.57,13.19 12,12.74 12,12.19C12,11.92 12.07,11.65 12.23,11.43C12.35,11.33 12.5,11.28 12.66,11.28C13.21,11.31 13.68,10.9 13.68,10.36Z",po="M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z",uo="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",mo="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z",fo="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",vo="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",go="M11 20H6.5Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20H13V12.85L14.6 14.4L16 13L12 9L8 13L9.4 14.4L11 12.85Z",yo="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",bo="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z",xo="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",wo="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",_o="M22 9A4.32 4.32 0 0 1 19.78 8.45A3.4 3.4 0 0 0 18 8V7A4.32 4.32 0 0 1 20.22 7.55A3.4 3.4 0 0 0 22 8M22 6A3.4 3.4 0 0 1 20.22 5.55A4.32 4.32 0 0 0 18 5V6A3.4 3.4 0 0 1 19.78 6.45A4.32 4.32 0 0 0 22 7M22 10A3.4 3.4 0 0 1 20.22 9.55A4.32 4.32 0 0 0 18 9V10A3.4 3.4 0 0 1 19.78 10.45A4.32 4.32 0 0 0 22 11M10 12.73A70.39 70.39 0 0 0 17 11V4S10.5 2 7.5 2A5.5 5.5 0 0 0 6.12 12.82L7 19H8A3 3 0 0 0 9.46 21.33A3.15 3.15 0 0 1 11 24H12A4.12 4.12 0 0 0 10.09 20.55C9.39 20 9 19.63 9 19H10M7.5 10A2.5 2.5 0 1 1 10 7.5A2.5 2.5 0 0 1 7.5 10Z",ko="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z",$o="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z",Co="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",So="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",Do="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z",Eo="M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z",To="M8 13C6.14 13 4.59 14.28 4.14 16H2V18H4.14C4.59 19.72 6.14 21 8 21S11.41 19.72 11.86 18H22V16H11.86C11.41 14.28 9.86 13 8 13M8 19C6.9 19 6 18.1 6 17C6 15.9 6.9 15 8 15S10 15.9 10 17C10 18.1 9.1 19 8 19M19.86 6C19.41 4.28 17.86 3 16 3S12.59 4.28 12.14 6H2V8H12.14C12.59 9.72 14.14 11 16 11S19.41 9.72 19.86 8H22V6H19.86M16 9C14.9 9 14 8.1 14 7C14 5.9 14.9 5 16 5S18 5.9 18 7C18 8.1 17.1 9 16 9Z",Ao="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z",Io="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z",Oo="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z";class Lo extends Error{}class zo extends Lo{constructor(e){super(`Invalid DateTime: ${e.toMessage()}`)}}class Mo extends Lo{constructor(e){super(`Invalid Interval: ${e.toMessage()}`)}}class Ro extends Lo{constructor(e){super(`Invalid Duration: ${e.toMessage()}`)}}class Po extends Lo{}class No extends Lo{constructor(e){super(`Invalid unit ${e}`)}}class Vo extends Lo{}class Fo extends Lo{constructor(){super("Zone is an abstract class")}}const Ho="numeric",Uo="short",qo="long",Bo={year:Ho,month:Ho,day:Ho},Go={year:Ho,month:Uo,day:Ho},jo={year:Ho,month:Uo,day:Ho,weekday:Uo},Wo={year:Ho,month:qo,day:Ho},Zo={year:Ho,month:qo,day:Ho,weekday:qo},Yo={hour:Ho,minute:Ho},Jo={hour:Ho,minute:Ho,second:Ho},Ko={hour:Ho,minute:Ho,second:Ho,timeZoneName:Uo},Qo={hour:Ho,minute:Ho,second:Ho,timeZoneName:qo},Xo={hour:Ho,minute:Ho,hourCycle:"h23"},ea={hour:Ho,minute:Ho,second:Ho,hourCycle:"h23"},ta={hour:Ho,minute:Ho,second:Ho,hourCycle:"h23",timeZoneName:Uo},ia={hour:Ho,minute:Ho,second:Ho,hourCycle:"h23",timeZoneName:qo},ra={year:Ho,month:Ho,day:Ho,hour:Ho,minute:Ho},oa={year:Ho,month:Ho,day:Ho,hour:Ho,minute:Ho,second:Ho},aa={year:Ho,month:Uo,day:Ho,hour:Ho,minute:Ho},na={year:Ho,month:Uo,day:Ho,hour:Ho,minute:Ho,second:Ho},sa={year:Ho,month:Uo,day:Ho,weekday:Uo,hour:Ho,minute:Ho},la={year:Ho,month:qo,day:Ho,hour:Ho,minute:Ho,timeZoneName:Uo},da={year:Ho,month:qo,day:Ho,hour:Ho,minute:Ho,second:Ho,timeZoneName:Uo},ca={year:Ho,month:qo,day:Ho,weekday:qo,hour:Ho,minute:Ho,timeZoneName:qo},ha={year:Ho,month:qo,day:Ho,weekday:qo,hour:Ho,minute:Ho,second:Ho,timeZoneName:qo};class pa{get type(){throw new Fo}get name(){throw new Fo}get ianaName(){return this.name}get isUniversal(){throw new Fo}offsetName(e,t){throw new Fo}formatOffset(e,t){throw new Fo}offset(e){throw new Fo}equals(e){throw new Fo}get isValid(){throw new Fo}}let ua=null;class ma extends pa{static get instance(){return null===ua&&(ua=new ma),ua}get type(){return"system"}get name(){return(new Intl.DateTimeFormat).resolvedOptions().timeZone}get isUniversal(){return!1}offsetName(e,{format:t,locale:i}){return Mn(e,t,i)}formatOffset(e,t){return Vn(this.offset(e),t)}offset(e){return-new Date(e).getTimezoneOffset()}equals(e){return"system"===e.type}get isValid(){return!0}}const fa=new Map;const va={year:0,month:1,day:2,era:3,hour:4,minute:5,second:6};const ga=new Map;class ya extends pa{static create(e){let t=ga.get(e);return void 0===t&&ga.set(e,t=new ya(e)),t}static resetCache(){ga.clear(),fa.clear()}static isValidSpecifier(e){return this.isValidZone(e)}static isValidZone(e){if(!e)return!1;try{return new Intl.DateTimeFormat("en-US",{timeZone:e}).format(),!0}catch(e){return!1}}constructor(e){super(),this.zoneName=e,this.valid=ya.isValidZone(e)}get type(){return"iana"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(e,{format:t,locale:i}){return Mn(e,t,i,this.name)}formatOffset(e,t){return Vn(this.offset(e),t)}offset(e){if(!this.valid)return NaN;const t=new Date(e);if(isNaN(t))return NaN;const i=function(e){let t=fa.get(e);return void 0===t&&(t=new Intl.DateTimeFormat("en-US",{hour12:!1,timeZone:e,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",era:"short"}),fa.set(e,t)),t}(this.name);let[r,o,a,n,s,l,d]=i.formatToParts?function(e,t){const i=e.formatToParts(t),r=[];for(let e=0;e<i.length;e++){const{type:t,value:o}=i[e],a=va[t];"era"===t?r[a]=o:mn(a)||(r[a]=parseInt(o,10))}return r}(i,t):function(e,t){const i=e.format(t).replace(/\u200E/g,""),r=/(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(i),[,o,a,n,s,l,d,c]=r;return[n,o,a,s,l,d,c]}(i,t);"BC"===n&&(r=1-Math.abs(r));let c=+t;const h=c%1e3;return c-=h>=0?h:1e3+h,(In({year:r,month:o,day:a,hour:24===s?0:s,minute:l,second:d,millisecond:0})-c)/6e4}equals(e){return"iana"===e.type&&e.name===this.name}get isValid(){return this.valid}}let ba={};const xa=new Map;function wa(e,t={}){const i=JSON.stringify([e,t]);let r=xa.get(i);return void 0===r&&(r=new Intl.DateTimeFormat(e,t),xa.set(i,r)),r}const _a=new Map;const ka=new Map;let $a=null;const Ca=new Map;function Sa(e){let t=Ca.get(e);return void 0===t&&(t=new Intl.DateTimeFormat(e).resolvedOptions(),Ca.set(e,t)),t}const Da=new Map;function Ea(e,t,i,r){const o=e.listingMode();return"error"===o?null:"en"===o?i(t):r(t)}class Ta{constructor(e,t,i){this.padTo=i.padTo||0,this.floor=i.floor||!1;const{padTo:r,floor:o,...a}=i;if(!t||Object.keys(a).length>0){const t={useGrouping:!1,...i};i.padTo>0&&(t.minimumIntegerDigits=i.padTo),this.inf=function(e,t={}){const i=JSON.stringify([e,t]);let r=_a.get(i);return void 0===r&&(r=new Intl.NumberFormat(e,t),_a.set(i,r)),r}(e,t)}}format(e){if(this.inf){const t=this.floor?Math.floor(e):e;return this.inf.format(t)}return kn(this.floor?Math.floor(e):Dn(e,3),this.padTo)}}class Aa{constructor(e,t,i){let r;if(this.opts=i,this.originalZone=void 0,this.opts.timeZone)this.dt=e;else if("fixed"===e.zone.type){const t=e.offset/60*-1,i=t>=0?`Etc/GMT+${t}`:`Etc/GMT${t}`;0!==e.offset&&ya.create(i).valid?(r=i,this.dt=e):(r="UTC",this.dt=0===e.offset?e:e.setZone("UTC").plus({minutes:e.offset}),this.originalZone=e.zone)}else"system"===e.zone.type?this.dt=e:"iana"===e.zone.type?(this.dt=e,r=e.zone.name):(r="UTC",this.dt=e.setZone("UTC").plus({minutes:e.offset}),this.originalZone=e.zone);const o={...this.opts};o.timeZone=o.timeZone||r,this.dtf=wa(t,o)}format(){return this.originalZone?this.formatToParts().map(({value:e})=>e).join(""):this.dtf.format(this.dt.toJSDate())}formatToParts(){const e=this.dtf.formatToParts(this.dt.toJSDate());return this.originalZone?e.map(e=>{if("timeZoneName"===e.type){const t=this.originalZone.offsetName(this.dt.ts,{locale:this.dt.locale,format:this.opts.timeZoneName});return{...e,value:t}}return e}):e}resolvedOptions(){return this.dtf.resolvedOptions()}}class Ia{constructor(e,t,i){this.opts={style:"long",...i},!t&&gn()&&(this.rtf=function(e,t={}){const{base:i,...r}=t,o=JSON.stringify([e,r]);let a=ka.get(o);return void 0===a&&(a=new Intl.RelativeTimeFormat(e,t),ka.set(o,a)),a}(e,i))}format(e,t){return this.rtf?this.rtf.format(e,t):function(e,t,i="always",r=!1){const o={years:["year","yr."],quarters:["quarter","qtr."],months:["month","mo."],weeks:["week","wk."],days:["day","day","days"],hours:["hour","hr."],minutes:["minute","min."],seconds:["second","sec."]},a=-1===["hours","minutes","seconds"].indexOf(e);if("auto"===i&&a){const i="days"===e;switch(t){case 1:return i?"tomorrow":`next ${o[e][0]}`;case-1:return i?"yesterday":`last ${o[e][0]}`;case 0:return i?"today":`this ${o[e][0]}`}}const n=Object.is(t,-0)||t<0,s=Math.abs(t),l=1===s,d=o[e],c=r?l?d[1]:d[2]||d[1]:l?o[e][0]:e;return n?`${s} ${c} ago`:`in ${s} ${c}`}(t,e,this.opts.numeric,"long"!==this.opts.style)}formatToParts(e,t){return this.rtf?this.rtf.formatToParts(e,t):[]}}const Oa={firstDay:1,minimalDays:4,weekend:[6,7]};class La{static fromOpts(e){return La.create(e.locale,e.numberingSystem,e.outputCalendar,e.weekSettings,e.defaultToEN)}static create(e,t,i,r,o=!1){const a=e||Ka.defaultLocale,n=a||(o?"en-US":$a||($a=(new Intl.DateTimeFormat).resolvedOptions().locale,$a)),s=t||Ka.defaultNumberingSystem,l=i||Ka.defaultOutputCalendar,d=wn(r)||Ka.defaultWeekSettings;return new La(n,s,l,d,a)}static resetCache(){$a=null,xa.clear(),_a.clear(),ka.clear(),Ca.clear(),Da.clear()}static fromObject({locale:e,numberingSystem:t,outputCalendar:i,weekSettings:r}={}){return La.create(e,t,i,r)}constructor(e,t,i,r,o){const[a,n,s]=function(e){const t=e.indexOf("-x-");-1!==t&&(e=e.substring(0,t));const i=e.indexOf("-u-");if(-1===i)return[e];{let t,r;try{t=wa(e).resolvedOptions(),r=e}catch(o){const a=e.substring(0,i);t=wa(a).resolvedOptions(),r=a}const{numberingSystem:o,calendar:a}=t;return[r,o,a]}}(e);this.locale=a,this.numberingSystem=t||n||null,this.outputCalendar=i||s||null,this.weekSettings=r,this.intl=function(e,t,i){return i||t?(e.includes("-u-")||(e+="-u"),i&&(e+=`-ca-${i}`),t&&(e+=`-nu-${t}`),e):e}(this.locale,this.numberingSystem,this.outputCalendar),this.weekdaysCache={format:{},standalone:{}},this.monthsCache={format:{},standalone:{}},this.meridiemCache=null,this.eraCache={},this.specifiedLocale=o,this.fastNumbersCached=null}get fastNumbers(){var e;return null==this.fastNumbersCached&&(this.fastNumbersCached=(!(e=this).numberingSystem||"latn"===e.numberingSystem)&&("latn"===e.numberingSystem||!e.locale||e.locale.startsWith("en")||"latn"===Sa(e.locale).numberingSystem)),this.fastNumbersCached}listingMode(){const e=this.isEnglish(),t=!(null!==this.numberingSystem&&"latn"!==this.numberingSystem||null!==this.outputCalendar&&"gregory"!==this.outputCalendar);return e&&t?"en":"intl"}clone(e){return e&&0!==Object.getOwnPropertyNames(e).length?La.create(e.locale||this.specifiedLocale,e.numberingSystem||this.numberingSystem,e.outputCalendar||this.outputCalendar,wn(e.weekSettings)||this.weekSettings,e.defaultToEN||!1):this}redefaultToEN(e={}){return this.clone({...e,defaultToEN:!0})}redefaultToSystem(e={}){return this.clone({...e,defaultToEN:!1})}months(e,t=!1){return Ea(this,e,Bn,()=>{const i="ja"===this.intl||this.intl.startsWith("ja-"),r=(t&=!i)?{month:e,day:"numeric"}:{month:e},o=t?"format":"standalone";if(!this.monthsCache[o][e]){const t=i?e=>this.dtFormatter(e,r).format():e=>this.extract(e,r,"month");this.monthsCache[o][e]=function(e){const t=[];for(let i=1;i<=12;i++){const r=Yl.utc(2009,i,1);t.push(e(r))}return t}(t)}return this.monthsCache[o][e]})}weekdays(e,t=!1){return Ea(this,e,Zn,()=>{const i=t?{weekday:e,year:"numeric",month:"long",day:"numeric"}:{weekday:e},r=t?"format":"standalone";return this.weekdaysCache[r][e]||(this.weekdaysCache[r][e]=function(e){const t=[];for(let i=1;i<=7;i++){const r=Yl.utc(2016,11,13+i);t.push(e(r))}return t}(e=>this.extract(e,i,"weekday"))),this.weekdaysCache[r][e]})}meridiems(){return Ea(this,void 0,()=>Yn,()=>{if(!this.meridiemCache){const e={hour:"numeric",hourCycle:"h12"};this.meridiemCache=[Yl.utc(2016,11,13,9),Yl.utc(2016,11,13,19)].map(t=>this.extract(t,e,"dayperiod"))}return this.meridiemCache})}eras(e){return Ea(this,e,Xn,()=>{const t={era:e};return this.eraCache[e]||(this.eraCache[e]=[Yl.utc(-40,1,1),Yl.utc(2017,1,1)].map(e=>this.extract(e,t,"era"))),this.eraCache[e]})}extract(e,t,i){const r=this.dtFormatter(e,t).formatToParts().find(e=>e.type.toLowerCase()===i);return r?r.value:null}numberFormatter(e={}){return new Ta(this.intl,e.forceSimple||this.fastNumbers,e)}dtFormatter(e,t={}){return new Aa(e,this.intl,t)}relFormatter(e={}){return new Ia(this.intl,this.isEnglish(),e)}listFormatter(e={}){return function(e,t={}){const i=JSON.stringify([e,t]);let r=ba[i];return r||(r=new Intl.ListFormat(e,t),ba[i]=r),r}(this.intl,e)}isEnglish(){return"en"===this.locale||"en-us"===this.locale.toLowerCase()||Sa(this.intl).locale.startsWith("en-us")}getWeekSettings(){return this.weekSettings?this.weekSettings:yn()?function(e){let t=Da.get(e);if(!t){const i=new Intl.Locale(e);t="getWeekInfo"in i?i.getWeekInfo():i.weekInfo,"minimalDays"in t||(t={...Oa,...t}),Da.set(e,t)}return t}(this.locale):Oa}getStartOfWeek(){return this.getWeekSettings().firstDay}getMinDaysInFirstWeek(){return this.getWeekSettings().minimalDays}getWeekendDays(){return this.getWeekSettings().weekend}equals(e){return this.locale===e.locale&&this.numberingSystem===e.numberingSystem&&this.outputCalendar===e.outputCalendar}toString(){return`Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`}}let za=null;class Ma extends pa{static get utcInstance(){return null===za&&(za=new Ma(0)),za}static instance(e){return 0===e?Ma.utcInstance:new Ma(e)}static parseSpecifier(e){if(e){const t=e.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);if(t)return new Ma(Rn(t[1],t[2]))}return null}constructor(e){super(),this.fixed=e}get type(){return"fixed"}get name(){return 0===this.fixed?"UTC":`UTC${Vn(this.fixed,"narrow")}`}get ianaName(){return 0===this.fixed?"Etc/UTC":`Etc/GMT${Vn(-this.fixed,"narrow")}`}offsetName(){return this.name}formatOffset(e,t){return Vn(this.fixed,t)}get isUniversal(){return!0}offset(){return this.fixed}equals(e){return"fixed"===e.type&&e.fixed===this.fixed}get isValid(){return!0}}class Ra extends pa{constructor(e){super(),this.zoneName=e}get type(){return"invalid"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(){return null}formatOffset(){return""}offset(){return NaN}equals(){return!1}get isValid(){return!1}}function Pa(e,t){if(mn(e)||null===e)return t;if(e instanceof pa)return e;if(function(e){return"string"==typeof e}(e)){const i=e.toLowerCase();return"default"===i?t:"local"===i||"system"===i?ma.instance:"utc"===i||"gmt"===i?Ma.utcInstance:Ma.parseSpecifier(i)||ya.create(e)}return fn(e)?Ma.instance(e):"object"==typeof e&&"offset"in e&&"function"==typeof e.offset?e:new Ra(e)}const Na={arab:"[٠-٩]",arabext:"[۰-۹]",bali:"[᭐-᭙]",beng:"[০-৯]",deva:"[०-९]",fullwide:"[０-９]",gujr:"[૦-૯]",hanidec:"[〇|一|二|三|四|五|六|七|八|九]",khmr:"[០-៩]",knda:"[೦-೯]",laoo:"[໐-໙]",limb:"[᥆-᥏]",mlym:"[൦-൯]",mong:"[᠐-᠙]",mymr:"[၀-၉]",orya:"[୦-୯]",tamldec:"[௦-௯]",telu:"[౦-౯]",thai:"[๐-๙]",tibt:"[༠-༩]",latn:"\\d"},Va={arab:[1632,1641],arabext:[1776,1785],bali:[6992,7001],beng:[2534,2543],deva:[2406,2415],fullwide:[65296,65303],gujr:[2790,2799],khmr:[6112,6121],knda:[3302,3311],laoo:[3792,3801],limb:[6470,6479],mlym:[3430,3439],mong:[6160,6169],mymr:[4160,4169],orya:[2918,2927],tamldec:[3046,3055],telu:[3174,3183],thai:[3664,3673],tibt:[3872,3881]},Fa=Na.hanidec.replace(/[\[|\]]/g,"").split("");const Ha=new Map;function Ua({numberingSystem:e},t=""){const i=e||"latn";let r=Ha.get(i);void 0===r&&(r=new Map,Ha.set(i,r));let o=r.get(t);return void 0===o&&(o=new RegExp(`${Na[i]}${t}`),r.set(t,o)),o}let qa,Ba=()=>Date.now(),Ga="system",ja=null,Wa=null,Za=null,Ya=60,Ja=null;class Ka{static get now(){return Ba}static set now(e){Ba=e}static set defaultZone(e){Ga=e}static get defaultZone(){return Pa(Ga,ma.instance)}static get defaultLocale(){return ja}static set defaultLocale(e){ja=e}static get defaultNumberingSystem(){return Wa}static set defaultNumberingSystem(e){Wa=e}static get defaultOutputCalendar(){return Za}static set defaultOutputCalendar(e){Za=e}static get defaultWeekSettings(){return Ja}static set defaultWeekSettings(e){Ja=wn(e)}static get twoDigitCutoffYear(){return Ya}static set twoDigitCutoffYear(e){Ya=e%100}static get throwOnInvalid(){return qa}static set throwOnInvalid(e){qa=e}static resetCaches(){La.resetCache(),ya.resetCache(),Yl.resetCache(),Ha.clear()}}class Qa{constructor(e,t){this.reason=e,this.explanation=t}toMessage(){return this.explanation?`${this.reason}: ${this.explanation}`:this.reason}}const Xa=[0,31,59,90,120,151,181,212,243,273,304,334],en=[0,31,60,91,121,152,182,213,244,274,305,335];function tn(e,t){return new Qa("unit out of range",`you specified ${t} (of type ${typeof t}) as a ${e}, which is invalid`)}function rn(e,t,i){const r=new Date(Date.UTC(e,t-1,i));e<100&&e>=0&&r.setUTCFullYear(r.getUTCFullYear()-1900);const o=r.getUTCDay();return 0===o?7:o}function on(e,t,i){return i+(En(e)?en:Xa)[t-1]}function an(e,t){const i=En(e)?en:Xa,r=i.findIndex(e=>e<t);return{month:r+1,day:t-i[r]}}function nn(e,t){return(e-t+7)%7+1}function sn(e,t=4,i=1){const{year:r,month:o,day:a}=e,n=on(r,o,a),s=nn(rn(r,o,a),i);let l,d=Math.floor((n-s+14-t)/7);return d<1?(l=r-1,d=Ln(l,t,i)):d>Ln(r,t,i)?(l=r+1,d=1):l=r,{weekYear:l,weekNumber:d,weekday:s,...Fn(e)}}function ln(e,t=4,i=1){const{weekYear:r,weekNumber:o,weekday:a}=e,n=nn(rn(r,1,t),i),s=Tn(r);let l,d=7*o+a-n-7+t;d<1?(l=r-1,d+=Tn(l)):d>s?(l=r+1,d-=Tn(r)):l=r;const{month:c,day:h}=an(l,d);return{year:l,month:c,day:h,...Fn(e)}}function dn(e){const{year:t,month:i,day:r}=e;return{year:t,ordinal:on(t,i,r),...Fn(e)}}function cn(e){const{year:t,ordinal:i}=e,{month:r,day:o}=an(t,i);return{year:t,month:r,day:o,...Fn(e)}}function hn(e,t){if(!mn(e.localWeekday)||!mn(e.localWeekNumber)||!mn(e.localWeekYear)){if(!mn(e.weekday)||!mn(e.weekNumber)||!mn(e.weekYear))throw new Po("Cannot mix locale-based week fields with ISO-based week fields");return mn(e.localWeekday)||(e.weekday=e.localWeekday),mn(e.localWeekNumber)||(e.weekNumber=e.localWeekNumber),mn(e.localWeekYear)||(e.weekYear=e.localWeekYear),delete e.localWeekday,delete e.localWeekNumber,delete e.localWeekYear,{minDaysInFirstWeek:t.getMinDaysInFirstWeek(),startOfWeek:t.getStartOfWeek()}}return{minDaysInFirstWeek:4,startOfWeek:1}}function pn(e){const t=vn(e.year),i=_n(e.month,1,12),r=_n(e.day,1,An(e.year,e.month));return t?i?!r&&tn("day",e.day):tn("month",e.month):tn("year",e.year)}function un(e){const{hour:t,minute:i,second:r,millisecond:o}=e,a=_n(t,0,23)||24===t&&0===i&&0===r&&0===o,n=_n(i,0,59),s=_n(r,0,59),l=_n(o,0,999);return a?n?s?!l&&tn("millisecond",o):tn("second",r):tn("minute",i):tn("hour",t)}function mn(e){return void 0===e}function fn(e){return"number"==typeof e}function vn(e){return"number"==typeof e&&e%1==0}function gn(){try{return"undefined"!=typeof Intl&&!!Intl.RelativeTimeFormat}catch(e){return!1}}function yn(){try{return"undefined"!=typeof Intl&&!!Intl.Locale&&("weekInfo"in Intl.Locale.prototype||"getWeekInfo"in Intl.Locale.prototype)}catch(e){return!1}}function bn(e,t,i){if(0!==e.length)return e.reduce((e,r)=>{const o=[t(r),r];return e&&i(e[0],o[0])===e[0]?e:o},null)[1]}function xn(e,t){return Object.prototype.hasOwnProperty.call(e,t)}function wn(e){if(null==e)return null;if("object"!=typeof e)throw new Vo("Week settings must be an object");if(!_n(e.firstDay,1,7)||!_n(e.minimalDays,1,7)||!Array.isArray(e.weekend)||e.weekend.some(e=>!_n(e,1,7)))throw new Vo("Invalid week settings");return{firstDay:e.firstDay,minimalDays:e.minimalDays,weekend:Array.from(e.weekend)}}function _n(e,t,i){return vn(e)&&e>=t&&e<=i}function kn(e,t=2){let i;return i=e<0?"-"+(""+-e).padStart(t,"0"):(""+e).padStart(t,"0"),i}function $n(e){return mn(e)||null===e||""===e?void 0:parseInt(e,10)}function Cn(e){return mn(e)||null===e||""===e?void 0:parseFloat(e)}function Sn(e){if(!mn(e)&&null!==e&&""!==e){const t=1e3*parseFloat("0."+e);return Math.floor(t)}}function Dn(e,t,i="round"){const r=10**t;switch(i){case"expand":return e>0?Math.ceil(e*r)/r:Math.floor(e*r)/r;case"trunc":return Math.trunc(e*r)/r;case"round":return Math.round(e*r)/r;case"floor":return Math.floor(e*r)/r;case"ceil":return Math.ceil(e*r)/r;default:throw new RangeError(`Value rounding ${i} is out of range`)}}function En(e){return e%4==0&&(e%100!=0||e%400==0)}function Tn(e){return En(e)?366:365}function An(e,t){const i=function(e,t){return e-t*Math.floor(e/t)}(t-1,12)+1;return 2===i?En(e+(t-i)/12)?29:28:[31,null,31,30,31,30,31,31,30,31,30,31][i-1]}function In(e){let t=Date.UTC(e.year,e.month-1,e.day,e.hour,e.minute,e.second,e.millisecond);return e.year<100&&e.year>=0&&(t=new Date(t),t.setUTCFullYear(e.year,e.month-1,e.day)),+t}function On(e,t,i){return-nn(rn(e,1,t),i)+t-1}function Ln(e,t=4,i=1){const r=On(e,t,i),o=On(e+1,t,i);return(Tn(e)-r+o)/7}function zn(e){return e>99?e:e>Ka.twoDigitCutoffYear?1900+e:2e3+e}function Mn(e,t,i,r=null){const o=new Date(e),a={hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"};r&&(a.timeZone=r);const n={timeZoneName:t,...a},s=new Intl.DateTimeFormat(i,n).formatToParts(o).find(e=>"timezonename"===e.type.toLowerCase());return s?s.value:null}function Rn(e,t){let i=parseInt(e,10);Number.isNaN(i)&&(i=0);const r=parseInt(t,10)||0;return 60*i+(i<0||Object.is(i,-0)?-r:r)}function Pn(e){const t=Number(e);if("boolean"==typeof e||""===e||!Number.isFinite(t))throw new Vo(`Invalid unit value ${e}`);return t}function Nn(e,t){const i={};for(const r in e)if(xn(e,r)){const o=e[r];if(null==o)continue;i[t(r)]=Pn(o)}return i}function Vn(e,t){const i=Math.trunc(Math.abs(e/60)),r=Math.trunc(Math.abs(e%60)),o=e>=0?"+":"-";switch(t){case"short":return`${o}${kn(i,2)}:${kn(r,2)}`;case"narrow":return`${o}${i}${r>0?`:${r}`:""}`;case"techie":return`${o}${kn(i,2)}${kn(r,2)}`;default:throw new RangeError(`Value format ${t} is out of range for property format`)}}function Fn(e){return function(e,t){return t.reduce((t,i)=>(t[i]=e[i],t),{})}(e,["hour","minute","second","millisecond"])}const Hn=["January","February","March","April","May","June","July","August","September","October","November","December"],Un=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],qn=["J","F","M","A","M","J","J","A","S","O","N","D"];function Bn(e){switch(e){case"narrow":return[...qn];case"short":return[...Un];case"long":return[...Hn];case"numeric":return["1","2","3","4","5","6","7","8","9","10","11","12"];case"2-digit":return["01","02","03","04","05","06","07","08","09","10","11","12"];default:return null}}const Gn=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],jn=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],Wn=["M","T","W","T","F","S","S"];function Zn(e){switch(e){case"narrow":return[...Wn];case"short":return[...jn];case"long":return[...Gn];case"numeric":return["1","2","3","4","5","6","7"];default:return null}}const Yn=["AM","PM"],Jn=["Before Christ","Anno Domini"],Kn=["BC","AD"],Qn=["B","A"];function Xn(e){switch(e){case"narrow":return[...Qn];case"short":return[...Kn];case"long":return[...Jn];default:return null}}function es(e,t){let i="";for(const r of e)r.literal?i+=r.val:i+=t(r.val);return i}const ts={D:Bo,DD:Go,DDD:Wo,DDDD:Zo,t:Yo,tt:Jo,ttt:Ko,tttt:Qo,T:Xo,TT:ea,TTT:ta,TTTT:ia,f:ra,ff:aa,fff:la,ffff:ca,F:oa,FF:na,FFF:da,FFFF:ha};class is{static create(e,t={}){return new is(e,t)}static parseFormat(e){let t=null,i="",r=!1;const o=[];for(let a=0;a<e.length;a++){const n=e.charAt(a);"'"===n?((i.length>0||r)&&o.push({literal:r||/^\s+$/.test(i),val:""===i?"'":i}),t=null,i="",r=!r):r||n===t?i+=n:(i.length>0&&o.push({literal:/^\s+$/.test(i),val:i}),i=n,t=n)}return i.length>0&&o.push({literal:r||/^\s+$/.test(i),val:i}),o}static macroTokenToFormatOpts(e){return ts[e]}constructor(e,t){this.opts=t,this.loc=e,this.systemLoc=null}formatWithSystemDefault(e,t){null===this.systemLoc&&(this.systemLoc=this.loc.redefaultToSystem());return this.systemLoc.dtFormatter(e,{...this.opts,...t}).format()}dtFormatter(e,t={}){return this.loc.dtFormatter(e,{...this.opts,...t})}formatDateTime(e,t){return this.dtFormatter(e,t).format()}formatDateTimeParts(e,t){return this.dtFormatter(e,t).formatToParts()}formatInterval(e,t){return this.dtFormatter(e.start,t).dtf.formatRange(e.start.toJSDate(),e.end.toJSDate())}resolvedOptions(e,t){return this.dtFormatter(e,t).resolvedOptions()}num(e,t=0,i=void 0){if(this.opts.forceSimple)return kn(e,t);const r={...this.opts};return t>0&&(r.padTo=t),i&&(r.signDisplay=i),this.loc.numberFormatter(r).format(e)}formatDateTimeFromString(e,t){const i="en"===this.loc.listingMode(),r=this.loc.outputCalendar&&"gregory"!==this.loc.outputCalendar,o=(t,i)=>this.loc.extract(e,t,i),a=t=>e.isOffsetFixed&&0===e.offset&&t.allowZ?"Z":e.isValid?e.zone.formatOffset(e.ts,t.format):"",n=()=>i?function(e){return Yn[e.hour<12?0:1]}(e):o({hour:"numeric",hourCycle:"h12"},"dayperiod"),s=(t,r)=>i?function(e,t){return Bn(t)[e.month-1]}(e,t):o(r?{month:t}:{month:t,day:"numeric"},"month"),l=(t,r)=>i?function(e,t){return Zn(t)[e.weekday-1]}(e,t):o(r?{weekday:t}:{weekday:t,month:"long",day:"numeric"},"weekday"),d=t=>{const i=is.macroTokenToFormatOpts(t);return i?this.formatWithSystemDefault(e,i):t},c=t=>i?function(e,t){return Xn(t)[e.year<0?0:1]}(e,t):o({era:t},"era");return es(is.parseFormat(t),t=>{switch(t){case"S":return this.num(e.millisecond);case"u":case"SSS":return this.num(e.millisecond,3);case"s":return this.num(e.second);case"ss":return this.num(e.second,2);case"uu":return this.num(Math.floor(e.millisecond/10),2);case"uuu":return this.num(Math.floor(e.millisecond/100));case"m":return this.num(e.minute);case"mm":return this.num(e.minute,2);case"h":return this.num(e.hour%12==0?12:e.hour%12);case"hh":return this.num(e.hour%12==0?12:e.hour%12,2);case"H":return this.num(e.hour);case"HH":return this.num(e.hour,2);case"Z":return a({format:"narrow",allowZ:this.opts.allowZ});case"ZZ":return a({format:"short",allowZ:this.opts.allowZ});case"ZZZ":return a({format:"techie",allowZ:this.opts.allowZ});case"ZZZZ":return e.zone.offsetName(e.ts,{format:"short",locale:this.loc.locale});case"ZZZZZ":return e.zone.offsetName(e.ts,{format:"long",locale:this.loc.locale});case"z":return e.zoneName;case"a":return n();case"d":return r?o({day:"numeric"},"day"):this.num(e.day);case"dd":return r?o({day:"2-digit"},"day"):this.num(e.day,2);case"c":case"E":return this.num(e.weekday);case"ccc":return l("short",!0);case"cccc":return l("long",!0);case"ccccc":return l("narrow",!0);case"EEE":return l("short",!1);case"EEEE":return l("long",!1);case"EEEEE":return l("narrow",!1);case"L":return r?o({month:"numeric",day:"numeric"},"month"):this.num(e.month);case"LL":return r?o({month:"2-digit",day:"numeric"},"month"):this.num(e.month,2);case"LLL":return s("short",!0);case"LLLL":return s("long",!0);case"LLLLL":return s("narrow",!0);case"M":return r?o({month:"numeric"},"month"):this.num(e.month);case"MM":return r?o({month:"2-digit"},"month"):this.num(e.month,2);case"MMM":return s("short",!1);case"MMMM":return s("long",!1);case"MMMMM":return s("narrow",!1);case"y":return r?o({year:"numeric"},"year"):this.num(e.year);case"yy":return r?o({year:"2-digit"},"year"):this.num(e.year.toString().slice(-2),2);case"yyyy":return r?o({year:"numeric"},"year"):this.num(e.year,4);case"yyyyyy":return r?o({year:"numeric"},"year"):this.num(e.year,6);case"G":return c("short");case"GG":return c("long");case"GGGGG":return c("narrow");case"kk":return this.num(e.weekYear.toString().slice(-2),2);case"kkkk":return this.num(e.weekYear,4);case"W":return this.num(e.weekNumber);case"WW":return this.num(e.weekNumber,2);case"n":return this.num(e.localWeekNumber);case"nn":return this.num(e.localWeekNumber,2);case"ii":return this.num(e.localWeekYear.toString().slice(-2),2);case"iiii":return this.num(e.localWeekYear,4);case"o":return this.num(e.ordinal);case"ooo":return this.num(e.ordinal,3);case"q":return this.num(e.quarter);case"qq":return this.num(e.quarter,2);case"X":return this.num(Math.floor(e.ts/1e3));case"x":return this.num(e.ts);default:return d(t)}})}formatDurationFromString(e,t){const i="negativeLargestOnly"===this.opts.signMode?-1:1,r=e=>{switch(e[0]){case"S":return"milliseconds";case"s":return"seconds";case"m":return"minutes";case"h":return"hours";case"d":return"days";case"w":return"weeks";case"M":return"months";case"y":return"years";default:return null}},o=is.parseFormat(t),a=o.reduce((e,{literal:t,val:i})=>t?e:e.concat(i),[]),n=e.shiftTo(...a.map(r).filter(e=>e));return es(o,((e,t)=>o=>{const a=r(o);if(a){const r=t.isNegativeDuration&&a!==t.largestUnit?i:1;let n;return n="negativeLargestOnly"===this.opts.signMode&&a!==t.largestUnit?"never":"all"===this.opts.signMode?"always":"auto",this.num(e.get(a)*r,o.length,n)}return o})(n,{isNegativeDuration:n<0,largestUnit:Object.keys(n.values)[0]}))}}const rs=/[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;function os(...e){const t=e.reduce((e,t)=>e+t.source,"");return RegExp(`^${t}$`)}function as(...e){return t=>e.reduce(([e,i,r],o)=>{const[a,n,s]=o(t,r);return[{...e,...a},n||i,s]},[{},null,1]).slice(0,2)}function ns(e,...t){if(null==e)return[null,null];for(const[i,r]of t){const t=i.exec(e);if(t)return r(t)}return[null,null]}function ss(...e){return(t,i)=>{const r={};let o;for(o=0;o<e.length;o++)r[e[o]]=$n(t[i+o]);return[r,null,i+o]}}const ls=/(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/,ds=/(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/,cs=RegExp(`${ds.source}${`(?:${ls.source}?(?:\\[(${rs.source})\\])?)?`}`),hs=RegExp(`(?:[Tt]${cs.source})?`),ps=ss("weekYear","weekNumber","weekDay"),us=ss("year","ordinal"),ms=RegExp(`${ds.source} ?(?:${ls.source}|(${rs.source}))?`),fs=RegExp(`(?: ${ms.source})?`);function vs(e,t,i){const r=e[t];return mn(r)?i:$n(r)}function gs(e,t){return[{hours:vs(e,t,0),minutes:vs(e,t+1,0),seconds:vs(e,t+2,0),milliseconds:Sn(e[t+3])},null,t+4]}function ys(e,t){const i=!e[t]&&!e[t+1],r=Rn(e[t+1],e[t+2]);return[{},i?null:Ma.instance(r),t+3]}function bs(e,t){return[{},e[t]?ya.create(e[t]):null,t+1]}const xs=RegExp(`^T?${ds.source}$`),ws=/^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;function _s(e){const[t,i,r,o,a,n,s,l,d]=e,c="-"===t[0],h=l&&"-"===l[0],p=(e,t=!1)=>void 0!==e&&(t||e&&c)?-e:e;return[{years:p(Cn(i)),months:p(Cn(r)),weeks:p(Cn(o)),days:p(Cn(a)),hours:p(Cn(n)),minutes:p(Cn(s)),seconds:p(Cn(l),"-0"===l),milliseconds:p(Sn(d),h)}]}const ks={GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function $s(e,t,i,r,o,a,n){const s={year:2===t.length?zn($n(t)):$n(t),month:Un.indexOf(i)+1,day:$n(r),hour:$n(o),minute:$n(a)};return n&&(s.second=$n(n)),e&&(s.weekday=e.length>3?Gn.indexOf(e)+1:jn.indexOf(e)+1),s}const Cs=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;function Ss(e){const[,t,i,r,o,a,n,s,l,d,c,h]=e,p=$s(t,o,r,i,a,n,s);let u;return u=l?ks[l]:d?0:Rn(c,h),[p,new Ma(u)]}const Ds=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,Es=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,Ts=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;function As(e){const[,t,i,r,o,a,n,s]=e;return[$s(t,o,r,i,a,n,s),Ma.utcInstance]}function Is(e){const[,t,i,r,o,a,n,s]=e;return[$s(t,s,i,r,o,a,n),Ma.utcInstance]}const Os=os(/([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,hs),Ls=os(/(\d{4})-?W(\d\d)(?:-?(\d))?/,hs),zs=os(/(\d{4})-?(\d{3})/,hs),Ms=os(cs),Rs=as(function(e,t){return[{year:vs(e,t),month:vs(e,t+1,1),day:vs(e,t+2,1)},null,t+3]},gs,ys,bs),Ps=as(ps,gs,ys,bs),Ns=as(us,gs,ys,bs),Vs=as(gs,ys,bs);const Fs=as(gs);const Hs=os(/(\d{4})-(\d\d)-(\d\d)/,fs),Us=os(ms),qs=as(gs,ys,bs);const Bs="Invalid Duration",Gs={weeks:{days:7,hours:168,minutes:10080,seconds:604800,milliseconds:6048e5},days:{hours:24,minutes:1440,seconds:86400,milliseconds:864e5},hours:{minutes:60,seconds:3600,milliseconds:36e5},minutes:{seconds:60,milliseconds:6e4},seconds:{milliseconds:1e3}},js={years:{quarters:4,months:12,weeks:52,days:365,hours:8760,minutes:525600,seconds:31536e3,milliseconds:31536e6},quarters:{months:3,weeks:13,days:91,hours:2184,minutes:131040,seconds:7862400,milliseconds:78624e5},months:{weeks:4,days:30,hours:720,minutes:43200,seconds:2592e3,milliseconds:2592e6},...Gs},Ws=365.2425,Zs=30.436875,Ys={years:{quarters:4,months:12,weeks:52.1775,days:Ws,hours:8765.82,minutes:525949.2,seconds:525949.2*60,milliseconds:525949.2*60*1e3},quarters:{months:3,weeks:13.044375,days:91.310625,hours:2191.455,minutes:131487.3,seconds:525949.2*60/4,milliseconds:7889237999.999999},months:{weeks:4.3481250000000005,days:Zs,hours:730.485,minutes:43829.1,seconds:2629746,milliseconds:2629746e3},...Gs},Js=["years","quarters","months","weeks","days","hours","minutes","seconds","milliseconds"],Ks=Js.slice(0).reverse();function Qs(e,t,i=!1){const r={values:i?t.values:{...e.values,...t.values||{}},loc:e.loc.clone(t.loc),conversionAccuracy:t.conversionAccuracy||e.conversionAccuracy,matrix:t.matrix||e.matrix};return new il(r)}function Xs(e,t){let i=t.milliseconds??0;for(const r of Ks.slice(1))t[r]&&(i+=t[r]*e[r].milliseconds);return i}function el(e,t){const i=Xs(e,t)<0?-1:1;Js.reduceRight((r,o)=>{if(mn(t[o]))return r;if(r){const a=t[r]*i,n=e[o][r],s=Math.floor(a/n);t[o]+=s*i,t[r]-=s*n*i}return o},null),Js.reduce((i,r)=>{if(mn(t[r]))return i;if(i){const o=t[i]%1;t[i]-=o,t[r]+=o*e[i][r]}return r},null)}function tl(e){const t={};for(const[i,r]of Object.entries(e))0!==r&&(t[i]=r);return t}class il{constructor(e){const t="longterm"===e.conversionAccuracy||!1;let i=t?Ys:js;e.matrix&&(i=e.matrix),this.values=e.values,this.loc=e.loc||La.create(),this.conversionAccuracy=t?"longterm":"casual",this.invalid=e.invalid||null,this.matrix=i,this.isLuxonDuration=!0}static fromMillis(e,t){return il.fromObject({milliseconds:e},t)}static fromObject(e,t={}){if(null==e||"object"!=typeof e)throw new Vo("Duration.fromObject: argument expected to be an object, got "+(null===e?"null":typeof e));return new il({values:Nn(e,il.normalizeUnit),loc:La.fromObject(t),conversionAccuracy:t.conversionAccuracy,matrix:t.matrix})}static fromDurationLike(e){if(fn(e))return il.fromMillis(e);if(il.isDuration(e))return e;if("object"==typeof e)return il.fromObject(e);throw new Vo(`Unknown duration argument ${e} of type ${typeof e}`)}static fromISO(e,t){const[i]=function(e){return ns(e,[ws,_s])}(e);return i?il.fromObject(i,t):il.invalid("unparsable",`the input "${e}" can't be parsed as ISO 8601`)}static fromISOTime(e,t){const[i]=function(e){return ns(e,[xs,Fs])}(e);return i?il.fromObject(i,t):il.invalid("unparsable",`the input "${e}" can't be parsed as ISO 8601`)}static invalid(e,t=null){if(!e)throw new Vo("need to specify a reason the Duration is invalid");const i=e instanceof Qa?e:new Qa(e,t);if(Ka.throwOnInvalid)throw new Ro(i);return new il({invalid:i})}static normalizeUnit(e){const t={year:"years",years:"years",quarter:"quarters",quarters:"quarters",month:"months",months:"months",week:"weeks",weeks:"weeks",day:"days",days:"days",hour:"hours",hours:"hours",minute:"minutes",minutes:"minutes",second:"seconds",seconds:"seconds",millisecond:"milliseconds",milliseconds:"milliseconds"}[e?e.toLowerCase():e];if(!t)throw new No(e);return t}static isDuration(e){return e&&e.isLuxonDuration||!1}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}toFormat(e,t={}){const i={...t,floor:!1!==t.round&&!1!==t.floor};return this.isValid?is.create(this.loc,i).formatDurationFromString(this,e):Bs}toHuman(e={}){if(!this.isValid)return Bs;const t=!1!==e.showZeros,i=Js.map(i=>{const r=this.values[i];return mn(r)||0===r&&!t?null:this.loc.numberFormatter({style:"unit",unitDisplay:"long",...e,unit:i.slice(0,-1)}).format(r)}).filter(e=>e);return this.loc.listFormatter({type:"conjunction",style:e.listStyle||"narrow",...e}).format(i)}toObject(){return this.isValid?{...this.values}:{}}toISO(){if(!this.isValid)return null;let e="P";return 0!==this.years&&(e+=this.years+"Y"),0===this.months&&0===this.quarters||(e+=this.months+3*this.quarters+"M"),0!==this.weeks&&(e+=this.weeks+"W"),0!==this.days&&(e+=this.days+"D"),0===this.hours&&0===this.minutes&&0===this.seconds&&0===this.milliseconds||(e+="T"),0!==this.hours&&(e+=this.hours+"H"),0!==this.minutes&&(e+=this.minutes+"M"),0===this.seconds&&0===this.milliseconds||(e+=Dn(this.seconds+this.milliseconds/1e3,3)+"S"),"P"===e&&(e+="T0S"),e}toISOTime(e={}){if(!this.isValid)return null;const t=this.toMillis();if(t<0||t>=864e5)return null;e={suppressMilliseconds:!1,suppressSeconds:!1,includePrefix:!1,format:"extended",...e,includeOffset:!1};return Yl.fromMillis(t,{zone:"UTC"}).toISOTime(e)}toJSON(){return this.toISO()}toString(){return this.toISO()}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Duration { values: ${JSON.stringify(this.values)} }`:`Duration { Invalid, reason: ${this.invalidReason} }`}toMillis(){return this.isValid?Xs(this.matrix,this.values):NaN}valueOf(){return this.toMillis()}plus(e){if(!this.isValid)return this;const t=il.fromDurationLike(e),i={};for(const e of Js)(xn(t.values,e)||xn(this.values,e))&&(i[e]=t.get(e)+this.get(e));return Qs(this,{values:i},!0)}minus(e){if(!this.isValid)return this;const t=il.fromDurationLike(e);return this.plus(t.negate())}mapUnits(e){if(!this.isValid)return this;const t={};for(const i of Object.keys(this.values))t[i]=Pn(e(this.values[i],i));return Qs(this,{values:t},!0)}get(e){return this[il.normalizeUnit(e)]}set(e){if(!this.isValid)return this;return Qs(this,{values:{...this.values,...Nn(e,il.normalizeUnit)}})}reconfigure({locale:e,numberingSystem:t,conversionAccuracy:i,matrix:r}={}){return Qs(this,{loc:this.loc.clone({locale:e,numberingSystem:t}),matrix:r,conversionAccuracy:i})}as(e){return this.isValid?this.shiftTo(e).get(e):NaN}normalize(){if(!this.isValid)return this;const e=this.toObject();return el(this.matrix,e),Qs(this,{values:e},!0)}rescale(){if(!this.isValid)return this;return Qs(this,{values:tl(this.normalize().shiftToAll().toObject())},!0)}shiftTo(...e){if(!this.isValid)return this;if(0===e.length)return this;e=e.map(e=>il.normalizeUnit(e));const t={},i={},r=this.toObject();let o;for(const a of Js)if(e.indexOf(a)>=0){o=a;let e=0;for(const t in i)e+=this.matrix[t][a]*i[t],i[t]=0;fn(r[a])&&(e+=r[a]);const n=Math.trunc(e);t[a]=n,i[a]=(1e3*e-1e3*n)/1e3}else fn(r[a])&&(i[a]=r[a]);for(const e in i)0!==i[e]&&(t[o]+=e===o?i[e]:i[e]/this.matrix[o][e]);return el(this.matrix,t),Qs(this,{values:t},!0)}shiftToAll(){return this.isValid?this.shiftTo("years","months","weeks","days","hours","minutes","seconds","milliseconds"):this}negate(){if(!this.isValid)return this;const e={};for(const t of Object.keys(this.values))e[t]=0===this.values[t]?0:-this.values[t];return Qs(this,{values:e},!0)}removeZeros(){if(!this.isValid)return this;return Qs(this,{values:tl(this.values)},!0)}get years(){return this.isValid?this.values.years||0:NaN}get quarters(){return this.isValid?this.values.quarters||0:NaN}get months(){return this.isValid?this.values.months||0:NaN}get weeks(){return this.isValid?this.values.weeks||0:NaN}get days(){return this.isValid?this.values.days||0:NaN}get hours(){return this.isValid?this.values.hours||0:NaN}get minutes(){return this.isValid?this.values.minutes||0:NaN}get seconds(){return this.isValid?this.values.seconds||0:NaN}get milliseconds(){return this.isValid?this.values.milliseconds||0:NaN}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}equals(e){if(!this.isValid||!e.isValid)return!1;if(!this.loc.equals(e.loc))return!1;function t(e,t){return void 0===e||0===e?void 0===t||0===t:e===t}for(const i of Js)if(!t(this.values[i],e.values[i]))return!1;return!0}}const rl="Invalid Interval";class ol{constructor(e){this.s=e.start,this.e=e.end,this.invalid=e.invalid||null,this.isLuxonInterval=!0}static invalid(e,t=null){if(!e)throw new Vo("need to specify a reason the Interval is invalid");const i=e instanceof Qa?e:new Qa(e,t);if(Ka.throwOnInvalid)throw new Mo(i);return new ol({invalid:i})}static fromDateTimes(e,t){const i=Jl(e),r=Jl(t),o=function(e,t){return e&&e.isValid?t&&t.isValid?t<e?ol.invalid("end before start",`The end of an interval must be after its start, but you had start=${e.toISO()} and end=${t.toISO()}`):null:ol.invalid("missing or invalid end"):ol.invalid("missing or invalid start")}(i,r);return null==o?new ol({start:i,end:r}):o}static after(e,t){const i=il.fromDurationLike(t),r=Jl(e);return ol.fromDateTimes(r,r.plus(i))}static before(e,t){const i=il.fromDurationLike(t),r=Jl(e);return ol.fromDateTimes(r.minus(i),r)}static fromISO(e,t){const[i,r]=(e||"").split("/",2);if(i&&r){let e,o,a,n;try{e=Yl.fromISO(i,t),o=e.isValid}catch(r){o=!1}try{a=Yl.fromISO(r,t),n=a.isValid}catch(r){n=!1}if(o&&n)return ol.fromDateTimes(e,a);if(o){const i=il.fromISO(r,t);if(i.isValid)return ol.after(e,i)}else if(n){const e=il.fromISO(i,t);if(e.isValid)return ol.before(a,e)}}return ol.invalid("unparsable",`the input "${e}" can't be parsed as ISO 8601`)}static isInterval(e){return e&&e.isLuxonInterval||!1}get start(){return this.isValid?this.s:null}get end(){return this.isValid?this.e:null}get lastDateTime(){return this.isValid&&this.e?this.e.minus(1):null}get isValid(){return null===this.invalidReason}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}length(e="milliseconds"){return this.isValid?this.toDuration(e).get(e):NaN}count(e="milliseconds",t){if(!this.isValid)return NaN;const i=this.start.startOf(e,t);let r;return r=t?.useLocaleWeeks?this.end.reconfigure({locale:i.locale}):this.end,r=r.startOf(e,t),Math.floor(r.diff(i,e).get(e))+(r.valueOf()!==this.end.valueOf())}hasSame(e){return!!this.isValid&&(this.isEmpty()||this.e.minus(1).hasSame(this.s,e))}isEmpty(){return this.s.valueOf()===this.e.valueOf()}isAfter(e){return!!this.isValid&&this.s>e}isBefore(e){return!!this.isValid&&this.e<=e}contains(e){return!!this.isValid&&(this.s<=e&&this.e>e)}set({start:e,end:t}={}){return this.isValid?ol.fromDateTimes(e||this.s,t||this.e):this}splitAt(...e){if(!this.isValid)return[];const t=e.map(Jl).filter(e=>this.contains(e)).sort((e,t)=>e.toMillis()-t.toMillis()),i=[];let{s:r}=this,o=0;for(;r<this.e;){const e=t[o]||this.e,a=+e>+this.e?this.e:e;i.push(ol.fromDateTimes(r,a)),r=a,o+=1}return i}splitBy(e){const t=il.fromDurationLike(e);if(!this.isValid||!t.isValid||0===t.as("milliseconds"))return[];let i,{s:r}=this,o=1;const a=[];for(;r<this.e;){const e=this.start.plus(t.mapUnits(e=>e*o));i=+e>+this.e?this.e:e,a.push(ol.fromDateTimes(r,i)),r=i,o+=1}return a}divideEqually(e){return this.isValid?this.splitBy(this.length()/e).slice(0,e):[]}overlaps(e){return this.e>e.s&&this.s<e.e}abutsStart(e){return!!this.isValid&&+this.e===+e.s}abutsEnd(e){return!!this.isValid&&+e.e===+this.s}engulfs(e){return!!this.isValid&&(this.s<=e.s&&this.e>=e.e)}equals(e){return!(!this.isValid||!e.isValid)&&(this.s.equals(e.s)&&this.e.equals(e.e))}intersection(e){if(!this.isValid)return this;const t=this.s>e.s?this.s:e.s,i=this.e<e.e?this.e:e.e;return t>=i?null:ol.fromDateTimes(t,i)}union(e){if(!this.isValid)return this;const t=this.s<e.s?this.s:e.s,i=this.e>e.e?this.e:e.e;return ol.fromDateTimes(t,i)}static merge(e){const[t,i]=e.sort((e,t)=>e.s-t.s).reduce(([e,t],i)=>t?t.overlaps(i)||t.abutsStart(i)?[e,t.union(i)]:[e.concat([t]),i]:[e,i],[[],null]);return i&&t.push(i),t}static xor(e){let t=null,i=0;const r=[],o=e.map(e=>[{time:e.s,type:"s"},{time:e.e,type:"e"}]),a=Array.prototype.concat(...o).sort((e,t)=>e.time-t.time);for(const e of a)i+="s"===e.type?1:-1,1===i?t=e.time:(t&&+t!==+e.time&&r.push(ol.fromDateTimes(t,e.time)),t=null);return ol.merge(r)}difference(...e){return ol.xor([this].concat(e)).map(e=>this.intersection(e)).filter(e=>e&&!e.isEmpty())}toString(){return this.isValid?`[${this.s.toISO()} – ${this.e.toISO()})`:rl}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`:`Interval { Invalid, reason: ${this.invalidReason} }`}toLocaleString(e=Bo,t={}){return this.isValid?is.create(this.s.loc.clone(t),e).formatInterval(this):rl}toISO(e){return this.isValid?`${this.s.toISO(e)}/${this.e.toISO(e)}`:rl}toISODate(){return this.isValid?`${this.s.toISODate()}/${this.e.toISODate()}`:rl}toISOTime(e){return this.isValid?`${this.s.toISOTime(e)}/${this.e.toISOTime(e)}`:rl}toFormat(e,{separator:t=" – "}={}){return this.isValid?`${this.s.toFormat(e)}${t}${this.e.toFormat(e)}`:rl}toDuration(e,t){return this.isValid?this.e.diff(this.s,e,t):il.invalid(this.invalidReason)}mapEndpoints(e){return ol.fromDateTimes(e(this.s),e(this.e))}}class al{static hasDST(e=Ka.defaultZone){const t=Yl.now().setZone(e).set({month:12});return!e.isUniversal&&t.offset!==t.set({month:6}).offset}static isValidIANAZone(e){return ya.isValidZone(e)}static normalizeZone(e){return Pa(e,Ka.defaultZone)}static getStartOfWeek({locale:e=null,locObj:t=null}={}){return(t||La.create(e)).getStartOfWeek()}static getMinimumDaysInFirstWeek({locale:e=null,locObj:t=null}={}){return(t||La.create(e)).getMinDaysInFirstWeek()}static getWeekendWeekdays({locale:e=null,locObj:t=null}={}){return(t||La.create(e)).getWeekendDays().slice()}static months(e="long",{locale:t=null,numberingSystem:i=null,locObj:r=null,outputCalendar:o="gregory"}={}){return(r||La.create(t,i,o)).months(e)}static monthsFormat(e="long",{locale:t=null,numberingSystem:i=null,locObj:r=null,outputCalendar:o="gregory"}={}){return(r||La.create(t,i,o)).months(e,!0)}static weekdays(e="long",{locale:t=null,numberingSystem:i=null,locObj:r=null}={}){return(r||La.create(t,i,null)).weekdays(e)}static weekdaysFormat(e="long",{locale:t=null,numberingSystem:i=null,locObj:r=null}={}){return(r||La.create(t,i,null)).weekdays(e,!0)}static meridiems({locale:e=null}={}){return La.create(e).meridiems()}static eras(e="short",{locale:t=null}={}){return La.create(t,null,"gregory").eras(e)}static features(){return{relative:gn(),localeWeek:yn()}}}function nl(e,t){const i=e=>e.toUTC(0,{keepLocalTime:!0}).startOf("day").valueOf(),r=i(t)-i(e);return Math.floor(il.fromMillis(r).as("days"))}function sl(e,t,i,r){let[o,a,n,s]=function(e,t,i){const r=[["years",(e,t)=>t.year-e.year],["quarters",(e,t)=>t.quarter-e.quarter+4*(t.year-e.year)],["months",(e,t)=>t.month-e.month+12*(t.year-e.year)],["weeks",(e,t)=>{const i=nl(e,t);return(i-i%7)/7}],["days",nl]],o={},a=e;let n,s;for(const[l,d]of r)i.indexOf(l)>=0&&(n=l,o[l]=d(e,t),s=a.plus(o),s>t?(o[l]--,(e=a.plus(o))>t&&(s=e,o[l]--,e=a.plus(o))):e=s);return[e,o,s,n]}(e,t,i);const l=t-o,d=i.filter(e=>["hours","minutes","seconds","milliseconds"].indexOf(e)>=0);0===d.length&&(n<t&&(n=o.plus({[s]:1})),n!==o&&(a[s]=(a[s]||0)+l/(n-o)));const c=il.fromObject(a,r);return d.length>0?il.fromMillis(l,r).shiftTo(...d).plus(c):c}function ll(e,t=e=>e){return{regex:e,deser:([e])=>t(function(e){let t=parseInt(e,10);if(isNaN(t)){t="";for(let i=0;i<e.length;i++){const r=e.charCodeAt(i);if(-1!==e[i].search(Na.hanidec))t+=Fa.indexOf(e[i]);else for(const e in Va){const[i,o]=Va[e];r>=i&&r<=o&&(t+=r-i)}}return parseInt(t,10)}return t}(e))}}const dl=`[ ${String.fromCharCode(160)}]`,cl=new RegExp(dl,"g");function hl(e){return e.replace(/\./g,"\\.?").replace(cl,dl)}function pl(e){return e.replace(/\./g,"").replace(cl," ").toLowerCase()}function ul(e,t){return null===e?null:{regex:RegExp(e.map(hl).join("|")),deser:([i])=>e.findIndex(e=>pl(i)===pl(e))+t}}function ml(e,t){return{regex:e,deser:([,e,t])=>Rn(e,t),groups:t}}function fl(e){return{regex:e,deser:([e])=>e}}const vl={year:{"2-digit":"yy",numeric:"yyyyy"},month:{numeric:"M","2-digit":"MM",short:"MMM",long:"MMMM"},day:{numeric:"d","2-digit":"dd"},weekday:{short:"EEE",long:"EEEE"},dayperiod:"a",dayPeriod:"a",hour12:{numeric:"h","2-digit":"hh"},hour24:{numeric:"H","2-digit":"HH"},minute:{numeric:"m","2-digit":"mm"},second:{numeric:"s","2-digit":"ss"},timeZoneName:{long:"ZZZZZ",short:"ZZZ"}};let gl=null;function yl(e,t){return Array.prototype.concat(...e.map(e=>function(e,t){if(e.literal)return e;const i=wl(is.macroTokenToFormatOpts(e.val),t);return null==i||i.includes(void 0)?e:i}(e,t)))}class bl{constructor(e,t){if(this.locale=e,this.format=t,this.tokens=yl(is.parseFormat(t),e),this.units=this.tokens.map(t=>function(e,t){const i=Ua(t),r=Ua(t,"{2}"),o=Ua(t,"{3}"),a=Ua(t,"{4}"),n=Ua(t,"{6}"),s=Ua(t,"{1,2}"),l=Ua(t,"{1,3}"),d=Ua(t,"{1,6}"),c=Ua(t,"{1,9}"),h=Ua(t,"{2,4}"),p=Ua(t,"{4,6}"),u=e=>{return{regex:RegExp((t=e.val,t.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"))),deser:([e])=>e,literal:!0};var t},m=(m=>{if(e.literal)return u(m);switch(m.val){case"G":return ul(t.eras("short"),0);case"GG":return ul(t.eras("long"),0);case"y":return ll(d);case"yy":case"kk":return ll(h,zn);case"yyyy":case"kkkk":return ll(a);case"yyyyy":return ll(p);case"yyyyyy":return ll(n);case"M":case"L":case"d":case"H":case"h":case"m":case"q":case"s":case"W":return ll(s);case"MM":case"LL":case"dd":case"HH":case"hh":case"mm":case"qq":case"ss":case"WW":return ll(r);case"MMM":return ul(t.months("short",!0),1);case"MMMM":return ul(t.months("long",!0),1);case"LLL":return ul(t.months("short",!1),1);case"LLLL":return ul(t.months("long",!1),1);case"o":case"S":return ll(l);case"ooo":case"SSS":return ll(o);case"u":return fl(c);case"uu":return fl(s);case"uuu":case"E":case"c":return ll(i);case"a":return ul(t.meridiems(),0);case"EEE":return ul(t.weekdays("short",!1),1);case"EEEE":return ul(t.weekdays("long",!1),1);case"ccc":return ul(t.weekdays("short",!0),1);case"cccc":return ul(t.weekdays("long",!0),1);case"Z":case"ZZ":return ml(new RegExp(`([+-]${s.source})(?::(${r.source}))?`),2);case"ZZZ":return ml(new RegExp(`([+-]${s.source})(${r.source})?`),2);case"z":return fl(/[a-z_+-/]{1,256}?/i);case" ":return fl(/[^\S\n\r]/);default:return u(m)}})(e)||{invalidReason:"missing Intl.DateTimeFormat.formatToParts support"};return m.token=e,m}(t,e)),this.disqualifyingUnit=this.units.find(e=>e.invalidReason),!this.disqualifyingUnit){const[e,t]=function(e){const t=e.map(e=>e.regex).reduce((e,t)=>`${e}(${t.source})`,"");return[`^${t}$`,e]}(this.units);this.regex=RegExp(e,"i"),this.handlers=t}}explainFromTokens(e){if(this.isValid){const[t,i]=function(e,t,i){const r=e.match(t);if(r){const e={};let t=1;for(const o in i)if(xn(i,o)){const a=i[o],n=a.groups?a.groups+1:1;!a.literal&&a.token&&(e[a.token.val[0]]=a.deser(r.slice(t,t+n))),t+=n}return[r,e]}return[r,{}]}(e,this.regex,this.handlers),[r,o,a]=i?function(e){let t,i=null;mn(e.z)||(i=ya.create(e.z)),mn(e.Z)||(i||(i=new Ma(e.Z)),t=e.Z),mn(e.q)||(e.M=3*(e.q-1)+1),mn(e.h)||(e.h<12&&1===e.a?e.h+=12:12===e.h&&0===e.a&&(e.h=0)),0===e.G&&e.y&&(e.y=-e.y),mn(e.u)||(e.S=Sn(e.u));const r=Object.keys(e).reduce((t,i)=>{const r=(e=>{switch(e){case"S":return"millisecond";case"s":return"second";case"m":return"minute";case"h":case"H":return"hour";case"d":return"day";case"o":return"ordinal";case"L":case"M":return"month";case"y":return"year";case"E":case"c":return"weekday";case"W":return"weekNumber";case"k":return"weekYear";case"q":return"quarter";default:return null}})(i);return r&&(t[r]=e[i]),t},{});return[r,i,t]}(i):[null,null,void 0];if(xn(i,"a")&&xn(i,"H"))throw new Po("Can't include meridiem when specifying 24-hour format");return{input:e,tokens:this.tokens,regex:this.regex,rawMatches:t,matches:i,result:r,zone:o,specificOffset:a}}return{input:e,tokens:this.tokens,invalidReason:this.invalidReason}}get isValid(){return!this.disqualifyingUnit}get invalidReason(){return this.disqualifyingUnit?this.disqualifyingUnit.invalidReason:null}}function xl(e,t,i){return new bl(e,i).explainFromTokens(t)}function wl(e,t){if(!e)return null;const i=is.create(t,e).dtFormatter((gl||(gl=Yl.fromMillis(1555555555555)),gl)),r=i.formatToParts(),o=i.resolvedOptions();return r.map(t=>function(e,t,i){const{type:r,value:o}=e;if("literal"===r){const e=/^\s+$/.test(o);return{literal:!e,val:e?" ":o}}const a=t[r];let n=r;"hour"===r&&(n=null!=t.hour12?t.hour12?"hour12":"hour24":null!=t.hourCycle?"h11"===t.hourCycle||"h12"===t.hourCycle?"hour12":"hour24":i.hour12?"hour12":"hour24");let s=vl[n];if("object"==typeof s&&(s=s[a]),s)return{literal:!1,val:s}}(t,e,o))}const _l="Invalid DateTime",kl=864e13;function $l(e){return new Qa("unsupported zone",`the zone "${e.name}" is not supported`)}function Cl(e){return null===e.weekData&&(e.weekData=sn(e.c)),e.weekData}function Sl(e){return null===e.localWeekData&&(e.localWeekData=sn(e.c,e.loc.getMinDaysInFirstWeek(),e.loc.getStartOfWeek())),e.localWeekData}function Dl(e,t){const i={ts:e.ts,zone:e.zone,c:e.c,o:e.o,loc:e.loc,invalid:e.invalid};return new Yl({...i,...t,old:i})}function El(e,t,i){let r=e-60*t*1e3;const o=i.offset(r);if(t===o)return[r,t];r-=60*(o-t)*1e3;const a=i.offset(r);return o===a?[r,o]:[e-60*Math.min(o,a)*1e3,Math.max(o,a)]}function Tl(e,t){const i=new Date(e+=60*t*1e3);return{year:i.getUTCFullYear(),month:i.getUTCMonth()+1,day:i.getUTCDate(),hour:i.getUTCHours(),minute:i.getUTCMinutes(),second:i.getUTCSeconds(),millisecond:i.getUTCMilliseconds()}}function Al(e,t,i){return El(In(e),t,i)}function Il(e,t){const i=e.o,r=e.c.year+Math.trunc(t.years),o=e.c.month+Math.trunc(t.months)+3*Math.trunc(t.quarters),a={...e.c,year:r,month:o,day:Math.min(e.c.day,An(r,o))+Math.trunc(t.days)+7*Math.trunc(t.weeks)},n=il.fromObject({years:t.years-Math.trunc(t.years),quarters:t.quarters-Math.trunc(t.quarters),months:t.months-Math.trunc(t.months),weeks:t.weeks-Math.trunc(t.weeks),days:t.days-Math.trunc(t.days),hours:t.hours,minutes:t.minutes,seconds:t.seconds,milliseconds:t.milliseconds}).as("milliseconds"),s=In(a);let[l,d]=El(s,i,e.zone);return 0!==n&&(l+=n,d=e.zone.offset(l)),{ts:l,o:d}}function Ol(e,t,i,r,o,a){const{setZone:n,zone:s}=i;if(e&&0!==Object.keys(e).length||t){const r=t||s,o=Yl.fromObject(e,{...i,zone:r,specificOffset:a});return n?o:o.setZone(s)}return Yl.invalid(new Qa("unparsable",`the input "${o}" can't be parsed as ${r}`))}function Ll(e,t,i=!0){return e.isValid?is.create(La.create("en-US"),{allowZ:i,forceSimple:!0}).formatDateTimeFromString(e,t):null}function zl(e,t,i){const r=e.c.year>9999||e.c.year<0;let o="";if(r&&e.c.year>=0&&(o+="+"),o+=kn(e.c.year,r?6:4),"year"===i)return o;if(t){if(o+="-",o+=kn(e.c.month),"month"===i)return o;o+="-"}else if(o+=kn(e.c.month),"month"===i)return o;return o+=kn(e.c.day),o}function Ml(e,t,i,r,o,a,n){let s=!i||0!==e.c.millisecond||0!==e.c.second,l="";switch(n){case"day":case"month":case"year":break;default:if(l+=kn(e.c.hour),"hour"===n)break;if(t){if(l+=":",l+=kn(e.c.minute),"minute"===n)break;s&&(l+=":",l+=kn(e.c.second))}else{if(l+=kn(e.c.minute),"minute"===n)break;s&&(l+=kn(e.c.second))}if("second"===n)break;!s||r&&0===e.c.millisecond||(l+=".",l+=kn(e.c.millisecond,3))}return o&&(e.isOffsetFixed&&0===e.offset&&!a?l+="Z":e.o<0?(l+="-",l+=kn(Math.trunc(-e.o/60)),l+=":",l+=kn(Math.trunc(-e.o%60))):(l+="+",l+=kn(Math.trunc(e.o/60)),l+=":",l+=kn(Math.trunc(e.o%60)))),a&&(l+="["+e.zone.ianaName+"]"),l}const Rl={month:1,day:1,hour:0,minute:0,second:0,millisecond:0},Pl={weekNumber:1,weekday:1,hour:0,minute:0,second:0,millisecond:0},Nl={ordinal:1,hour:0,minute:0,second:0,millisecond:0},Vl=["year","month","day","hour","minute","second","millisecond"],Fl=["weekYear","weekNumber","weekday","hour","minute","second","millisecond"],Hl=["year","ordinal","hour","minute","second","millisecond"];function Ul(e){const t={year:"year",years:"year",month:"month",months:"month",day:"day",days:"day",hour:"hour",hours:"hour",minute:"minute",minutes:"minute",quarter:"quarter",quarters:"quarter",second:"second",seconds:"second",millisecond:"millisecond",milliseconds:"millisecond",weekday:"weekday",weekdays:"weekday",weeknumber:"weekNumber",weeksnumber:"weekNumber",weeknumbers:"weekNumber",weekyear:"weekYear",weekyears:"weekYear",ordinal:"ordinal"}[e.toLowerCase()];if(!t)throw new No(e);return t}function ql(e){switch(e.toLowerCase()){case"localweekday":case"localweekdays":return"localWeekday";case"localweeknumber":case"localweeknumbers":return"localWeekNumber";case"localweekyear":case"localweekyears":return"localWeekYear";default:return Ul(e)}}function Bl(e,t){const i=Pa(t.zone,Ka.defaultZone);if(!i.isValid)return Yl.invalid($l(i));const r=La.fromObject(t);let o,a;if(mn(e.year))o=Ka.now();else{for(const t of Vl)mn(e[t])&&(e[t]=Rl[t]);const t=pn(e)||un(e);if(t)return Yl.invalid(t);const r=function(e){if(void 0===Wl&&(Wl=Ka.now()),"iana"!==e.type)return e.offset(Wl);const t=e.name;let i=Zl.get(t);return void 0===i&&(i=e.offset(Wl),Zl.set(t,i)),i}(i);[o,a]=Al(e,r,i)}return new Yl({ts:o,zone:i,loc:r,o:a})}function Gl(e,t,i){const r=!!mn(i.round)||i.round,o=mn(i.rounding)?"trunc":i.rounding,a=(e,a)=>{e=Dn(e,r||i.calendary?0:2,i.calendary?"round":o);return t.loc.clone(i).relFormatter(i).format(e,a)},n=r=>i.calendary?t.hasSame(e,r)?0:t.startOf(r).diff(e.startOf(r),r).get(r):t.diff(e,r).get(r);if(i.unit)return a(n(i.unit),i.unit);for(const e of i.units){const t=n(e);if(Math.abs(t)>=1)return a(t,e)}return a(e>t?-0:0,i.units[i.units.length-1])}function jl(e){let t,i={};return e.length>0&&"object"==typeof e[e.length-1]?(i=e[e.length-1],t=Array.from(e).slice(0,e.length-1)):t=Array.from(e),[i,t]}let Wl;const Zl=new Map;class Yl{constructor(e){const t=e.zone||Ka.defaultZone;let i=e.invalid||(Number.isNaN(e.ts)?new Qa("invalid input"):null)||(t.isValid?null:$l(t));this.ts=mn(e.ts)?Ka.now():e.ts;let r=null,o=null;if(!i){if(e.old&&e.old.ts===this.ts&&e.old.zone.equals(t))[r,o]=[e.old.c,e.old.o];else{const a=fn(e.o)&&!e.old?e.o:t.offset(this.ts);r=Tl(this.ts,a),i=Number.isNaN(r.year)?new Qa("invalid input"):null,r=i?null:r,o=i?null:a}}this._zone=t,this.loc=e.loc||La.create(),this.invalid=i,this.weekData=null,this.localWeekData=null,this.c=r,this.o=o,this.isLuxonDateTime=!0}static now(){return new Yl({})}static local(){const[e,t]=jl(arguments),[i,r,o,a,n,s,l]=t;return Bl({year:i,month:r,day:o,hour:a,minute:n,second:s,millisecond:l},e)}static utc(){const[e,t]=jl(arguments),[i,r,o,a,n,s,l]=t;return e.zone=Ma.utcInstance,Bl({year:i,month:r,day:o,hour:a,minute:n,second:s,millisecond:l},e)}static fromJSDate(e,t={}){const i=function(e){return"[object Date]"===Object.prototype.toString.call(e)}(e)?e.valueOf():NaN;if(Number.isNaN(i))return Yl.invalid("invalid input");const r=Pa(t.zone,Ka.defaultZone);return r.isValid?new Yl({ts:i,zone:r,loc:La.fromObject(t)}):Yl.invalid($l(r))}static fromMillis(e,t={}){if(fn(e))return e<-kl||e>kl?Yl.invalid("Timestamp out of range"):new Yl({ts:e,zone:Pa(t.zone,Ka.defaultZone),loc:La.fromObject(t)});throw new Vo(`fromMillis requires a numerical input, but received a ${typeof e} with value ${e}`)}static fromSeconds(e,t={}){if(fn(e))return new Yl({ts:1e3*e,zone:Pa(t.zone,Ka.defaultZone),loc:La.fromObject(t)});throw new Vo("fromSeconds requires a numerical input")}static fromObject(e,t={}){e=e||{};const i=Pa(t.zone,Ka.defaultZone);if(!i.isValid)return Yl.invalid($l(i));const r=La.fromObject(t),o=Nn(e,ql),{minDaysInFirstWeek:a,startOfWeek:n}=hn(o,r),s=Ka.now(),l=mn(t.specificOffset)?i.offset(s):t.specificOffset,d=!mn(o.ordinal),c=!mn(o.year),h=!mn(o.month)||!mn(o.day),p=c||h,u=o.weekYear||o.weekNumber;if((p||d)&&u)throw new Po("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(h&&d)throw new Po("Can't mix ordinal dates with month/day");const m=u||o.weekday&&!p;let f,v,g=Tl(s,l);m?(f=Fl,v=Pl,g=sn(g,a,n)):d?(f=Hl,v=Nl,g=dn(g)):(f=Vl,v=Rl);let y=!1;for(const e of f){mn(o[e])?o[e]=y?v[e]:g[e]:y=!0}const b=m?function(e,t=4,i=1){const r=vn(e.weekYear),o=_n(e.weekNumber,1,Ln(e.weekYear,t,i)),a=_n(e.weekday,1,7);return r?o?!a&&tn("weekday",e.weekday):tn("week",e.weekNumber):tn("weekYear",e.weekYear)}(o,a,n):d?function(e){const t=vn(e.year),i=_n(e.ordinal,1,Tn(e.year));return t?!i&&tn("ordinal",e.ordinal):tn("year",e.year)}(o):pn(o),x=b||un(o);if(x)return Yl.invalid(x);const w=m?ln(o,a,n):d?cn(o):o,[_,k]=Al(w,l,i),$=new Yl({ts:_,zone:i,o:k,loc:r});return o.weekday&&p&&e.weekday!==$.weekday?Yl.invalid("mismatched weekday",`you can't specify both a weekday of ${o.weekday} and a date of ${$.toISO()}`):$.isValid?$:Yl.invalid($.invalid)}static fromISO(e,t={}){const[i,r]=function(e){return ns(e,[Os,Rs],[Ls,Ps],[zs,Ns],[Ms,Vs])}(e);return Ol(i,r,t,"ISO 8601",e)}static fromRFC2822(e,t={}){const[i,r]=function(e){return ns(function(e){return e.replace(/\([^()]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").trim()}(e),[Cs,Ss])}(e);return Ol(i,r,t,"RFC 2822",e)}static fromHTTP(e,t={}){const[i,r]=function(e){return ns(e,[Ds,As],[Es,As],[Ts,Is])}(e);return Ol(i,r,t,"HTTP",t)}static fromFormat(e,t,i={}){if(mn(e)||mn(t))throw new Vo("fromFormat requires an input string and a format");const{locale:r=null,numberingSystem:o=null}=i,a=La.fromOpts({locale:r,numberingSystem:o,defaultToEN:!0}),[n,s,l,d]=function(e,t,i){const{result:r,zone:o,specificOffset:a,invalidReason:n}=xl(e,t,i);return[r,o,a,n]}(a,e,t);return d?Yl.invalid(d):Ol(n,s,i,`format ${t}`,e,l)}static fromString(e,t,i={}){return Yl.fromFormat(e,t,i)}static fromSQL(e,t={}){const[i,r]=function(e){return ns(e,[Hs,Rs],[Us,qs])}(e);return Ol(i,r,t,"SQL",e)}static invalid(e,t=null){if(!e)throw new Vo("need to specify a reason the DateTime is invalid");const i=e instanceof Qa?e:new Qa(e,t);if(Ka.throwOnInvalid)throw new zo(i);return new Yl({invalid:i})}static isDateTime(e){return e&&e.isLuxonDateTime||!1}static parseFormatForOpts(e,t={}){const i=wl(e,La.fromObject(t));return i?i.map(e=>e?e.val:null).join(""):null}static expandFormat(e,t={}){return yl(is.parseFormat(e),La.fromObject(t)).map(e=>e.val).join("")}static resetCache(){Wl=void 0,Zl.clear()}get(e){return this[e]}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}get outputCalendar(){return this.isValid?this.loc.outputCalendar:null}get zone(){return this._zone}get zoneName(){return this.isValid?this.zone.name:null}get year(){return this.isValid?this.c.year:NaN}get quarter(){return this.isValid?Math.ceil(this.c.month/3):NaN}get month(){return this.isValid?this.c.month:NaN}get day(){return this.isValid?this.c.day:NaN}get hour(){return this.isValid?this.c.hour:NaN}get minute(){return this.isValid?this.c.minute:NaN}get second(){return this.isValid?this.c.second:NaN}get millisecond(){return this.isValid?this.c.millisecond:NaN}get weekYear(){return this.isValid?Cl(this).weekYear:NaN}get weekNumber(){return this.isValid?Cl(this).weekNumber:NaN}get weekday(){return this.isValid?Cl(this).weekday:NaN}get isWeekend(){return this.isValid&&this.loc.getWeekendDays().includes(this.weekday)}get localWeekday(){return this.isValid?Sl(this).weekday:NaN}get localWeekNumber(){return this.isValid?Sl(this).weekNumber:NaN}get localWeekYear(){return this.isValid?Sl(this).weekYear:NaN}get ordinal(){return this.isValid?dn(this.c).ordinal:NaN}get monthShort(){return this.isValid?al.months("short",{locObj:this.loc})[this.month-1]:null}get monthLong(){return this.isValid?al.months("long",{locObj:this.loc})[this.month-1]:null}get weekdayShort(){return this.isValid?al.weekdays("short",{locObj:this.loc})[this.weekday-1]:null}get weekdayLong(){return this.isValid?al.weekdays("long",{locObj:this.loc})[this.weekday-1]:null}get offset(){return this.isValid?+this.o:NaN}get offsetNameShort(){return this.isValid?this.zone.offsetName(this.ts,{format:"short",locale:this.locale}):null}get offsetNameLong(){return this.isValid?this.zone.offsetName(this.ts,{format:"long",locale:this.locale}):null}get isOffsetFixed(){return this.isValid?this.zone.isUniversal:null}get isInDST(){return!this.isOffsetFixed&&(this.offset>this.set({month:1,day:1}).offset||this.offset>this.set({month:5}).offset)}getPossibleOffsets(){if(!this.isValid||this.isOffsetFixed)return[this];const e=864e5,t=6e4,i=In(this.c),r=this.zone.offset(i-e),o=this.zone.offset(i+e),a=this.zone.offset(i-r*t),n=this.zone.offset(i-o*t);if(a===n)return[this];const s=i-a*t,l=i-n*t,d=Tl(s,a),c=Tl(l,n);return d.hour===c.hour&&d.minute===c.minute&&d.second===c.second&&d.millisecond===c.millisecond?[Dl(this,{ts:s}),Dl(this,{ts:l})]:[this]}get isInLeapYear(){return En(this.year)}get daysInMonth(){return An(this.year,this.month)}get daysInYear(){return this.isValid?Tn(this.year):NaN}get weeksInWeekYear(){return this.isValid?Ln(this.weekYear):NaN}get weeksInLocalWeekYear(){return this.isValid?Ln(this.localWeekYear,this.loc.getMinDaysInFirstWeek(),this.loc.getStartOfWeek()):NaN}resolvedLocaleOptions(e={}){const{locale:t,numberingSystem:i,calendar:r}=is.create(this.loc.clone(e),e).resolvedOptions(this);return{locale:t,numberingSystem:i,outputCalendar:r}}toUTC(e=0,t={}){return this.setZone(Ma.instance(e),t)}toLocal(){return this.setZone(Ka.defaultZone)}setZone(e,{keepLocalTime:t=!1,keepCalendarTime:i=!1}={}){if((e=Pa(e,Ka.defaultZone)).equals(this.zone))return this;if(e.isValid){let r=this.ts;if(t||i){const t=e.offset(this.ts),i=this.toObject();[r]=Al(i,t,e)}return Dl(this,{ts:r,zone:e})}return Yl.invalid($l(e))}reconfigure({locale:e,numberingSystem:t,outputCalendar:i}={}){return Dl(this,{loc:this.loc.clone({locale:e,numberingSystem:t,outputCalendar:i})})}setLocale(e){return this.reconfigure({locale:e})}set(e){if(!this.isValid)return this;const t=Nn(e,ql),{minDaysInFirstWeek:i,startOfWeek:r}=hn(t,this.loc),o=!mn(t.weekYear)||!mn(t.weekNumber)||!mn(t.weekday),a=!mn(t.ordinal),n=!mn(t.year),s=!mn(t.month)||!mn(t.day),l=n||s,d=t.weekYear||t.weekNumber;if((l||a)&&d)throw new Po("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(s&&a)throw new Po("Can't mix ordinal dates with month/day");let c;o?c=ln({...sn(this.c,i,r),...t},i,r):mn(t.ordinal)?(c={...this.toObject(),...t},mn(t.day)&&(c.day=Math.min(An(c.year,c.month),c.day))):c=cn({...dn(this.c),...t});const[h,p]=Al(c,this.o,this.zone);return Dl(this,{ts:h,o:p})}plus(e){if(!this.isValid)return this;return Dl(this,Il(this,il.fromDurationLike(e)))}minus(e){if(!this.isValid)return this;return Dl(this,Il(this,il.fromDurationLike(e).negate()))}startOf(e,{useLocaleWeeks:t=!1}={}){if(!this.isValid)return this;const i={},r=il.normalizeUnit(e);switch(r){case"years":i.month=1;case"quarters":case"months":i.day=1;case"weeks":case"days":i.hour=0;case"hours":i.minute=0;case"minutes":i.second=0;case"seconds":i.millisecond=0}if("weeks"===r)if(t){const e=this.loc.getStartOfWeek(),{weekday:t}=this;t<e&&(i.weekNumber=this.weekNumber-1),i.weekday=e}else i.weekday=1;if("quarters"===r){const e=Math.ceil(this.month/3);i.month=3*(e-1)+1}return this.set(i)}endOf(e,t){return this.isValid?this.plus({[e]:1}).startOf(e,t).minus(1):this}toFormat(e,t={}){return this.isValid?is.create(this.loc.redefaultToEN(t)).formatDateTimeFromString(this,e):_l}toLocaleString(e=Bo,t={}){return this.isValid?is.create(this.loc.clone(t),e).formatDateTime(this):_l}toLocaleParts(e={}){return this.isValid?is.create(this.loc.clone(e),e).formatDateTimeParts(this):[]}toISO({format:e="extended",suppressSeconds:t=!1,suppressMilliseconds:i=!1,includeOffset:r=!0,extendedZone:o=!1,precision:a="milliseconds"}={}){if(!this.isValid)return null;const n="extended"===e;let s=zl(this,n,a=Ul(a));return Vl.indexOf(a)>=3&&(s+="T"),s+=Ml(this,n,t,i,r,o,a),s}toISODate({format:e="extended",precision:t="day"}={}){return this.isValid?zl(this,"extended"===e,Ul(t)):null}toISOWeekDate(){return Ll(this,"kkkk-'W'WW-c")}toISOTime({suppressMilliseconds:e=!1,suppressSeconds:t=!1,includeOffset:i=!0,includePrefix:r=!1,extendedZone:o=!1,format:a="extended",precision:n="milliseconds"}={}){if(!this.isValid)return null;return n=Ul(n),(r&&Vl.indexOf(n)>=3?"T":"")+Ml(this,"extended"===a,t,e,i,o,n)}toRFC2822(){return Ll(this,"EEE, dd LLL yyyy HH:mm:ss ZZZ",!1)}toHTTP(){return Ll(this.toUTC(),"EEE, dd LLL yyyy HH:mm:ss 'GMT'")}toSQLDate(){return this.isValid?zl(this,!0):null}toSQLTime({includeOffset:e=!0,includeZone:t=!1,includeOffsetSpace:i=!0}={}){let r="HH:mm:ss.SSS";return(t||e)&&(i&&(r+=" "),t?r+="z":e&&(r+="ZZ")),Ll(this,r,!0)}toSQL(e={}){return this.isValid?`${this.toSQLDate()} ${this.toSQLTime(e)}`:null}toString(){return this.isValid?this.toISO():_l}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`:`DateTime { Invalid, reason: ${this.invalidReason} }`}valueOf(){return this.toMillis()}toMillis(){return this.isValid?this.ts:NaN}toSeconds(){return this.isValid?this.ts/1e3:NaN}toUnixInteger(){return this.isValid?Math.floor(this.ts/1e3):NaN}toJSON(){return this.toISO()}toBSON(){return this.toJSDate()}toObject(e={}){if(!this.isValid)return{};const t={...this.c};return e.includeConfig&&(t.outputCalendar=this.outputCalendar,t.numberingSystem=this.loc.numberingSystem,t.locale=this.loc.locale),t}toJSDate(){return new Date(this.isValid?this.ts:NaN)}diff(e,t="milliseconds",i={}){if(!this.isValid||!e.isValid)return il.invalid("created by diffing an invalid DateTime");const r={locale:this.locale,numberingSystem:this.numberingSystem,...i},o=(s=t,Array.isArray(s)?s:[s]).map(il.normalizeUnit),a=e.valueOf()>this.valueOf(),n=sl(a?this:e,a?e:this,o,r);var s;return a?n.negate():n}diffNow(e="milliseconds",t={}){return this.diff(Yl.now(),e,t)}until(e){return this.isValid?ol.fromDateTimes(this,e):this}hasSame(e,t,i){if(!this.isValid)return!1;const r=e.valueOf(),o=this.setZone(e.zone,{keepLocalTime:!0});return o.startOf(t,i)<=r&&r<=o.endOf(t,i)}equals(e){return this.isValid&&e.isValid&&this.valueOf()===e.valueOf()&&this.zone.equals(e.zone)&&this.loc.equals(e.loc)}toRelative(e={}){if(!this.isValid)return null;const t=e.base||Yl.fromObject({},{zone:this.zone}),i=e.padding?this<t?-e.padding:e.padding:0;let r=["years","months","days","hours","minutes","seconds"],o=e.unit;return Array.isArray(e.unit)&&(r=e.unit,o=void 0),Gl(t,this.plus(i),{...e,numeric:"always",units:r,unit:o})}toRelativeCalendar(e={}){return this.isValid?Gl(e.base||Yl.fromObject({},{zone:this.zone}),this,{...e,numeric:"auto",units:["years","months","days"],calendary:!0}):null}static min(...e){if(!e.every(Yl.isDateTime))throw new Vo("min requires all arguments be DateTimes");return bn(e,e=>e.valueOf(),Math.min)}static max(...e){if(!e.every(Yl.isDateTime))throw new Vo("max requires all arguments be DateTimes");return bn(e,e=>e.valueOf(),Math.max)}static fromFormatExplain(e,t,i={}){const{locale:r=null,numberingSystem:o=null}=i;return xl(La.fromOpts({locale:r,numberingSystem:o,defaultToEN:!0}),e,t)}static fromStringExplain(e,t,i={}){return Yl.fromFormatExplain(e,t,i)}static buildFormatParser(e,t={}){const{locale:i=null,numberingSystem:r=null}=t,o=La.fromOpts({locale:i,numberingSystem:r,defaultToEN:!0});return new bl(o,e)}static fromFormatParser(e,t,i={}){if(mn(e)||mn(t))throw new Vo("fromFormatParser requires an input string and a format parser");const{locale:r=null,numberingSystem:o=null}=i,a=La.fromOpts({locale:r,numberingSystem:o,defaultToEN:!0});if(!a.equals(t.locale))throw new Vo(`fromFormatParser called with a locale of ${a}, but the format parser was created for ${t.locale}`);const{result:n,zone:s,specificOffset:l,invalidReason:d}=t.explainFromTokens(e);return d?Yl.invalid(d):Ol(n,s,i,`format ${t.format}`,e,l)}static get DATE_SHORT(){return Bo}static get DATE_MED(){return Go}static get DATE_MED_WITH_WEEKDAY(){return jo}static get DATE_FULL(){return Wo}static get DATE_HUGE(){return Zo}static get TIME_SIMPLE(){return Yo}static get TIME_WITH_SECONDS(){return Jo}static get TIME_WITH_SHORT_OFFSET(){return Ko}static get TIME_WITH_LONG_OFFSET(){return Qo}static get TIME_24_SIMPLE(){return Xo}static get TIME_24_WITH_SECONDS(){return ea}static get TIME_24_WITH_SHORT_OFFSET(){return ta}static get TIME_24_WITH_LONG_OFFSET(){return ia}static get DATETIME_SHORT(){return ra}static get DATETIME_SHORT_WITH_SECONDS(){return oa}static get DATETIME_MED(){return aa}static get DATETIME_MED_WITH_SECONDS(){return na}static get DATETIME_MED_WITH_WEEKDAY(){return sa}static get DATETIME_FULL(){return la}static get DATETIME_FULL_WITH_SECONDS(){return da}static get DATETIME_HUGE(){return ca}static get DATETIME_HUGE_WITH_SECONDS(){return ha}}function Jl(e){if(Yl.isDateTime(e))return e;if(e&&e.valueOf&&fn(e.valueOf()))return Yl.fromJSDate(e);if(e&&"object"==typeof e)return Yl.fromObject(e);throw new Vo(`Unknown datetime argument: ${e}, of type ${typeof e}`)}const Kl=s`
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
`;class Ql{static normalizeStage(e){const t=e.toLowerCase();return"veg"===t?"vegetative":"mom"===t?"mother":t}static getPlantStageColor(e){const t=this.normalizeStage(e);return this.stageColors[t]??"#757575"}static getPlantStageIcon(e){const t=this.normalizeStage(e);return this.stageIcons[t]??Do}static getPlantStage(e){const t=e?.attributes??{},i=new Date;return t.cure_start?"cure":t.dry_start?"dry":t.mom_start?"mother":t.clone_start?"clone":t.flower_start&&new Date(t.flower_start)<=i?"flower":t.veg_start&&new Date(t.veg_start)<=i?"vegetative":"seedling"}static createGridLayout(e,t,i){const r=Array.from({length:t},()=>Array.from({length:i},()=>null));return e.forEach(e=>{const o=(e.attributes?.row??1)-1,a=(e.attributes?.col??1)-1;o>=0&&o<t&&a>=0&&a<i&&(r[o][a]=e)}),{rows:t,cols:i,grid:r}}static calculateEffectiveRows(e){const{name:t,plants:i,plants_per_row:r,rows:o}=e;if("dry"===t||"cure"===t||"mother"===t||"clone"===t){if(0===i.length)return 1;const e=Math.max(...i.map(e=>e.attributes?.row||1)),t=i.filter(t=>(t.attributes?.row||1)===e).length;return t>=r?e+1:e}return o}static parseDateTimeLocal(e){if(e)try{const t=16===e.length?e+":00":e,i=new Date(t);if(isNaN(i.getTime()))return;const r=i.getFullYear(),o=String(i.getMonth()+1).padStart(2,"0"),a=String(i.getDate()).padStart(2,"0"),n=String(i.getHours()).padStart(2,"0"),s=String(i.getMinutes()).padStart(2,"0");return`${r}-${o}-${a}T${n}:${s}:${String(i.getSeconds()).padStart(2,"0")}`}catch{return}}static formatDateForBackend(e){if(e)try{const t=e.split("T");if(t.length>0&&t[0].match(/^\d{4}-\d{2}-\d{2}$/))return t[0];const i=new Date(e);if(isNaN(i.getTime()))return;const r=i.getFullYear(),o=String(i.getMonth()+1).padStart(2,"0");return`${r}-${o}-${String(i.getDate()).padStart(2,"0")}`}catch{return}}static getCurrentDateTime(){const e=new Date,t=e=>e.toString().padStart(2,"0");return`${e.getFullYear()}-${t(e.getMonth()+1)}-${t(e.getDate())}T${t(e.getHours())}:${t(e.getMinutes())}:00`}static toDateTimeLocal(e){if(!e)return"";try{const t=new Date(e);if(isNaN(t.getTime()))return"";const i=e=>e.toString().padStart(2,"0"),r=t.getFullYear(),o=i(t.getMonth()+1),a=i(t.getDate()),n=i(t.getHours());return`${r}-${o}-${a}T${n}:${i(t.getMinutes())}`}catch{return""}}static getDominantStage(e){if(!e||0===e.length)return null;const t=["cure","dry","flower","vegetative","clone","mother","seedling"];let i=null,r=0;const o={};for(const t of e){const e=this.normalizeStage(t.state||this.getPlantStage(t));o[e]||(o[e]=[]),o[e].push(t)}for(const e of t)if(o[e]&&o[e].length>0){i=e;const t=`${"vegetative"===e?"veg":e}_days`,a=o[e].map(e=>{const i=e.attributes[t];return"number"==typeof i?i:0});r=Math.max(...a);break}return i?{stage:i,days:r}:null}static compressImage(e,t=800,i=800,r=.7){return new Promise((o,a)=>{const n=new FileReader;n.readAsDataURL(e),n.onload=e=>{const n=new Image;n.src=e.target?.result,n.onload=()=>{let e=n.width,s=n.height;e>s?e>t&&(s=Math.round(s*t/e),e=t):s>i&&(e=Math.round(e*i/s),s=i);const l=document.createElement("canvas");l.width=e,l.height=s;const d=l.getContext("2d");if(!d)return void a(new Error("Failed to get canvas context"));d.drawImage(n,0,0,e,s);const c=l.toDataURL("image/jpeg",r);o(c)},n.onerror=e=>a(e)},n.onerror=e=>a(e)})}}Ql.stageColors={mother:"#E91E63",clone:"#FF5722",seedling:"#4CAF50",vegetative:"#8BC34A",flower:"#FF9800",dry:"#795548",cure:"#9C27B0"},Ql.stageIcons={mother:Do,clone:Do,seedling:Do,vegetative:Do,flower:wo,dry:_o,cure:po};class Xl{constructor(e){this.hass=e}getGrowspaceDevices(){if(!this.hass)return[];const e=Object.values(this.hass.states),t=e.filter(e=>e.entity_id.startsWith("sensor.")&&void 0!==e.attributes?.growspace_id&&void 0!==e.attributes?.rows&&void 0!==e.attributes?.plants_per_row&&void 0===e.attributes?.row&&void 0===e.attributes?.col),i=new Map;return t.forEach(e=>{const t=e.attributes.growspace_id;i.set(t,[])}),e.forEach(e=>{if(void 0!==e.attributes?.row&&void 0!==e.attributes?.col){const t=this.getGrowspaceId(e);i.has(t)||i.set(t,[]),i.get(t).push(e)}}),Array.from(i.entries()).map(([e,i])=>{const r=t.find(t=>t.attributes?.growspace_id===e),o=r?.attributes?.friendly_name||`Growspace ${e}`,a=r?.attributes?.type??(o.toLowerCase().includes("dry")?"dry":o.toLowerCase().includes("cure")?"cure":"normal");return n={device_id:e,overview_entity_id:r?.entity_id,name:o,plants:i,rows:r?.attributes?.rows??3,plants_per_row:r?.attributes?.plants_per_row??3,type:a},{...n,type:n.type??"normal"};var n})}getGrowspaceId(e){return e.attributes?.growspace_id||"unknown"}getStrainLibrary(){const e=Object.values(this.hass.states).find(e=>void 0!==e.attributes?.strains&&null!==e.attributes?.strains),t=e?.attributes?.strains;if(!t)return[];if(Array.isArray(t))return t.map(e=>({strain:e,phenotype:"",key:`${e}|default`}));if("object"==typeof t){const e=[];for(const[i,r]of Object.entries(t)){const t=r,o=t.analytics,a=t.meta||{};if(t.phenotypes&&"object"==typeof t.phenotypes){const r=Object.entries(t.phenotypes);if(r.length>0)for(const[t,n]of r){const r=n;let s;r.analytics?s=r.analytics:"number"==typeof r.avg_veg_days&&(s={avg_veg_days:r.avg_veg_days,avg_flower_days:r.avg_flower_days,total_harvests:r.total_harvests}),e.push({strain:i,phenotype:t,key:`${i}|${t}`,analytics:s,strain_analytics:o,image_crop_meta:r.image_crop_meta,breeder:r.breeder||a.breeder,type:r.type||a.type,lineage:r.lineage||a.lineage,sex:r.sex||a.sex,description:r.description||a.description,flowering_days_min:r.flower_days_min||a.flowering_days_min,flowering_days_max:r.flower_days_max||a.flowering_days_max,image:r.image_path||r.image||a.image,sativa_percentage:r.sativa_percentage||a.sativa_percentage,indica_percentage:r.indica_percentage||a.indica_percentage})}else e.push({strain:i,phenotype:"",key:`${i}|default`,strain_analytics:o,image_crop_meta:t.image_crop_meta,breeder:a.breeder,type:a.type,lineage:a.lineage,sex:a.sex,description:a.description,flowering_days_min:a.flowering_days_min,flowering_days_max:a.flowering_days_max,image:a.image,sativa_percentage:a.sativa_percentage,indica_percentage:a.indica_percentage})}else e.push({strain:i,phenotype:"",key:`${i}|default`,strain_analytics:o,image_crop_meta:t.image_crop_meta,breeder:a.breeder,type:a.type,lineage:a.lineage,sex:a.sex,description:a.description,flowering_days_min:a.flowering_days_min,flowering_days_max:a.flowering_days_max,image:a.image,sativa_percentage:a.sativa_percentage,indica_percentage:a.indica_percentage})}return e.sort((e,t)=>{const i=e.strain.localeCompare(t.strain);return 0!==i?i:(e.phenotype||"").localeCompare(t.phenotype||"")})}return[]}async getHistory(e,t,i){if(!this.hass)return[];let r=`history/period/${t.toISOString()}?filter_entity_id=${e}`;i&&(r+=`&end_time=${i.toISOString()}`);try{const e=await this.hass.callApi("GET",r);return e&&e.length>0?e[0]:[]}catch(e){return console.error("Error fetching history:",e),[]}}async addPlant(e){console.log("[DataService:addPlant] Sending payload:",e);try{"mother"!==e.growspace_id&&"mother_overview"!==e.growspace_id||(e.mother_start=(new Date).toISOString().split("T")[0]),"clone"!==e.growspace_id&&"clone_overview"!==e.growspace_id||(e.clone_start=(new Date).toISOString().split("T")[0]);const t=await this.hass.callService("growspace_manager","add_plant",e);return console.log("[DataService:addPlant] Response:",t),t}catch(e){throw console.error("[DataService:addPlant] Error:",e),e}}async updatePlant(e){console.log("[DataService:updatePlant] Sending payload:",e);try{const t=await this.hass.callService("growspace_manager","update_plant",e);return console.log("[DataService:updatePlant] Response:",t),t}catch(e){throw console.error("[DataService:updatePlant] Error:",e),e}}async removePlant(e){console.log("[DataService:removePlant] Removing plant_id:",e);try{const t=await this.hass.callService("growspace_manager","remove_plant",{plant_id:e});return console.log("[DataService:removePlant] Response:",t),t}catch(e){throw console.error("[DataService:removePlant] Error:",e),e}}async harvestPlant(e,t="dry"){console.log("[DataService:harvestPlant] Harvesting plant:",e,"→ target:",t);try{const i=(t||"").toLowerCase(),r={plant_id:e};i.includes("dry")?r.target_growspace_id="dry_overview":i.includes("cure")?r.target_growspace_id="cure_overview":i.includes("mother")?r.target_growspace_id="mother_overview":i.includes("clone")?r.target_growspace_id="clone_overview":i&&(r.target_growspace_name=t);const o=await this.hass.callService("growspace_manager","harvest_plant",r);return console.log("[DataService:harvestPlant] Response:",o),o}catch(e){throw console.error("[DataService:harvestPlant] Error:",e),e}}async takeClone(e,t="clone"){console.log("[DataService:takeClone] Cloning plant:",e,"→ target:",t);try{const i=(t||"").toLowerCase(),r={plant_id:e};i.includes("dry")?r.target_growspace_id="dry_overview":i.includes("cure")?r.target_growspace_id="cure_overview":i.includes("mother")?r.target_growspace_id="mother_overview":i.includes("clone")?r.target_growspace_id="clone_overview":i&&(r.target_growspace_name=t);const o=await this.hass.callService("growspace_manager","takeClone",r);return console.log("[DataService:takeClone] Response:",o),o}catch(e){throw console.error("[DataService:takeClone] Error:",e),e}}async swapPlants(e,t){console.log(`[DataService:swapPlants] Swapping plants: ${e} and ${t}`);try{const i=await this.hass.callService("growspace_manager","switch_plants",{plant1_id:e,plant2_id:t});return console.log("[DataService:swapPlants] Response:",i),i}catch(e){throw console.error("[DataService:swapPlants] Error:",e),e}}async addStrain(e){console.log("[DataService:addStrain] Adding strain:",e);try{const t={...e};Object.keys(t).forEach(e=>{void 0===t[e]&&delete t[e]}),e.image&&(e.image.startsWith("data:")?(t.image_base64=e.image,delete t.image):(t.image_path=e.image,delete t.image));const i=await this.hass.callService("growspace_manager","add_strain",t);return console.log("[DataService:addStrain] Response:",i),i}catch(e){throw console.error("[DataService:addStrain] Error:",e),e}}async removeStrain(e,t){console.log("[DataService:removeStrain] Removing strain:",e,t);try{const i=await this.hass.callService("growspace_manager","remove_strain",{strain:e,phenotype:t});return console.log("[DataService:removeStrain] Response:",i),i}catch(e){throw console.error("[DataService:removeStrain] Error:",e),e}}async importStrainLibrary(e,t){console.log("[DataService:importStrainLibrary] Importing strain library ZIP via HTTP. Replace:",t);const i=new FormData;i.append("file",e),i.append("replace",t.toString());try{const e=await fetch("/api/growspace_manager/import_strains",{method:"POST",body:i,headers:{Authorization:`Bearer ${this.hass.auth.data.access_token}`}});if(!e.ok){const t=await e.text();throw new Error(t||e.statusText)}const t=await e.json();if(console.log("[DataService:importStrainLibrary] Response:",t),t.success)return t;throw new Error(t.error||"Unknown import error")}catch(e){throw console.error("[DataService:importStrainLibrary] Error:",e),e}}async clearStrainLibrary(){console.log("[DataService:clearStrainLibrary] Clearing library");try{const e=await this.hass.callService("growspace_manager","clear_strain_library");return console.log("[DataService:clearStrainLibrary] Response:",e),e}catch(e){throw console.error("[DataService:clearStrainLibrary] Error:",e),e}}async addGrowspace(e){console.log("[DataService:addGrowspace] Adding growspace:",e);try{const t=await this.hass.callService("growspace_manager","add_growspace",e);return console.log("[DataService:addGrowspace] Response:",t),t}catch(e){throw console.error("[DataService:addGrowspace] Error:",e),e}}async configureGrowspaceSensors(e){console.log("[DataService:configureGrowspaceSensors] Configuring sensors:",e);try{const t=await this.hass.callService("growspace_manager","configure_growspace",e);return console.log("[DataService:configureGrowspaceSensors] Response:",t),t}catch(e){throw console.error("[DataService:configureGrowspaceSensors] Error:",e),e}}async configureGlobalSettings(e){console.log("[DataService:configureGlobalSettings] Configuring global settings:",e);try{const t=await this.hass.callService("growspace_manager","configure_global",e);return console.log("[DataService:configureGlobalSettings] Response:",t),t}catch(e){throw console.error("[DataService:configureGlobalSettings] Error:",e),e}}async askGrowAdvice(e,t){console.log("[DataService:askGrowAdvice] Asking advice for:",e,t);try{return await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"ask_grow_advice",service_data:{growspace_id:e,user_query:t},return_response:!0})}catch(e){throw console.error("[DataService:askGrowAdvice] Error:",e),e}}async analyzeAllGrowspaces(){console.log("[DataService:analyzeAllGrowspaces] Analyzing all growspaces");try{return await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"analyze_all_growspaces",service_data:{},return_response:!0})}catch(e){throw console.error("[DataService:analyzeAllGrowspaces] Error:",e),e}}async getStrainRecommendation(e){console.log("[DataService:getStrainRecommendation] Getting strain recommendation for:",e);try{return await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"strain_recommendation",service_data:{user_query:e},return_response:!0})}catch(e){throw console.error("[DataService:getStrainRecommendation] Error:",e),e}}}class ed{static getCropStyle(e,t){return t?`\n      background-image: url('${e}');\n      background-size: ${100*t.scale}%;\n      background-position: ${t.x}% ${t.y}%;\n    `:`background-image: url('${e}')`}static formatResponse(e){return"object"==typeof e&&null!==e?JSON.stringify(e,null,2):String(e)}static renderAddPlantDialog(e,t,i,r){if(!e?.open)return q``;const o=[...new Set(t.map(e=>e.strain))].sort(),a=ed.getTimelineContent(e,i,r);return q`
      <md-dialog
        open
        @closed=${r.onClose}
        style="--md-dialog-container-color: transparent;"
      >
        <div slot="content" class="glass-dialog-container" style="--stage-color: var(--plant-border-color-default)">
          <div class="dialog-header">
            <div class="dialog-title-group">
               <h2 class="dialog-title">Add New Plant</h2>
               <div class="dialog-subtitle">Enter plant details below</div>
            </div>
            <md-icon-button @click=${r.onClose}>
               <md-icon><path d="${vo}"></path></md-icon>
            </md-icon-button>
          </div>

          <div class="overview-grid">
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${ed.renderMD3SelectInput("Strain *",e.strain||"",o,r.onStrainChange)}
               ${ed.renderMD3TextInput("Phenotype",e.phenotype||"",r.onPhenotypeChange)}
               <div style="display:flex; gap:16px;">
                 ${ed.renderMD3NumberInput("Row",e.row+1,e=>r.onRowChange(e))}
                 ${ed.renderMD3NumberInput("Col",e.col+1,e=>r.onColChange(e))}
               </div>
             </div>
             <div class="detail-card">
                ${a}
             </div>
          </div>

          <div class="button-group">
            <md-outlined-button @click=${r.onClose}>
              Cancel
            </md-outlined-button>
            <md-filled-button @click=${r.onConfirm}>
              <md-icon slot="icon"><path d="${Do}"></path></md-icon>
              Add Plant
            </md-filled-button>
          </div>
        </div>
      </md-dialog>
    `}static getTimelineContent(e,t,i){const r=t.toLowerCase();let o;return o=r.includes("mother")?q`${ed.renderMD3DateInput("Mother Start",e.mother_start||"",i.onMotherStartChange)}`:r.includes("clone")?q`${ed.renderMD3DateInput("Clone Start",e.clone_start||"",i.onCloneStartChange)}`:r.includes("dry")?q`${ed.renderMD3DateInput("Dry Start",e.dry_start||"",i.onDryStartChange)}`:r.includes("cure")?q`${ed.renderMD3DateInput("Cure Start",e.cure_start||"",i.onCureStartChange)}`:q`
        ${ed.renderMD3DateInput("Seedling Start",e.seedling_start||"",i.onSeedlingStartChange)}
        ${ed.renderMD3DateInput("Vegetative Start",e.veg_start||"",i.onVegStartChange)}
        ${ed.renderMD3DateInput("Flower Start",e.flower_start||"",i.onFlowerStartChange)}
      `,q`
      <h3>Timeline</h3>
      ${o}
    `}static renderPlantOverviewDialog(e,t,i){if(!e?.open)return q``;const{plant:r,editedAttributes:o}=e,a=r.attributes?.plant_id||r.entity_id.replace("sensor.",""),n=Ql.getPlantStageColor(r.state),s=Ql.getPlantStageIcon(r.state),l=(e,t)=>{o[e]="number"==typeof t?t.toString():t,i.onAttributeChange(e,o[e])};return q`
      <md-dialog
        open
        @closed=${i.onClose}
        style="--md-dialog-container-color: transparent;"
      >
        <div slot="content" class="glass-dialog-container" style="--stage-color: ${n}">
          <div class="dialog-header">
            <div class="dialog-icon">
              <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${s}"></path>
              </svg>
            </div>
            <div class="dialog-title-group">
               <h2 class="dialog-title">${o.strain||"Unknown Strain"}</h2>
               <div class="dialog-subtitle">${r.state} Stage • ${o.phenotype||"No Phenotype"}</div>
            </div>
            <md-icon-button @click=${i.onClose}>
               <md-icon><path d="${vo}"></path></md-icon>
            </md-icon-button>
          </div>

          <div class="overview-grid">
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${ed.renderMD3TextInput("Strain Name",o.strain||"",e=>i.onAttributeChange("strain",e))}
               ${ed.renderMD3TextInput("Phenotype",o.phenotype||"",e=>i.onAttributeChange("phenotype",e))}
               <div style="display:flex; gap:16px;">
                 ${ed.renderMD3NumberInput("Row",o.row||1,e=>i.onAttributeChange("row",parseInt(e)))}
                 ${ed.renderMD3NumberInput("Col",o.col||1,e=>i.onAttributeChange("col",parseInt(e)))}
               </div>
             </div>

             <div class="detail-card">
               <h3>Timeline</h3>
               ${"mother"===o.stage?ed.renderMD3DateInput("Mother Start",o.mother_start??"",e=>l("mother_start",e)):G}
               ${"clone"===o.stage?ed.renderMD3DateInput("Clone Start",o.clone_start??"",e=>l("clone_start",e)):G}
               ${"veg"===o.stage||"flower"===o.stage?ed.renderMD3DateInput("Vegetative Start",o.veg_start??"",e=>l("veg_start",e)):G}
               ${"flower"===o.stage?ed.renderMD3DateInput("Flower Start",o.flower_start??"",e=>l("flower_start",e)):G}
               ${"dry"===o.stage||"cure"===o.stage?ed.renderMD3DateInput("Dry Start",o.dry_start??"",e=>l("dry_start",e)):G}
               ${"cure"===o.stage?ed.renderMD3DateInput("Cure Start",o.cure_start??"",e=>l("cure_start",e)):G}
             </div>

             ${ed.renderPlantStatsMD3(r)}
          </div>

          <div class="button-group">
             <md-outlined-button @click=${()=>i.onDelete(a)} style="--md-outlined-button-label-text-color: var(--error-color); --md-outlined-button-outline-color: var(--error-color);">
               <md-icon slot="icon"><path d="${xo}"></path></md-icon>
               Delete
             </md-outlined-button>

             <md-filled-button @click=${i.onUpdate}>
               <md-icon slot="icon"><path d="${uo}"></path></md-icon>
               Save Changes
             </md-filled-button>

             ${"mother"===r.state.toLowerCase()?q`
                <div class="take-clone-container" style="display:flex; align-items:center; gap:8px;" data-plant-id="${r.entity_id}">
                   <md-filled-text-field
                    type="number"
                    min="1"
                    max="10"
                    value="1"
                    class="num-clones-input"
                    style="width: 80px;"
                    label="Clones"
                  ></md-filled-text-field>
                  <md-filled-button
                    @click=${e=>{const t=e.currentTarget.previousElementSibling,o=t?parseInt(t.value,10):1;i.onTakeClone(r,o)}}
                  >
                    <md-icon slot="icon"><path d="${bo}"></path></md-icon>
                    Take Clone
                  </md-filled-button>
                </div>
             `:G}

             ${"flower"===r.state.toLowerCase()?q`
               <md-filled-button @click=${()=>i.onHarvest(r)}>
                 <md-icon slot="icon"><path d="${wo}"></path></md-icon>
                 Harvest
               </md-filled-button>
             `:G}

             ${"dry"===r.state.toLowerCase()?q`
               <md-filled-button @click=${()=>i.onFinishDrying(r)}>
                 <md-icon slot="icon"><path d="${po}"></path></md-icon>
                 Finish Drying
               </md-filled-button>
             `:G}

             ${"clone"===r.state.toLowerCase()?q`
               <div style="display:flex; align-items:center; gap:8px;">
                  <md-filled-select style="min-width: 150px;" id="clone-target-select" label="Move to...">
                    <md-select-option value=""></md-select-option>
                    ${Object.entries(t).map(([e,t])=>q`<md-select-option value="${e}"><div slot="headline">${t}</div></md-select-option>`)}
                  </md-filled-select>
                  <md-filled-button
                    @click=${e=>{const t=e.currentTarget.previousElementSibling;t.value?i.onMoveClone(r,t.value):alert("Select a growspace")}}
                  >
                    <md-icon slot="icon"><path d="${"M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"}"></path></md-icon>
                    Move
                  </md-filled-button>
               </div>
             `:G}
          </div>
        </div>
      </md-dialog>
    `}static renderStrainLibraryDialog(e,t){return e?.open?q`
      <md-dialog
        open
        @closed=${t.onClose}
        class="strain-dialog"
        style="--md-dialog-container-color: var(--growspace-card-bg);"
      >
        <div slot="content" style="padding:0; display:flex; flex-direction:column; height:100%;">
           ${"browse"===e.view?this.renderStrainBrowseView(e,t):this.renderStrainEditorView(e,t)}
        </div>

        ${e.isCropping?this.renderCropOverlay(e,t):G}
        ${e.isImageSelectorOpen?this.renderImageSelector(e,t):G}
        ${e.importDialog?.open?this.renderImportDialog(e,t):G}

      </md-dialog>
    `:q``}static renderImportDialog(e,t){const i=e.importDialog?.replace||!1;return q`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 400px; max-width: 90vw; border-radius: 16px; padding: 24px; border: 1px solid var(--border-color); color: #fff; display: flex; flex-direction: column; gap: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                 <h2 style="margin: 0; font-size: 1.25rem;">Import Strains</h2>
                 <md-icon-button @click=${()=>t.onImportDialogChange({open:!1})}>
                    <md-icon><path d="${vo}"></path></md-icon>
                 </md-icon-button>
              </div>
              <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">
                 Select a ZIP file containing your strain library export. You can either merge the new strains with your existing library or replace it entirely.
              </div>
              <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
                 <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                    <md-radio name="import_mode" .checked=${!i} @change=${()=>t.onImportDialogChange({replace:!1})}></md-radio>
                    <div>
                       <div style="font-weight: 600;">Merge</div>
                       <div style="font-size: 0.8rem; color: var(--text-secondary);">Add new strains, keep existing ones.</div>
                    </div>
                 </label>
                 <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;"></div>
                 <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                     <md-radio name="import_mode" .checked=${i} @change=${()=>t.onImportDialogChange({replace:!0})}></md-radio>
                     <div>
                       <div style="font-weight: 600;">Replace</div>
                       <div style="font-size: 0.8rem; color: var(--text-secondary);">Overwrite entire library with import.</div>
                    </div>
                 </label>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
                 <md-outlined-button @click=${()=>t.onImportDialogChange({open:!1})}>
                    Cancel
                 </md-outlined-button>
                 <md-filled-button @click=${t.onConfirmImport}>
                    <md-icon slot="icon"><path d="${go}"></path></md-icon>
                    Select File
                 </md-filled-button>
              </div>
           </div>
        </div>
     `}static renderImageSelector(e,t){const i=new Map;return e.strains.forEach(e=>{e.image&&(i.has(e.image)||i.set(e.image,[]),i.get(e.image).push({strain:e.strain,phenotype:e.phenotype||""}))}),q`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 80%; max-width: 800px; height: 80%; max-height: 600px; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color);">
              <div class="sd-header">
                 <h2 class="sd-title">Select from Library</h2>
                 <md-icon-button @click=${()=>t.onToggleImageSelector(!1)}>
                    <md-icon><path d="${vo}"></path></md-icon>
                 </md-icon-button>
              </div>
              <div class="sd-content" style="overflow-y: auto;">
                 <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
                    ${[...i.entries()].map(([e,i])=>q`
                       <div style="aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; position: relative;"
                            @click=${()=>t.onSelectLibraryImage(e)}>
                          <img src="${e}" style="width: 100%; height: 100%; object-fit: cover;" />
                          <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 8px; font-size: 0.75rem; color: white;">
                             ${i.map((e,t)=>q`
                                <div style="${t<i.length-1?"margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);":""}">
                                   <div style="font-weight: 700;">Strain: ${e.strain}</div>
                                   <div style="opacity: 0.9;">Pheno: ${e.phenotype||"N/A"}</div>
                                </div>
                             `)}
                          </div>
                       </div>
                    `)}
                 </div>
                 ${0===i.size?q`<p style="text-align: center; color: var(--text-secondary); margin-top: 40px;">No images found in library.</p>`:G}
              </div>
           </div>
        </div>
     `}static renderCropOverlay(e,t){const i=e.editorState;if(!i.image)return G;const r=i.image_crop_meta||{x:50,y:50,scale:1};return q`
       <div class="crop-overlay">
          <h3 style="color:white; margin-bottom:20px;">Adjust Image</h3>
          <div class="crop-viewport"
               @wheel=${e=>{e.preventDefault();const i=-.001*e.deltaY,o=Math.min(Math.max(r.scale+i,1),5);t.onEditorChange("image_crop_meta",{...r,scale:o})}}
               @mousedown=${e=>{const i=e.clientX,o=e.clientY,a=r.x,n=r.y,s=e=>{const s=(i-e.clientX)*(.2/r.scale),l=(o-e.clientY)*(.2/r.scale);let d=Math.min(Math.max(a+s,0),100),c=Math.min(Math.max(n+l,0),100);t.onEditorChange("image_crop_meta",{...r,x:d,y:c})},l=()=>{window.removeEventListener("mousemove",s),window.removeEventListener("mouseup",l)};window.addEventListener("mousemove",s),window.addEventListener("mouseup",l)}}
               @dragstart=${e=>e.preventDefault()}>
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
                <md-filled-button style="flex:1" @click=${()=>t.onToggleCropMode(!1)}>Done</md-filled-button>
             </div>
             <div style="text-align:center; font-size:0.8rem; color:#888; margin-top:8px;">
                Drag to pan • Scroll to zoom
             </div>
          </div>
       </div>
    `}static renderStrainBrowseView(e,t){const i=(e.searchQuery||"").toLowerCase(),r=e.strains.filter(e=>e.strain.toLowerCase().includes(i)||e.breeder&&e.breeder.toLowerCase().includes(i)||e.phenotype&&e.phenotype.toLowerCase().includes(i));return q`
      <div class="sd-header">
         <h2 class="sd-title">Strain Library</h2>
         <md-icon-button @click=${t.onClose}>
            <md-icon><path d="${vo}"></path></md-icon>
         </md-icon-button>
      </div>

      <div class="sd-content">
         <div class="search-bar-container">
            <div class="search-input-wrapper">
               <md-filled-text-field
                  placeholder="Search Strains by Name, Breeder..."
                  .value=${e.searchQuery||""}
                  @input=${e=>t.onSearch(e.target.value)}
                  style="width: 100%;"
               >
                 <md-icon slot="leading-icon"><path d="${Co}"></path></md-icon>
               </md-filled-text-field>
            </div>
         </div>

         <div class="sd-grid">
            ${r.map(e=>this.renderStrainCard(e,t))}
         </div>

         ${0===r.length?q`
            <div style="text-align:center; padding: 40px; color: var(--text-secondary);">
               <md-icon style="width:48px;height:48px;opacity:0.5;"><path d="${Co}"></path></md-icon>
               <p>No strains found matching "${i}"</p>
            </div>
         `:G}
      </div>

      <div class="sd-footer">
         <md-outlined-button @click=${t.onGetRecommendation}>
            <md-icon slot="icon"><path d="${ho}"></path></md-icon>
            Get Recommendation
         </md-outlined-button>
         <md-outlined-button @click=${t.onOpenImportDialog}>
            <md-icon slot="icon"><path d="${go}"></path></md-icon>
            Import Strains
         </md-outlined-button>
         <md-outlined-button @click=${t.onExportStrains}>
            <md-icon slot="icon"><path d="${"M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"}"></path></md-icon>
            Export Strains
         </md-outlined-button>
         <md-filled-button @click=${()=>t.onSwitchView("editor")}>
            <md-icon slot="icon"><path d="${So}"></path></md-icon>
            New Strain
         </md-filled-button>
      </div>
    `}static renderStrainCard(e,t){let i=ko,r=e.type||"Unknown";const o=(e.type||"").toLowerCase();o.includes("indica")?i=Io:o.includes("sativa")?i=Oo:o.includes("hybrid")?i=To:(o.includes("ruderalis")||o.includes("auto"))&&(i=ko);const a=e.image?ed.getCropStyle(e.image,e.image_crop_meta):"";return q`
       <div class="strain-card" @click=${()=>t.onSwitchView("editor",e)}>
          <div class="sc-thumb" style="${e.image?a+"; background-repeat: no-repeat; background-position: center; background-size: cover;":""}">
             ${e.image?e.image_crop_meta?q`<div style="width:100%; height:100%; ${a}; background-repeat: no-repeat;"></div>`:q`<img src="${e.image}" alt="${e.strain}" />`:q`<md-icon style="width:48px;height:48px;opacity:0.2;"><path d="${po}"></path></md-icon>`}
             <div class="sc-actions">
                <button class="sc-action-btn" @click=${i=>{i.stopPropagation(),t.onRemoveStrain(e.key)}}>
                   <md-icon style="width:16px;height:16px;"><path d="${xo}"></path></md-icon>
                </button>
             </div>
          </div>
          <div class="sc-content">
             <h3 class="sc-title">${e.strain} ${e.phenotype?`(${e.phenotype})`:""}</h3>
             <div class="sc-type-row" style="flex-wrap: wrap;">
                <div style="display:flex; align-items:center; gap:6px; width: 100%;">
                   <md-icon style="width:16px;height:16px;"><path d="${i}"></path></md-icon>
                   <span>${r}</span>
                </div>
             </div>
             <div class="sc-meta">
                ${e.flowering_days_min?q`<span>Flowering: ${e.flowering_days_min}-${e.flowering_days_max||"?"} Days</span>`:G}
                ${e.breeder?q`<span>Breeder: ${e.breeder}</span>`:G}
             </div>
          </div>
       </div>
     `}static renderStrainEditorView(e,t){const i=e.editorState||{},r=!!i.strain&&e.strains.some(e=>e.strain===i.strain&&e.phenotype===i.phenotype),o=(e,i)=>t.onEditorChange(e,i),a=[...new Set(e.strains.map(e=>e.strain).filter(Boolean))].sort(),n=[...new Set(e.strains.map(e=>e.breeder).filter(Boolean))].sort();return q`
      <datalist id="strain-suggestions">
         ${a.map(e=>q`<option value="${e}"></option>`)}
      </datalist>
      <datalist id="breeder-suggestions">
         ${n.map(e=>q`<option value="${e}"></option>`)}
      </datalist>

      <div class="sd-header">
         <div style="display:flex; align-items:center; gap:16px;">
            <md-outlined-button @click=${()=>t.onSwitchView("browse")}>
               <md-icon slot="icon"><path d="${"M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"}"></path></md-icon>
               Back
            </md-outlined-button>
            <h2 class="sd-title">${r?"Edit Strain":"Add New Strain"}</h2>
         </div>
         <md-icon-button @click=${t.onClose}>
            <md-icon><path d="${vo}"></path></md-icon>
         </md-icon-button>
      </div>

      <div class="sd-content">
         <div class="editor-layout">
            <div class="editor-col">
               <div class="photo-upload-area"
                    @click=${e=>{const t=e.target;t.closest(".crop-btn")||t.closest(".select-library-btn")||e.currentTarget.querySelector("input")?.click()}}
                    @dragover=${e=>{e.preventDefault(),e.dataTransfer.dropEffect="copy"}}
                    @drop=${e=>{e.preventDefault();const t=e.dataTransfer?.files[0];t&&Ql.compressImage(t).then(e=>o("image",e)).catch(e=>console.error("Error compressing image:",e))}}>

                  <button class="select-library-btn" @click=${e=>{e.stopPropagation(),t.onToggleImageSelector(!0)}}>
                      <md-icon style="width:14px;height:14px;"><path d="${Ao}"></path></md-icon>
                      Select from Library
                  </button>

                  ${i.image?q`
                     ${i.image_crop_meta?q`<div style="width:100%; height:100%; border-radius:10px; ${ed.getCropStyle(i.image,i.image_crop_meta)}; background-repeat: no-repeat;"></div>`:q`<img src="${i.image}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" />`}
                     <div style="position:absolute; bottom:8px; right:8px; display:flex; gap:8px;">
                         <button class="crop-btn"
                                 style="background:rgba(0,0,0,0.6); border:none; padding:6px; border-radius:50%; cursor:pointer; color:white;"
                                 @click=${e=>{e.stopPropagation(),t.onToggleCropMode(!0)}}
                                 title="Crop Image">
                            <md-icon style="width:18px;height:18px;"><path d="${bo}"></path></md-icon>
                         </button>
                     </div>
                  `:q`
                     <md-icon style="width:48px;height:48px;margin-bottom:16px;"><path d="${"M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z"}"></path></md-icon>
                     <span style="font-weight:600;">PHOTO UPLOAD AREA</span>
                     <span style="font-size:0.8rem; margin-top:4px;">(Drag & Drop or Click)</span>
                  `}
                  <input type="file" id="strain-image-upload" style="display:none" accept="image/*"
                         @change=${e=>{const t=e.target.files?.[0];t&&Ql.compressImage(t).then(e=>o("image",e)).catch(e=>console.error("Error compressing image:",e))}} />
               </div>

               <div class="sd-form-group">
                  <md-filled-text-field label="Strain Name *" .value=${i.strain} @input=${e=>o("strain",e.target.value)} style="width:100%;"></md-filled-text-field>
               </div>
               <div class="sd-form-group">
                  <md-filled-text-field label="Phenotype" placeholder="e.g. #1 (Optional)" .value=${i.phenotype} @input=${e=>o("phenotype",e.target.value)} style="width:100%;"></md-filled-text-field>
               </div>
               <div class="sd-form-group">
                  <md-filled-text-field label="Breeder/Seedbank" .value=${i.breeder} @input=${e=>o("breeder",e.target.value)} style="width:100%;"></md-filled-text-field>
               </div>
            </div>

            <div class="editor-col">
               <div class="sd-form-group">
                  <label class="sd-label">Type *</label>
                  <div class="type-selector-grid">
                     ${["Indica","Sativa","Hybrid","Ruderalis"].map(e=>{let t=ko;"Indica"===e&&(t=Io),"Sativa"===e&&(t=Oo),"Hybrid"===e&&(t=To);const r=(i.type||"").toLowerCase()===e.toLowerCase();return q`
                           <div class="type-option ${r?"active":""}"
                                @click=${()=>o("type",e)}>
                              <md-icon><path d="${t}"></path></md-icon>
                              <span class="type-label">${e}</span>
                           </div>
                        `})}
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Flowering Time (Days)</label>
                  <div style="display:flex; gap:16px;">
                     <md-filled-text-field type="number" label="Min" .value=${i.flowering_min} @input=${e=>o("flowering_min",e.target.value)} style="flex:1;"></md-filled-text-field>
                     <md-filled-text-field type="number" label="Max" .value=${i.flowering_max} @input=${e=>o("flowering_max",e.target.value)} style="flex:1;"></md-filled-text-field>
                  </div>
               </div>

               <div class="sd-form-group">
                  <md-filled-text-field label="Lineage" .value=${i.lineage} @input=${e=>o("lineage",e.target.value)} style="width:100%;"></md-filled-text-field>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Sex</label>
                  <div style="display:flex; gap:20px; padding: 8px 0;">
                     ${["Feminized","Regular"].map(e=>q`
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white;">
                           <md-radio name="sex_radio" .checked=${i.sex===e} @change=${()=>o("sex",e)}></md-radio>
                           ${e}
                        </label>
                     `)}
                  </div>
               </div>

               <div class="sd-form-group">
                  <md-filled-text-field type="textarea" label="Description" .value=${i.description} @input=${e=>o("description",e.target.value)} style="width:100%;"></md-filled-text-field>
               </div>
            </div>
         </div>
      </div>

      <div class="sd-footer">
         <md-outlined-button @click=${()=>t.onSwitchView("browse")}>
            Cancel
         </md-outlined-button>
         <md-filled-button @click=${t.onAddStrain}>
            <md-icon slot="icon"><path d="${uo}"></path></md-icon>
            Save Strain
         </md-filled-button>
      </div>
    `}static renderMD3TextInput(e,t,i){return q`
      <div class="md3-input-group">
        <md-filled-text-field
          label="${e}"
          .value=${t}
          @input=${e=>i(e.target.value)}
          style="width: 100%;"
        ></md-filled-text-field>
      </div>
    `}static renderMD3SelectInput(e,t,i,r){return q`
      <div class="md3-input-group">
        <md-filled-select
          label="${e}"
          .value=${t}
          @change=${e=>r(e.target.value)}
          style="width: 100%;"
        >
          <md-select-option value=""></md-select-option>
          ${i.map(e=>q`<md-select-option value="${e}" ?selected=${e===t}><div slot="headline">${e}</div></md-select-option>`)}
        </md-filled-select>
      </div>
    `}static renderMD3NumberInput(e,t,i){return q`
      <div class="md3-input-group">
        <md-filled-text-field
          label="${e}"
          type="number"
          min="1"
          .value=${t.toString()}
          @input=${e=>i(e.target.value)}
          style="width: 100%;"
        ></md-filled-text-field>
      </div>
    `}static renderMD3DateInput(e,t,i){const r=Ql.toDateTimeLocal(t);return q`
      <div class="md3-input-group">
        <md-filled-text-field
          label="${e}"
          type="datetime-local"
          .value=${r}
          @input=${e=>i(e.target.value)}
          style="width: 100%;"
        ></md-filled-text-field>
      </div>
    `}static renderPlantStatsMD3(e){return e.attributes?.veg_days||e.attributes?.flower_days||e.attributes?.dry_days||e.attributes?.cure_days?q`
      <div class="detail-card">
        <h3>Current Progress</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
           ${e.attributes?.veg_days?q`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-veg);">${e.attributes.veg_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Veg Days</span>
             </div>
           `:""}
           ${e.attributes?.flower_days?q`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-flower);">${e.attributes.flower_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Flower Days</span>
             </div>
           `:""}
           ${e.attributes?.dry_days?q`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-dry);">${e.attributes.dry_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Drying Days</span>
             </div>
           `:""}
           ${e.attributes?.cure_days?q`
             <div style="display:flex; flex-direction:column; align-items:center; gap:4px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 8px; min-width: 60px;">
               <span style="font-size:1.2rem; font-weight:bold; color: var(--stage-cure);">${e.attributes.cure_days}</span>
               <span style="font-size:0.7rem; opacity:0.7;">Curing Days</span>
             </div>
           `:""}
        </div>
      </div>
    `:q``}static renderConfigDialog(e,t,i){if(!e?.open)return q``;const r=e.currentTab;return q`
      <md-dialog
        open
        @closed=${i.onClose}
        style="--md-dialog-container-color: transparent;"
      >
        <div slot="content" class="config-container">
           <div class="config-header">
              <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 12px;">
                 <md-icon><path d="${yo}"></path></md-icon>
              </div>
              <h2 class="config-title">Configuration</h2>
              <div style="flex:1"></div>
              <md-icon-button @click=${i.onClose}>
                 <md-icon><path d="${vo}"></path></md-icon>
              </md-icon-button>
           </div>

           <div class="config-tabs">
              <div class="config-tab ${"add_growspace"===r?"active":""}"
                   @click=${()=>i.onSwitchTab("add_growspace")}>
                 <md-icon><path d="${Ao}"></path></md-icon>
                 Add Growspace
              </div>
              <div class="config-tab ${"environment"===r?"active":""}"
                   @click=${()=>i.onSwitchTab("environment")}>
                 <md-icon><path d="${Eo}"></path></md-icon>
                 Environment
              </div>
              <div class="config-tab ${"global"===r?"active":""}"
                   @click=${()=>i.onSwitchTab("global")}>
                 <md-icon><path d="${"M17.9,17.39C17.64,16.59 16.89,16 16,16H15V13A1,1 0 0,0 14,12H8V10H10A1,1 0 0,0 11,9V7H13A2,2 0 0,0 15,5V4.59C17.93,5.77 20,8.64 20,12C20,14.08 19.2,15.97 17.9,17.39M11,19.93C7.05,19.44 4,16.08 4,12C4,11.38 4.08,10.78 4.21,10.21L9,15V16A2,2 0 0,0 11,18M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"}"></path></md-icon>
                 Global
              </div>
           </div>

           <div class="config-content">
              ${"add_growspace"===r?this.renderAddGrowspaceTab(e,i):G}
              ${"environment"===r?this.renderEnvironmentTab(e,t,i):G}
              ${"global"===r?this.renderGlobalTab(e,i):G}
           </div>

           <div class="config-actions">
              <md-outlined-button @click=${i.onClose}>Cancel</md-outlined-button>
              ${"add_growspace"===r?q`
                 <md-filled-button @click=${i.onAddGrowspaceSubmit}>Add Growspace</md-filled-button>
              `:G}
              ${"environment"===r?q`
                 <md-filled-button @click=${i.onEnvSubmit}>Save Sensors</md-filled-button>
              `:G}
              ${"global"===r?q`
                 <md-filled-button @click=${i.onGlobalSubmit}>Save Global</md-filled-button>
              `:G}
           </div>
        </div>
      </md-dialog>
    `}static renderAddGrowspaceTab(e,t){const i=e.addGrowspaceData;return q`
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
    `}static renderEnvironmentTab(e,t,i){const r=e.environmentData,o=Object.entries(t).map(([e,t])=>({id:e,name:t}));return q`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Select Target</h3>
             <div class="md3-input-group">
                <md-filled-select label="Growspace" .value=${r.selectedGrowspaceId} @change=${e=>i.onEnvChange("selectedGrowspaceId",e.target.value)} style="width: 100%;">
                   <md-select-option value=""></md-select-option>
                   ${o.map(e=>q`<md-select-option value="${e.id}"><div slot="headline">${e.name}</div></md-select-option>`)}
                </md-filled-select>
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
    `}static renderGlobalTab(e,t){const i=e.globalData;return q`
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
    `}static renderGrowMasterDialog(e,t,i,r){if(!e?.open)return q``;const o=t?"#FF9800":"#4CAF50",a=i?`Ask the ${i}`:"Ask the Grow Master";return q`
      <md-dialog
        open
        @closed=${r.onClose}
        style="--md-dialog-container-color: transparent;"
      >
        <div slot="content" class="gm-container">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: ${o}">
                 <md-icon><path d="${ho}"></path></md-icon>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">${a}</h2>
                 <div style="font-size:0.8rem; color:var(--secondary-text-color); margin-top:4px;">
                    ${t?"Warning: Plant Stress Detected":"All systems normal"}
                 </div>
              </div>
              <md-icon-button @click=${r.onClose}>
                 <md-icon><path d="${vo}"></path></md-icon>
              </md-icon-button>
           </div>

           <div class="gm-content">
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Question</label>
                 <md-filled-text-field
                    type="textarea"
                    placeholder="Ask about this growspace..."
                    .value=${e.userQuery}
                    @input=${e=>r.onQueryChange(e.target.value)}
                    style="width: 100%;"
                 ></md-filled-text-field>
              </div>

              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <md-outlined-button
                    @click=${r.onAnalyzeAll}
                    ?disabled=${e.isLoading}
                    style="opacity: ${e.isLoading?.7:1}"
                 >
                    Analyze All
                 </md-outlined-button>
                 <md-filled-button
                    @click=${r.onAnalyze}
                    ?disabled=${e.isLoading}
                    style="opacity: ${e.isLoading?.7:1}"
                 >
                    ${e.isLoading?"Analyzing...":"Analyze Environment"}
                 </md-filled-button>
              </div>

              ${e.isLoading?q`
                 <div class="gm-loading">
                    <md-icon class="spinner"><path d="${$o}"></path></md-icon>
                    <span>Consulting the archives...</span>
                 </div>
              `:G}

              ${!e.isLoading&&e.response?q`
                 <div class="gm-response-box">
                    ${ed.formatResponse(e.response)}
                 </div>
              `:G}
           </div>
        </div>
      </md-dialog>
    `}static renderStrainRecommendationDialog(e,t){return e?.open?q`
      <md-dialog
        open
        @closed=${t.onClose}
        style="--md-dialog-container-color: transparent;"
      >
        <div slot="content" class="gm-container">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: #4CAF50">
                 <md-icon><path d="${ho}"></path></md-icon>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">Get Strain Recommendation</h2>
              </div>
              <md-icon-button @click=${t.onClose}>
                 <md-icon><path d="${vo}"></path></md-icon>
              </md-icon-button>
           </div>

           <div class="gm-content">
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Preferences</label>
                 <md-filled-text-field
                    type="textarea"
                    placeholder="e.g., something fruity and good for daytime use..."
                    .value=${e.userQuery}
                    @input=${e=>t.onQueryChange(e.target.value)}
                    style="width: 100%;"
                 ></md-filled-text-field>
              </div>

              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <md-outlined-button @click=${t.onClose}>OK</md-outlined-button>
                 <md-filled-button
                    @click=${t.onGetRecommendation}
                    ?disabled=${e.isLoading}
                    style="opacity: ${e.isLoading?.7:1}"
                 >
                    ${e.isLoading?"Getting Recommendation...":"Get Recommendation"}
                 </md-filled-button>
              </div>

              ${e.isLoading?q`
                 <div class="gm-loading">
                    <md-icon class="spinner"><path d="${$o}"></path></md-icon>
                    <span>Consulting the archives...</span>
                 </div>
              `:G}

              ${!e.isLoading&&e.response?q`
                 <div class="gm-response-box">
                    ${ed.formatResponse(e.response)}
                 </div>
              `:G}
           </div>
        </div>
      </md-dialog>
    `:q``}}let td=class extends le{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._strainLibraryDialog=null,this._configDialog=null,this._growMasterDialog=null,this._strainRecommendationDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1,this._isMenuOpen=!1,this._historyData=null,this._lightCycleCollapsed=!0,this._activeEnvGraphs=new Set,this._tooltip=null,this._handleTakeClone=e=>{const t=e.attributes?.plant_id||e.entity_id.replace("sensor.","");this.hass.callService("growspace_manager","take_clone",{mother_plant_id:t}).then(()=>{console.log(`Clone taken from ${e.attributes?.strain||"plant"}`)}).catch(e=>{console.error(`Failed to take clone: ${e.message}`)})},this.clonePlant=(e,t)=>{const i=e.attributes?.plant_id||e.entity_id.replace("sensor.",""),r=t;this.hass.callService("growspace_manager","take_clone",{mother_plant_id:i,num_clones:r}).then(()=>{console.log(`Clone taken from ${e.attributes?.strain||"plant"}`)}).catch(e=>{console.error(`Failed to take clone: ${e.message}`)})}}firstUpdated(){this.dataService=new Xl(this.hass),this.initializeSelectedDevice(),this._fetchHistory()}updated(e){super.updated(e),e.has("selectedDevice")&&this._fetchHistory()}async _fetchHistory(){if(!this.hass||!this.selectedDevice)return;const e=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);if(!e)return;let t=e.name.toLowerCase().replace(/\s+/g,"_");e.overview_entity_id&&(t=e.overview_entity_id.replace("sensor.",""));let i=`binary_sensor.${t}_optimal_conditions`;"cure"===t?i="binary_sensor.cure_optimal_curing":"dry"===t&&(i="binary_sensor.dry_optimal_drying");const r=new Date,o=new Date(r.getTime()-864e5);try{const e=await this.dataService.getHistory(i,o,r);this._historyData=e}catch(e){console.error("Failed to fetch history",e)}}initializeSelectedDevice(){const e=this.dataService.getGrowspaceDevices();if(e.length&&!this.selectedDevice){if(this._config?.default_growspace){const t=e.find(e=>e.device_id===this._config.default_growspace||e.name===this._config.default_growspace);if(t)return void(this.selectedDevice=t.device_id)}this.selectedDevice=e[0].device_id}}static async getConfigElement(){await Promise.resolve().then(function(){return rd});return document.createElement("growspace-manager-card-editor")}static getStubConfig(){return{default_growspace:"4x4",compact:!0}}setConfig(e){if(!e)throw new Error("Invalid configuration");this._config=e,void 0!==this._config.compact&&(this._isCompactView=this._config.compact)}getCardSize(){return 4}_handleDeviceChange(e){const t=e.target;this.selectedDevice=t.value}_handlePlantClick(e){this._plantOverviewDialog={open:!0,plant:e,editedAttributes:{...e.attributes}}}getHaDateTimeString(){const e=this.hass.config.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone;return Yl.now().setZone(e).toFormat("yyyy-LL-dd'T'HH:mm")}_openAddPlantDialog(e,t){const i=this.getHaDateTimeString(),r=this.dataService.getStrainLibrary(),o=r.length>0?r[0].strain:"",a=r.length>0?r[0].phenotype:"";this._addPlantDialog={open:!0,row:e,col:t,strain:o,phenotype:a,veg_start:i,flower_start:i,seedling_start:i,mother_start:i,clone_start:i,dry_start:i,cure_start:i}}async _confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const{row:e,col:t,strain:i,phenotype:r,veg_start:o,flower_start:a,seedling_start:n,mother_start:s,clone_start:l,dry_start:d,cure_start:c}=this._addPlantDialog;try{const o={growspace_id:this.selectedDevice,row:e+1,col:t+1,strain:i,phenotype:r};["veg_start","flower_start","seedling_start","mother_start","clone_start","dry_start","cure_start"].forEach(e=>{const t=this._addPlantDialog[e];t&&(o[e]=Ql.formatDateForBackend(t))}),console.log("Adding plant to growspace:",this.selectedDevice,o),console.log("Adding plant:",o),await this.dataService.addPlant(o),this._addPlantDialog=null}catch(e){console.error("Error adding plant:",e)}}async _updatePlant(){if(!this._plantOverviewDialog)return;const{plant:e,editedAttributes:t}=this._plantOverviewDialog,i={plant_id:e.attributes?.plant_id||e.entity_id.replace("sensor.","")},r=["seedling_start","mother_start","clone_start","veg_start","flower_start","dry_start","cure_start"];["strain","phenotype","row","col",...r].forEach(e=>{if(void 0!==t[e]&&null!==t[e])if(r.includes(e)){const r=Ql.formatDateForBackend(String(t[e]));r&&(i[e]=r)}else i[e]=t[e]});try{await this.dataService.updatePlant(i),this._plantOverviewDialog=null}catch(e){console.error("Error updating plant:",e)}}async _handleDeletePlant(e){if(confirm("Are you sure you want to delete this plant?"))try{await this.dataService.removePlant(e),this._plantOverviewDialog=null}catch(e){console.error("Error deleting plant:",e)}}async _movePlantToNextStage(e){if(!this._plantOverviewDialog?.plant)return void console.error("No plant found in overview dialog");const t=this._plantOverviewDialog.plant,i=t.attributes?.stage;let r="";const o=new Set(["mother","flower","dry","cure"]);if(i&&o.has(i)){"flower"===i?r="dry":"dry"===i?r="cure":"mother"===i?r="clone":(console.error("Unknown stage, cannot move plant",r),r="error");try{const e=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.dataService.harvestPlant(e,r),this._plantOverviewDialog=null}catch(e){console.error("Error moving plant to next stage:",e)}}else alert("Plant must be in mother or flower or dry or cure stage to move. stage is "+i)}async _harvestPlant(e){await this._movePlantToNextStage(e)}async _finishDryingPlant(e){await this._movePlantToNextStage(e)}_openStrainLibraryDialog(){const e=this.dataService.getStrainLibrary();this._strainLibraryDialog={open:!0,view:"browse",strains:e,searchQuery:"",editorState:this._createEmptyEditorState()}}_createEmptyEditorState(){return{strain:"",phenotype:"",breeder:"",type:"",flowering_min:"",flowering_max:"",lineage:"",sex:"",description:"",image:"",image_crop_meta:void 0}}_switchStrainView(e,t){this._strainLibraryDialog&&(this._strainLibraryDialog.view=e,this._strainLibraryDialog.isCropping=!1,"editor"===e&&(this._strainLibraryDialog.editorState=t?{strain:t.strain,phenotype:t.phenotype||"",breeder:t.breeder||"",type:t.type||"",flowering_min:t.flowering_days_min?.toString()||"",flowering_max:t.flowering_days_max?.toString()||"",lineage:t.lineage||"",sex:t.sex||"",description:t.description||"",image:t.image||"",image_crop_meta:t.image_crop_meta,sativa_percentage:t.sativa_percentage,indica_percentage:t.indica_percentage}:this._createEmptyEditorState()),this.requestUpdate())}_handleStrainEditorChange(e,t){this._strainLibraryDialog&&this._strainLibraryDialog.editorState&&(this._strainLibraryDialog.editorState[e]=t,this.requestUpdate())}_toggleCropMode(e){this._strainLibraryDialog&&(this._strainLibraryDialog.isCropping=e,this.requestUpdate())}_toggleImageSelector(e){this._strainLibraryDialog&&(this._strainLibraryDialog.isImageSelectorOpen=e,this.requestUpdate())}_handleSelectLibraryImage(e){if(this._strainLibraryDialog&&this._strainLibraryDialog.editorState){this._strainLibraryDialog.editorState.image=e;const t=this._strainLibraryDialog.strains.find(t=>t.image===e&&!!t.image_crop_meta);t&&t.image_crop_meta?this._strainLibraryDialog.editorState.image_crop_meta={...t.image_crop_meta}:this._strainLibraryDialog.editorState.image_crop_meta=void 0,this._strainLibraryDialog.isImageSelectorOpen=!1,this.requestUpdate()}}_toggleLightCycle(){this._lightCycleCollapsed=!this._lightCycleCollapsed}_toggleEnvGraph(e){const t=new Set(this._activeEnvGraphs);t.has(e)?t.delete(e):t.add(e),this._activeEnvGraphs=t,this.requestUpdate()}_handleGraphHover(e,t,i,r,o){const a=e.clientX-r.left,n=r.width,s=new Date,l=new Date(s.getTime()-864e5).getTime(),d=l+a/n*(s.getTime()-l);let c=i[0],h=Math.abs(d-c.time);for(let e=1;e<i.length;e++){const t=Math.abs(d-i[e].time);t<h&&(h=t,c=i[e])}const p=new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).toLowerCase();let u=`${c.value} ${o}`;"state"===o&&(u=1===c.value?"ON":"OFF"),this._tooltip={id:t,x:a,time:p,value:u}}renderEnvGraph(e,t,i,r){if(!this._historyData||0===this._historyData.length)return q``;const o=[...this._historyData].sort((e,t)=>new Date(e.last_changed).getTime()-new Date(t.last_changed).getTime()),a=new Date,n=new Date(a.getTime()-864e5),s=[];if(o.forEach(t=>{const i=new Date(t.last_changed).getTime();if(i<n.getTime())return;const r=((e,t)=>{if(e&&e.attributes)return void 0!==e.attributes[t]?e.attributes[t]:e.attributes.observations&&"object"==typeof e.attributes.observations?e.attributes.observations[t]:void 0})(t,e);void 0===r||isNaN(parseFloat(r))||s.push({time:i,value:parseFloat(r)})}),s.length<2)return q``;const l=Math.min(...s.map(e=>e.value)),d=Math.max(...s.map(e=>e.value)),c=d-l||1,h=l-.1*c,p=d+.1*c-h,u=s.map(e=>[(e.time-n.getTime())/864e5*1e3,100-(e.value-h)/p*100]),m=`M ${u.map(e=>`${e[0]},${e[1]}`).join(" L ")}`;return q`
      <div class="gs-light-cycle-card" style="margin-top: 12px; border: 1px solid ${t}40;">
         <div class="gs-light-header-row" @click=${()=>this._toggleEnvGraph(e)}>
             <div class="gs-light-title" style="font-size: 1.2rem;">
                 <div class="gs-icon-box" style="color: ${t}; background: ${t}10; border-color: ${t}30; width: 36px; height: 36px;">
                      <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Co}"></path></svg>
                 </div>
                 <div>
                    <div>${i}</div>
                    <div class="gs-light-subtitle">24H HISTORY • ${l.toFixed(1)} - ${d.toFixed(1)} ${r}</div>
                 </div>
             </div>
             <div style="opacity: 0.7;">
                <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mo}"></path></svg>
             </div>
         </div>

         <div class="gs-chart-container" style="height: 100px;"
              @mousemove=${t=>{const i=t.currentTarget.getBoundingClientRect();this._handleGraphHover(t,e,s,i,r)}}
              @mouseleave=${()=>this._tooltip=null}>

             ${this._tooltip&&this._tooltip.id===e?q`
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
                 <path class="chart-line" d="${m}" style="stroke: ${t};" />
                 <path class="chart-gradient-fill" d="${m} V 100 H 0 Z" style="fill: url(#grad-${e});" />
             </svg>
             <div class="chart-markers">
                <span>-24H</span>
                <span>NOW</span>
             </div>
         </div>
      </div>
    `}_setStrainSearchQuery(e){this._strainLibraryDialog&&(this._strainLibraryDialog.searchQuery=e,this.requestUpdate())}_toggleAddStrainForm(){}_promptClearAll(){}_cancelClearAll(){}async _addStrain(){if(!this._strainLibraryDialog?.editorState?.strain)return;const e=this._strainLibraryDialog.editorState,t={strain:e.strain,phenotype:e.phenotype,breeder:e.breeder,type:e.type,flowering_days_min:e.flowering_min?parseInt(e.flowering_min):void 0,flowering_days_max:e.flowering_max?parseInt(e.flowering_max):void 0,lineage:e.lineage,sex:e.sex,description:e.description,image:e.image,image_crop_meta:e.image_crop_meta,sativa_percentage:e.sativa_percentage,indica_percentage:e.indica_percentage};try{await this.dataService.addStrain(t);const i=`${e.strain}|${e.phenotype||"default"}`,r={key:i,strain:e.strain,phenotype:e.phenotype,breeder:e.breeder,type:e.type,flowering_days_min:t.flowering_days_min,flowering_days_max:t.flowering_days_max,lineage:e.lineage,sex:e.sex,description:e.description,image:e.image,image_crop_meta:e.image_crop_meta,sativa_percentage:e.sativa_percentage,indica_percentage:e.indica_percentage};this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e.key!==i),this._strainLibraryDialog.strains.push(r),this._switchStrainView("browse")}catch(e){console.error("Error adding strain:",e)}}async _removeStrain(e){if(this._strainLibraryDialog)try{const t=e.split("|"),i=t[0],r=t.length>1&&"default"!==t[1]?t[1]:void 0;await this.dataService.removeStrain(i,r),this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(t=>t.key!==e),this.requestUpdate()}catch(e){console.error("Error removing strain:",e)}}async _clearStrains(){await this.dataService.clearStrainLibrary(),this._strainLibraryDialog&&(this._strainLibraryDialog.strains=[],this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate())}async _handleExportLibrary(){const e=await this.hass.connection.subscribeEvents(t=>{t.data&&t.data.url&&(this._downloadFile(t.data.url),e())},"growspace_manager_strain_library_exported");try{await this.hass.callService("growspace_manager","export_strain_library")}catch(t){console.error("Failed to call export service",t),e()}}_downloadFile(e){const t=document.createElement("a");t.style.display="none",t.href=e,t.download=e.split("/").pop()||"export.zip",document.body.appendChild(t),t.click(),document.body.removeChild(t)}_openImportDialog(){this._strainLibraryDialog&&(this._strainLibraryDialog.importDialog={open:!0,replace:!1},this.requestUpdate())}_handleImportDialogChange(e){this._strainLibraryDialog&&this._strainLibraryDialog.importDialog&&(void 0!==e.open&&(this._strainLibraryDialog.importDialog.open=e.open),void 0!==e.replace&&(this._strainLibraryDialog.importDialog.replace=e.replace),this.requestUpdate())}async _performImport(){if(!this._strainLibraryDialog?.importDialog)return;const e=this._strainLibraryDialog.importDialog.replace,t=document.createElement("input");t.type="file",t.accept=".zip",t.onchange=async t=>{const i=t.target.files?.[0];if(i)try{const t=await this.dataService.importStrainLibrary(i,e);alert(`Import successful! ${t.imported_count||""} strains imported.`),this._strainLibraryDialog&&this._strainLibraryDialog.importDialog&&(this._strainLibraryDialog.importDialog.open=!1),this.requestUpdate()}catch(e){console.error("Import failed:",e),alert(`Import failed: ${e.message}`)}},t.click()}updateGrid(){this.dataService=new Xl(this.hass),this.requestUpdate()}_handleDragStart(e,t){this._draggedPlant=t,e.dataTransfer?.setData("text/plain",JSON.stringify({id:t.entity_id}));e.target.classList.add("dragging")}_handleDragEnd(e){e.target.classList.remove("dragging")}_handleDragOver(e){e.preventDefault()}async _handleDrop(e,t,i,r){if(e.preventDefault(),!this._draggedPlant||!this.selectedDevice)return;const o=this._draggedPlant;this._draggedPlant=null;try{if(r){const e=o.attributes.plant_id||o.entity_id.replace("sensor.",""),t=r.attributes.plant_id||r.entity_id.replace("sensor.","");await this.hass.callService("growspace_manager","switch_plants",{plant1_id:e,plant2_id:t}),this.updateGrid()}else await this._movePlant(o,t,i)}catch(e){console.error("Error during drag-and-drop:",e)}}async _movePlant(e,t,i){try{const r=e.attributes?.plant_id||e.entity_id.replace("sensor.","");await this.dataService.updatePlant({plant_id:r,row:t,col:i})}catch(e){console.error("Error moving plant:",e)}}_moveClonePlant(e,t){this.hass.callService("growspace_manager","move_clone",{plant_id:e.attributes.plant_id,target_growspace_id:t}).then(()=>{console.log(`Moved clone ${e.attributes.friendly_name} to ${t}`),this._plantOverviewDialog=null}).catch(e=>{console.error("Error moving clone:",e)})}_openConfigDialog(){this._configDialog={open:!0,currentTab:"add_growspace",addGrowspaceData:{name:"",rows:3,plants_per_row:3,notification_service:""},environmentData:{selectedGrowspaceId:"",temp_sensor:"",humidity_sensor:"",vpd_sensor:"",co2_sensor:"",light_sensor:"",fan_switch:""},globalData:{weather_entity:"",lung_room_temp:"",lung_room_humidity:""}}}_handleAddGrowspaceSubmit(){if(!this._configDialog)return;const e=this._configDialog.addGrowspaceData;e.name?this.dataService.addGrowspace(e).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(e=>alert(`Error: ${e.message}`)):alert("Name is required")}_handleEnvSubmit(){if(!this._configDialog)return;const e=this._configDialog.environmentData;e.selectedGrowspaceId&&e.temp_sensor&&e.humidity_sensor&&e.vpd_sensor?this.dataService.configureGrowspaceSensors({growspace_id:e.selectedGrowspaceId,temperature_sensor:e.temp_sensor,humidity_sensor:e.humidity_sensor,vpd_sensor:e.vpd_sensor,co2_sensor:e.co2_sensor||void 0,light_sensor:e.light_sensor||void 0,fan_switch:e.fan_switch||void 0}).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(e=>alert(`Error: ${e.message}`)):alert("Growspace and required sensors (Temp, Hum, VPD) are mandatory")}_handleGlobalSubmit(){if(!this._configDialog)return;const e=this._configDialog.globalData;this.dataService.configureGlobalSettings(e).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(e=>alert(`Error: ${e.message}`))}_openGrowMasterDialog(){this.selectedDevice&&(this._growMasterDialog={open:!0,growspaceId:this.selectedDevice,userQuery:"",isLoading:!1,response:null,mode:"single"})}async _handleAskAdvice(){if(this._growMasterDialog&&this._growMasterDialog.userQuery){this._growMasterDialog.isLoading=!0,this._growMasterDialog.response=null,this.requestUpdate();try{const e=await this.dataService.askGrowAdvice(this._growMasterDialog.growspaceId,this._growMasterDialog.userQuery);this._growMasterDialog&&(e?.response?.response&&"string"==typeof e.response.response?this._growMasterDialog.response=e.response.response:e?.response&&"string"==typeof e.response?this._growMasterDialog.response=e.response:this._growMasterDialog.response=JSON.stringify(e,null,2))}catch(e){this._growMasterDialog&&(this._growMasterDialog.response=`Error: ${e.message||"Failed to get advice."}`)}finally{this._growMasterDialog&&(this._growMasterDialog.isLoading=!1,this.requestUpdate())}}}async _handleAnalyzeAll(){if(this._growMasterDialog){this._growMasterDialog.isLoading=!0,this._growMasterDialog.response=null,this._growMasterDialog.mode="all",this.requestUpdate();try{const e=await this.dataService.analyzeAllGrowspaces();this._growMasterDialog&&(e?.response?.response&&"string"==typeof e.response.response?this._growMasterDialog.response=e.response.response:e?.response&&"string"==typeof e.response?this._growMasterDialog.response=e.response:this._growMasterDialog.response=JSON.stringify(e,null,2))}catch(e){this._growMasterDialog&&(this._growMasterDialog.response=`Error: ${e.message||"Failed to get advice."}`)}finally{this._growMasterDialog&&(this._growMasterDialog.isLoading=!1,this.requestUpdate())}}}async _handleGetStrainRecommendation(){if(this._strainRecommendationDialog&&this._strainRecommendationDialog.userQuery){this._strainRecommendationDialog.isLoading=!0,this._strainRecommendationDialog.response=null,this.requestUpdate();try{const e=await this.dataService.getStrainRecommendation(this._strainRecommendationDialog.userQuery);this._strainRecommendationDialog&&(e?.response?.response&&"string"==typeof e.response.response?this._strainRecommendationDialog.response=e.response.response:e?.response&&"string"==typeof e.response?this._strainRecommendationDialog.response=e.response:this._strainRecommendationDialog.response=JSON.stringify(e,null,2))}catch(e){this._strainRecommendationDialog&&(this._strainRecommendationDialog.response=`Error: ${e.message||"Failed to get recommendation."}`)}finally{this._strainRecommendationDialog&&(this._strainRecommendationDialog.isLoading=!1,this.requestUpdate())}}}_openStrainRecommendationDialog(){this._strainRecommendationDialog={open:!0,userQuery:"",isLoading:!1,response:null}}render(){if(!this.hass)return q`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;this.dataService=new Xl(this.hass);const e=this.dataService.getGrowspaceDevices();if(!e.length)return q`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;if(!this._defaultApplied&&this._config?.default_growspace){const t=e.find(e=>e.device_id===this._config.default_growspace||e.name===this._config.default_growspace);t&&(this.selectedDevice=t.device_id),this._defaultApplied=!0}this.selectedDevice&&e.find(e=>e.device_id===this.selectedDevice)||(this.selectedDevice=e[0].device_id);const t=e.find(e=>e.device_id===this.selectedDevice);if(!t)return q`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;const i=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;i&&Object.entries(i).forEach(([e,t])=>{});const r=Ql.calculateEffectiveRows(t),{grid:o}=Ql.createGridLayout(t.plants,r,t.plants_per_row),a=t.plants_per_row>6,n=this.dataService.getStrainLibrary();return q`
      <ha-card class=${a?"wide-growspace":""}>
        <div class="unified-growspace-card">
          ${this.renderHeader(e)}
          ${this.renderGrowspaceHeader(t)}
          ${this.renderGrid(o,r,t.plants_per_row,n)}
        </div>
      </ha-card>
      
      ${this.renderDialogs()}
    `}renderGrowspaceHeader(e){const t=Ql.getDominantStage(e.plants),i=this.dataService.getGrowspaceDevices();let r=e.name.toLowerCase().replace(/\s+/g,"_");e.overview_entity_id&&(r=e.overview_entity_id.replace("sensor.",""));let o=`binary_sensor.${r}_optimal_conditions`;const a="cure"===r,n="dry"===r;a?o="binary_sensor.cure_optimal_curing":n&&(o="binary_sensor.dry_optimal_drying");const s=this.hass.states[o],l=(e,t)=>{if(e&&e.attributes)return void 0!==e.attributes[t]?e.attributes[t]:e.attributes.observations&&"object"==typeof e.attributes.observations?e.attributes.observations[t]:void 0},d=l(s,"temperature"),c=l(s,"humidity"),h=l(s,"vpd"),p=a||n,u=p?void 0:l(s,"co2"),m=l(s,"is_lights_on"),f=!p&&null!=m,v=!0===m;let g="",y="--:--",b="--:--",x="",w="";const _=e.plants.some(e=>"flower"===e.attributes.stage),k=_?"12/12 Cycle":"18/6 Cycle";let $=[];if(this._historyData&&this._historyData.length>0){const e=[...this._historyData].sort((e,t)=>new Date(e.last_changed).getTime()-new Date(t.last_changed).getTime()),t=new Date,i=new Date(t.getTime()-864e5),r=1e3,o=100,a=[];let n=e.length>0?!0!==l(e[0],"is_lights_on"):v;e.forEach(e=>{const t=new Date(e.last_changed).getTime(),r=!0===l(e,"is_lights_on");t>=i.getTime()&&$.push({time:t,state:r})}),n=$.length>0?!$[0].state:v,a.push([0,n?0:o]),$.forEach(e=>{const t=(e.time-i.getTime())/864e5*r;a.push([t,n?0:o]),n=e.state,a.push([t,n?0:o])}),a.push([r,n?0:o]),g=`M ${a.map(e=>`${e[0]},${e[1]}`).join(" L ")}`;const s=[...e].reverse(),d=s.find(e=>!0===l(e,"is_lights_on"));if(d){const e=new Date(d.last_changed);y=e.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).replace(/ [AP]M/,""),x=e.toLocaleTimeString([],{hour12:!0}).slice(-2)}const c=s.find(e=>!1===l(e,"is_lights_on"));if(c){const e=new Date(c.last_changed);b=e.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).replace(/ [AP]M/,""),w=e.toLocaleTimeString([],{hour12:!0}).slice(-2)}}return q`
      <div class="gs-stats-container">
         <div class="gs-header-top">
            <div class="gs-title-group">
               <!-- Title as Dropdown if no default is set -->
               ${this._config?.default_growspace?q`
                 <h3 class="gs-title">${e.name}</h3>
               `:q`
                 <select class="growspace-select-header" .value=${this.selectedDevice||""} @change=${this._handleDeviceChange}>
                    ${i.map(e=>q`<option value="${e.device_id}">${e.name}</option>`)}
                 </select>
               `}

               ${t?q`
               <div class="gs-stage-chip">
                 <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ql.getPlantStageIcon(t.stage)}"></path></svg>
                 ${t.stage.charAt(0).toUpperCase()+t.stage.slice(1)} • Day ${t.days}
               </div>
               `:""}
            </div>

            <div class="gs-stats-chips">
               ${this._isCompactView?"":q`
                   ${void 0!==d?q`
                      <div class="stat-chip ${this._activeEnvGraphs.has("temperature")?"active":""}"
                           @click=${()=>this._toggleEnvGraph("temperature")}>
                        <svg viewBox="0 0 24 24"><path d="${Eo}"></path></svg>${d}°C
                      </div>`:""}
                   ${void 0!==c?q`
                      <div class="stat-chip ${this._activeEnvGraphs.has("humidity")?"active":""}"
                           @click=${()=>this._toggleEnvGraph("humidity")}>
                        <svg viewBox="0 0 24 24"><path d="${"M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z"}"></path></svg>${c}%
                      </div>`:""}
                   ${void 0!==h?q`
                      <div class="stat-chip ${this._activeEnvGraphs.has("vpd")?"active":""}"
                           @click=${()=>this._toggleEnvGraph("vpd")}>
                        <svg viewBox="0 0 24 24"><path d="${"M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20M6.5 18H18.5Q19.55 18 20.27 17.27 21 16.55 21 15.5 21 14.45 20.27 13.73 19.55 13 18.5 13H17V11Q17 8.93 15.54 7.46 14.08 6 12 6 9.93 6 8.46 7.46 7 8.93 7 11H6.5Q5.05 11 4.03 12.03 3 13.05 3 14.5 3 15.95 4.03 17 5.05 18 6.5 18M12 12Z"}"></path></svg>${h} kPa
                      </div>`:""}
                   ${void 0!==u?q`
                      <div class="stat-chip ${this._activeEnvGraphs.has("co2")?"active":""}"
                           @click=${()=>this._toggleEnvGraph("co2")}>
                        <svg viewBox="0 0 24 24"><path d="${"M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z"}"></path></svg>${u} ppm
                      </div>`:""}
                `}

                <div style="position:relative;">
                    <div id="menu-anchor"
                         class="stat-chip"
                         @click=${()=>this._isMenuOpen=!this._isMenuOpen}
                         title="Menu">
                        <svg viewBox="0 0 24 24"><path d="${yo}"></path></svg>
                    </div>
                    <md-menu
                        anchor="menu-anchor"
                        .open=${this._isMenuOpen}
                        @closed=${()=>this._isMenuOpen=!1}
                    >
                        <md-menu-item @click=${this._openConfigDialog}>
                            <div slot="headline">Config</div>
                        </md-menu-item>
                        <md-menu-item @click=${()=>{this._isCompactView=!this._isCompactView,this.requestUpdate()}}>
                            <div slot="headline">Compact</div>
                            <md-switch slot="end" .selected=${this._isCompactView}></md-switch>
                        </md-menu-item>
                        <md-menu-item @click=${this._openStrainLibraryDialog}>
                            <div slot="headline">Strains</div>
                        </md-menu-item>
                        <md-menu-item @click=${this._openGrowMasterDialog}>
                            <div slot="headline">Ask AI</div>
                        </md-menu-item>
                    </md-menu>
                </div>
            </div>
         </div>

         <!-- Nested Light Cycle Card -->
         ${!this._isCompactView&&f?q`
         <div class="gs-light-cycle-card ${this._lightCycleCollapsed?"collapsed":""}">
            <div class="gs-light-header-row" @click=${()=>this._toggleLightCycle()}>
                <div class="gs-light-title">
                    <div class="gs-icon-box">
                       <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Oo}"></path></svg>
                    </div>
                    <div>
                       <div>Light Cycle</div>
                       ${this._lightCycleCollapsed?"":q`<div class="gs-light-subtitle">24H HISTORY</div>`}
                    </div>
                </div>

                ${s?q`
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div>
                        <div class="light-status-chip ${v?"on":"off"}">
                           <div class="light-status-text">
                               <div class="status-dot"></div>
                               ${v?"ON":"OFF"}
                           </div>
                        </div>
                        ${this._lightCycleCollapsed?"":q`<div class="target-cycle-text">Target: ${k}</div>`}
                    </div>
                    <div class="rotate-icon ${this._lightCycleCollapsed?"":"expanded"}" style="opacity: 0.7;">
                        <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mo}"></path></svg>
                    </div>
                </div>
                `:""}
            </div>

            ${this._lightCycleCollapsed?"":q`
            <div class="gs-chart-container"
                @mousemove=${e=>{const t=e.currentTarget.getBoundingClientRect(),i=new Date,r=new Date(i.getTime()-864e5),o=$.map(e=>({time:e.time,value:e.state?1:0}));0===o.length||(o[0].time,r.getTime()),this._handleGraphHover(e,"light-cycle",o,t,"state")}}
                @mouseleave=${()=>this._tooltip=null}
            >
                ${this._tooltip&&"light-cycle"===this._tooltip.id?q`
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
                            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Oo}"></path></svg>
                        </div>
                        <div class="ac-text">
                            <h4>LIGHT ON</h4>
                            <div class="time">${y} <span>${x}</span></div>
                        </div>
                    </div>
                    <div class="ac-arrow">
                        <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${fo}"></path></svg>
                    </div>
                </div>

                <div class="action-card">
                    <div class="ac-content">
                        <div class="ac-icon off">
                            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Io}"></path></svg>
                        </div>
                        <div class="ac-text">
                            <h4>LIGHT OFF</h4>
                            <div class="time">${b} <span>${w}</span></div>
                        </div>
                    </div>
                    <div class="ac-arrow">
                         <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${fo}"></path></svg>
                    </div>
                </div>
            </div>
            `}
         </div>
         `:""}

         <!-- Active Environmental Graphs -->
         ${this._isCompactView?"":q`
            ${this._activeEnvGraphs.has("temperature")?this.renderEnvGraph("temperature","#FF5722","Temperature","°C"):""}
            ${this._activeEnvGraphs.has("humidity")?this.renderEnvGraph("humidity","#2196F3","Humidity","%"):""}
            ${this._activeEnvGraphs.has("vpd")?this.renderEnvGraph("vpd","#9C27B0","VPD","kPa"):""}
            ${this._activeEnvGraphs.has("co2")?this.renderEnvGraph("co2","#90A4AE","CO2","ppm"):""}
         `}
      </div>
    `}renderHeader(e){return this._isCompactView||this._config?.title?(e.find(e=>e.device_id===this.selectedDevice),q`
      <div class="header">
        ${this._config?.title?q`<h2 class="header-title">${this._config.title}</h2>`:""}
        
        ${this._isCompactView?q`
        <div class="selector-container">
          ${this._config?.default_growspace?q`
            <label for="device-select">Growspace:</label>
            <!-- Even if default is set, user wants dropdown in compact mode -->
            <select
              id="device-select"
              class="growspace-select"
              .value=${this.selectedDevice||""}
              @change=${this._handleDeviceChange}
            >
              ${e.map(e=>q`<option value="${e.device_id}">${e.name}</option>`)}
            </select>
          `:q`
            <label for="device-select">Growspace:</label>
            <select 
              id="device-select" 
              class="growspace-select"
              .value=${this.selectedDevice||""} 
              @change=${this._handleDeviceChange}
            >
              ${e.map(e=>q`<option value="${e.device_id}">${e.name}</option>`)}
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
              <path d="${"M4,2H6V4C6,5.44 6.68,6.61 7.88,7.78C8.74,8.61 9.89,9.41 11.09,10.2L9.26,11.39C8.27,10.72 7.31,10 6.5,9.21C5.07,7.82 4,6.1 4,4V2M18,2H20V4C20,6.1 18.93,7.82 17.5,9.21C16.09,10.59 14.29,11.73 12.54,12.84C10.79,13.96 9.09,15.05 7.88,16.22C6.68,17.39 6,18.56 6,20V22H4V20C4,17.9 5.07,16.18 6.5,14.79C7.91,13.41 9.71,12.27 11.46,11.16C13.21,10.04 14.91,8.95 16.12,7.78C17.32,6.61 18,5.44 18,4V2M14.74,12.61C15.73,13.28 16.69,14 17.5,14.79C18.93,16.18 20,17.9 20,20V22H18V20C18,18.56 17.32,17.39 16.12,16.22C15.26,15.39 14.11,14.59 12.91,13.8L14.74,12.61M7,3H17V4L16.94,4.5H7.06L7,4V3M7.68,6H16.32C16.08,6.34 15.8,6.69 15.42,7.06L14.91,7.5H9.07L8.58,7.06C8.2,6.69 7.92,6.34 7.68,6M9.09,16.5H14.93L15.42,16.94C15.8,17.31 16.08,17.66 16.32,18H7.68C7.92,17.66 8.2,17.31 8.58,16.94L9.09,16.5M7.06,19.5H16.94L17,20V21H7V20L7.06,19.5Z"}"></path>
            </svg>
            Strains
          </button>
        </div>
        `:""}
      </div>
    `):q``}renderGrid(e,t,i,r){const o=i>5,a=o?"":`grid-template-columns: repeat(${i}, minmax(0, 1fr)); grid-template-rows: repeat(${t}, 1fr);`;return q`
      <div class="grid ${this._isCompactView?"compact":""} ${o?"force-list-view":""}"
           style="${a}">
        ${e.flat().map((e,t)=>{const o=Math.floor(t/i)+1,a=t%i+1;return e?this.renderPlantSlot(e,o,a,r):this.renderEmptySlot(o,a)})}
      </div>
    `}renderEmptySlot(e,t){return q`
      <div 
        class="plant-card-empty"
        style="grid-row: ${e}; grid-column: ${t}" 
        @click=${()=>this._openAddPlantDialog(e-1,t-1)}
        @dragover=${this._handleDragOver}
        @drop=${i=>this._handleDrop(i,e,t,null)}
      >
        <div class="plant-header">
          <svg style="width: 48px; height: 48px; opacity: 0.5; fill: currentColor;" viewBox="0 0 24 24">
            <path d="${So}"></path>
          </svg>
        </div>
        <div style="font-weight: 500; opacity: 0.8;">Add Plant</div>
      </div>
    `}renderPlantSlot(e,t,i,r){const o=Ql.getPlantStageColor(e.state),a=e.attributes?.strain,n=e.attributes?.phenotype;let s;if(a){const e=r.find(e=>e.strain===a&&e.phenotype===n);if(e&&e.image)s=e.image;else{const e=r.find(e=>e.strain===a&&(!e.phenotype||"default"===e.phenotype));if(e&&e.image)s=e.image;else if(!s){const e=r.find(e=>e.strain===a&&e.image);e&&(s=e.image)}}}const l=s?`background-image: url('${s}');`:"";return q`
      <div 
        class="plant-card-rich"
        style="grid-row: ${t}; grid-column: ${i}; --stage-color: ${o}" 
        draggable="true"
        @dragstart=${t=>this._handleDragStart(t,e)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${r=>this._handleDrop(r,t,i,e)}
        @click=${()=>this._handlePlantClick(e)}
      >
        ${s?q`<div class="plant-card-bg" style="${l}"></div>
                          <div class="plant-card-overlay"></div>`:""}

        <div class="plant-card-content">
            <div class="pc-info">
                <div class="pc-strain-name" title="${e.attributes?.strain||""}">
                    ${e.attributes?.strain||"Unknown Strain"}
                </div>
                ${e.attributes?.phenotype?q`<div class="pc-pheno">${e.attributes.phenotype}</div>`:""}
                <div class="pc-stage">
                    ${e.state||"Unknown"}
                </div>
            </div>

            <div class="pc-stats">
               ${this.renderPlantDaysRich(e)}
            </div>
        </div>
      </div>
    `}renderPlantDaysRich(e){const t=[{days:e.attributes?.seedling_days,icon:Do,title:"Seedling",stage:"seedling"},{days:e.attributes?.mother_days,icon:Do,title:"Mother",stage:"mother"},{days:e.attributes?.clone_days,icon:Do,title:"Clone",stage:"clone"},{days:e.attributes?.veg_days,icon:Do,title:"Veg",stage:"vegetative"},{days:e.attributes?.flower_days,icon:wo,title:"Flower",stage:"flower"},{days:e.attributes?.dry_days,icon:_o,title:"Dry",stage:"dry"},{days:e.attributes?.cure_days,icon:po,title:"Cure",stage:"cure"}].filter(e=>void 0!==e.days&&null!==e.days),i=t.filter(e=>e.days),r=(e.state||"").toLowerCase(),o="veg"===r?"vegetative":r;return q`
        ${i.map(e=>{const t=Ql.getPlantStageColor(e.stage),i=e.stage===o;return q`
                <div class="pc-stat-item ${i?"current-stage":""}">
                    <svg style="color: ${t};" viewBox="0 0 24 24"><path d="${e.icon}"></path></svg>
                    <div class="pc-stat-text">${e.days}d</div>
                </div>
            `})}
    `}_renderGrowMasterDialogWrapper(){if(!this._growMasterDialog)return"";let e,t=!1;if(this.selectedDevice&&this.hass){const e=this.selectedDevice,i=[`binary_sensor.${e}_plants_under_stress`,`binary_sensor.${e}_stress`,`binary_sensor.growspace_manager_${e}_stress`];for(const e of i){const i=this.hass.states[e];if(i&&"on"===i.state){t=!0;break}}}if(this.hass){const t=this.hass.states["sensor.growspace_manager"];t&&t.attributes&&t.attributes.ai_settings&&(e=t.attributes.personality||t.attributes.ai_settings.personality)}return ed.renderGrowMasterDialog(this._growMasterDialog,t,e,{onClose:()=>this._growMasterDialog=null,onQueryChange:e=>{this._growMasterDialog&&(this._growMasterDialog.userQuery=e,this.requestUpdate())},onAnalyze:()=>this._handleAskAdvice(),onAnalyzeAll:()=>this._handleAnalyzeAll()})}renderDialogs(){const e=this.dataService?.getStrainLibrary()||[],t={},i=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;i&&Object.entries(i).forEach(([e,i])=>{t[e]=i});const r=this.dataService.getGrowspaceDevices().find(e=>e.device_id===this.selectedDevice);return q`
      ${ed.renderAddPlantDialog(this._addPlantDialog,e,r?.name??"",{onClose:()=>this._addPlantDialog=null,onConfirm:()=>this._confirmAddPlant(),onStrainChange:t=>{if(this._addPlantDialog){this._addPlantDialog.strain=t;const i=e.find(e=>e.strain===t);i&&i.phenotype?this._addPlantDialog.phenotype=i.phenotype:this._addPlantDialog.phenotype="",this.requestUpdate()}},onPhenotypeChange:e=>{this._addPlantDialog&&(this._addPlantDialog.phenotype=e)},onVegStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.veg_start=e)},onFlowerStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.flower_start=e)},onSeedlingStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.seedling_start=e)},onMotherStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.mother_start=e)},onCloneStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.clone_start=e)},onDryStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.dry_start=e)},onCureStartChange:e=>{this._addPlantDialog&&(this._addPlantDialog.cure_start=e)},onRowChange:e=>{if(this._addPlantDialog){const t=parseInt(e);!isNaN(t)&&t>0&&(this._addPlantDialog.row=t-1,this.requestUpdate())}},onColChange:e=>{if(this._addPlantDialog){const t=parseInt(e);!isNaN(t)&&t>0&&(this._addPlantDialog.col=t-1,this.requestUpdate())}}})}

      ${ed.renderPlantOverviewDialog(this._plantOverviewDialog,t,{onClose:()=>this._plantOverviewDialog=null,onUpdate:()=>{this._updatePlant()},onDelete:e=>{this._handleDeletePlant(e)},onHarvest:e=>{this._harvestPlant(e)},onClone:(e,t)=>{this.clonePlant(e,t)},onTakeClone:(e,t)=>{this.clonePlant(e,t)},onMoveClone:(e,t)=>{this.hass.callService("growspace_manager","move_clone",{plant_id:e.attributes.plant_id,target_growspace_id:t}).then(()=>{console.log(`Clone ${e.attributes.friendly_name} moved to ${t}`),this._plantOverviewDialog=null}).catch(e=>{console.error("Error moving clone:",e)})},onFinishDrying:e=>{this._finishDryingPlant(e)},_harvestPlant:this._harvestPlant.bind(this),_finishDryingPlant:this._finishDryingPlant.bind(this),onAttributeChange:(e,t)=>{this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes[e]=t)}})}

      ${ed.renderStrainLibraryDialog(this._strainLibraryDialog,{onClose:()=>this._strainLibraryDialog=null,onAddStrain:()=>this._addStrain(),onRemoveStrain:e=>this._removeStrain(e),onClearAll:()=>this._clearStrains(),onEditorChange:(e,t)=>this._handleStrainEditorChange(e,t),onSwitchView:(e,t)=>this._switchStrainView(e,t),onSearch:e=>this._setStrainSearchQuery(e),onToggleCropMode:e=>this._toggleCropMode(e),onToggleImageSelector:e=>this._toggleImageSelector(e),onSelectLibraryImage:e=>this._handleSelectLibraryImage(e),onExportStrains:()=>this._handleExportLibrary(),onOpenImportDialog:()=>this._openImportDialog(),onImportDialogChange:e=>this._handleImportDialogChange(e),onConfirmImport:()=>this._performImport(),onGetRecommendation:()=>this._openStrainRecommendationDialog()})}

      ${ed.renderConfigDialog(this._configDialog,t,{onClose:()=>this._configDialog=null,onSwitchTab:e=>{this._configDialog&&(this._configDialog.currentTab=e,this.requestUpdate())},onAddGrowspaceChange:(e,t)=>{this._configDialog&&(this._configDialog.addGrowspaceData[e]=t,this.requestUpdate())},onAddGrowspaceSubmit:()=>this._handleAddGrowspaceSubmit(),onEnvChange:(e,t)=>{this._configDialog&&(this._configDialog.environmentData[e]=t,this.requestUpdate())},onEnvSubmit:()=>this._handleEnvSubmit(),onGlobalChange:(e,t)=>{this._configDialog&&(this._configDialog.globalData[e]=t,this.requestUpdate())},onGlobalSubmit:()=>this._handleGlobalSubmit()})}

    ${this._renderGrowMasterDialogWrapper()}

      ${ed.renderStrainRecommendationDialog(this._strainRecommendationDialog,{onClose:()=>this._strainRecommendationDialog=null,onQueryChange:e=>{this._strainRecommendationDialog&&(this._strainRecommendationDialog.userQuery=e,this.requestUpdate())},onGetRecommendation:()=>this._handleGetStrainRecommendation()})}
    `}};td.styles=[Kl,s`
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
      md-dialog {
        --md-dialog-container-color: transparent; /* Transparent base for glass effect */
        min-width: 400px;
        max-width: 90vw;
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
    `],e([me(),t("design:type",Object)],td.prototype,"_addPlantDialog",void 0),e([me(),t("design:type",Object)],td.prototype,"_defaultApplied",void 0),e([me(),t("design:type",Object)],td.prototype,"_plantOverviewDialog",void 0),e([me(),t("design:type",Object)],td.prototype,"_strainLibraryDialog",void 0),e([me(),t("design:type",Object)],td.prototype,"_configDialog",void 0),e([me(),t("design:type",Object)],td.prototype,"_growMasterDialog",void 0),e([me(),t("design:type",Object)],td.prototype,"_strainRecommendationDialog",void 0),e([me(),t("design:type",Object)],td.prototype,"selectedDevice",void 0),e([me(),t("design:type",Object)],td.prototype,"_draggedPlant",void 0),e([me(),t("design:type",Boolean)],td.prototype,"_isCompactView",void 0),e([me(),t("design:type",Boolean)],td.prototype,"_isMenuOpen",void 0),e([me(),t("design:type",Object)],td.prototype,"_historyData",void 0),e([me(),t("design:type",Boolean)],td.prototype,"_lightCycleCollapsed",void 0),e([me(),t("design:type",Set)],td.prototype,"_activeEnvGraphs",void 0),e([me(),t("design:type",Object)],td.prototype,"_tooltip",void 0),e([ue({attribute:!1}),t("design:type",Object)],td.prototype,"hass",void 0),e([ue({attribute:!1}),t("design:type",Object)],td.prototype,"_config",void 0),td=e([ce("growspace-manager-card")],td);let id=class extends le{constructor(){super(...arguments),this._growspaceOptions=[]}setConfig(e){this._config=e,this._loadGrowspaces()}updated(e){e.has("hass")&&this.hass&&(this._loadGrowspaces(),this._subscribeToSensorUpdates())}disconnectedCallback(){super.disconnectedCallback(),this._unsubStateChanged&&(this._unsubStateChanged(),this._unsubStateChanged=void 0)}_subscribeToSensorUpdates(){this.hass&&!this._unsubStateChanged&&(this._unsubStateChanged=this.hass.connection.subscribeEvents(e=>{const t=e.data.new_state;"sensor.growspaces_list"===t?.entity_id&&(Array.isArray(t.attributes?.growspaces)?this._growspaceOptions=t.attributes.growspaces:this._growspaceOptions=[])},"state_changed"))}_loadGrowspaces(){if(!this.hass)return;const e=this.hass.states["sensor.growspaces_list"];if(e&&e.attributes?.growspaces){const t=e.attributes.growspaces;this._growspaceOptions=Object.values(t)}else this._growspaceOptions=[]}render(){return this._config?q`
      <div class="form-group">
        <label>Default Growspace</label>
        <select
          .value=${this._config.default_growspace??""}
          @change=${e=>this._valueChanged("default_growspace",e.target.value)}
        >
          <option value="">Select a growspace</option>
          ${0===this._growspaceOptions.length?q`<option disabled>No growspaces found</option>`:this._growspaceOptions.map(e=>q`<option value="${e}">${e}</option>`)}
        </select>
      </div>
    `:q``}_valueChanged(e,t){if(!this._config)return;const i={...this._config,[e]:t};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:i},bubbles:!0,composed:!0}))}};id.styles=s`
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
  `,e([ue({attribute:!1}),t("design:type",Object)],id.prototype,"hass",void 0),e([ue({attribute:!1}),t("design:type",Object)],id.prototype,"_config",void 0),e([me(),t("design:type",Array)],id.prototype,"_growspaceOptions",void 0),id=e([ce("growspace-manager-card-editor")],id);var rd=Object.freeze({__proto__:null,get GrowspaceManagerCardEditor(){return id}});export{td as GrowspaceManagerCard};
