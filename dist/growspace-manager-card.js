function t(t,e,i,r){var a,n=arguments.length,s=n<3?e:null===r?r=Object.getOwnPropertyDescriptor(e,i):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)s=Reflect.decorate(t,e,i,r);else for(var o=t.length-1;o>=0;o--)(a=t[o])&&(s=(n<3?a(s):n>3?a(e,i,s):a(e,i))||s);return n>3&&s&&Object.defineProperty(e,i,s),s}function e(t,e){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(t,e)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const i=globalThis,r=i.ShadowRoot&&(void 0===i.ShadyCSS||i.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,a=Symbol(),n=new WeakMap;class s{constructor(t,e,i){if(this._$cssResult$=!0,i!==a)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(r&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=n.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&n.set(e,t))}return t}toString(){return this.cssText}}const o=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,r)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[r+1],t[0]);return new s(i,t,a)},l=r?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new s("string"==typeof t?t:t+"",void 0,a))(e)})(t):t,{is:c,defineProperty:d,getOwnPropertyDescriptor:p,getOwnPropertyNames:u,getOwnPropertySymbols:h,getPrototypeOf:g}=Object,m=globalThis,f=m.trustedTypes,v=f?f.emptyScript:"",y=m.reactiveElementPolyfillSupport,b=(t,e)=>t,w={toAttribute(t,e){switch(e){case Boolean:t=t?v:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},x=(t,e)=>!c(t,e),_={attribute:!0,type:String,converter:w,reflect:!1,useDefault:!1,hasChanged:x};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;class $ extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=_){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),r=this.getPropertyDescriptor(t,i,e);void 0!==r&&d(this.prototype,t,r)}}static getPropertyDescriptor(t,e,i){const{get:r,set:a}=p(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:r,set(e){const n=r?.call(this);a?.call(this,e),this.requestUpdate(t,n,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??_}static _$Ei(){if(this.hasOwnProperty(b("elementProperties")))return;const t=g(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(b("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(b("properties"))){const t=this.properties,e=[...u(t),...h(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(r)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const r of e){const e=document.createElement("style"),a=i.litNonce;void 0!==a&&e.setAttribute("nonce",a),e.textContent=r.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),r=this.constructor._$Eu(t,i);if(void 0!==r&&!0===i.reflect){const a=(void 0!==i.converter?.toAttribute?i.converter:w).toAttribute(e,i.type);this._$Em=t,null==a?this.removeAttribute(r):this.setAttribute(r,a),this._$Em=null}}_$AK(t,e){const i=this.constructor,r=i._$Eh.get(t);if(void 0!==r&&this._$Em!==r){const t=i.getPropertyOptions(r),a="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:w;this._$Em=r;const n=a.fromAttribute(e,t.type);this[r]=n??this._$Ej?.get(r)??n,this._$Em=null}}requestUpdate(t,e,i){if(void 0!==t){const r=this.constructor,a=this[t];if(i??=r.getPropertyOptions(t),!((i.hasChanged??x)(a,e)||i.useDefault&&i.reflect&&a===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:r,wrapped:a},n){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??e??this[t]),!0!==a||void 0!==n)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===r&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,r=this[e];!0!==t||this._$AL.has(e)||void 0===r||this.C(e,void 0,i,r)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[b("elementProperties")]=new Map,$[b("finalized")]=new Map,y?.({ReactiveElement:$}),(m.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const D=globalThis,S=D.trustedTypes,C=S?S.createPolicy("lit-html",{createHTML:t=>t}):void 0,k="$lit$",A=`lit$${Math.random().toFixed(9).slice(2)}$`,M="?"+A,T=`<${M}>`,E=document,L=()=>E.createComment(""),O=t=>null===t||"object"!=typeof t&&"function"!=typeof t,I=Array.isArray,N="[ \t\n\f\r]",V=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,z=/-->/g,P=/>/g,H=RegExp(`>|${N}(?:([^\\s"'>=/]+)(${N}*=${N}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),F=/'/g,R=/"/g,G=/^(?:script|style|textarea|title)$/i,j=(t=>(e,...i)=>({_$litType$:t,strings:e,values:i}))(1),U=Symbol.for("lit-noChange"),Z=Symbol.for("lit-nothing"),B=new WeakMap,q=E.createTreeWalker(E,129);function W(t,e){if(!I(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(e):e}const Y=(t,e)=>{const i=t.length-1,r=[];let a,n=2===e?"<svg>":3===e?"<math>":"",s=V;for(let e=0;e<i;e++){const i=t[e];let o,l,c=-1,d=0;for(;d<i.length&&(s.lastIndex=d,l=s.exec(i),null!==l);)d=s.lastIndex,s===V?"!--"===l[1]?s=z:void 0!==l[1]?s=P:void 0!==l[2]?(G.test(l[2])&&(a=RegExp("</"+l[2],"g")),s=H):void 0!==l[3]&&(s=H):s===H?">"===l[0]?(s=a??V,c=-1):void 0===l[1]?c=-2:(c=s.lastIndex-l[2].length,o=l[1],s=void 0===l[3]?H:'"'===l[3]?R:F):s===R||s===F?s=H:s===z||s===P?s=V:(s=H,a=void 0);const p=s===H&&t[e+1].startsWith("/>")?" ":"";n+=s===V?i+T:c>=0?(r.push(o),i.slice(0,c)+k+i.slice(c)+A+p):i+A+(-2===c?e:p)}return[W(t,n+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),r]};class J{constructor({strings:t,_$litType$:e},i){let r;this.parts=[];let a=0,n=0;const s=t.length-1,o=this.parts,[l,c]=Y(t,e);if(this.el=J.createElement(l,i),q.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(r=q.nextNode())&&o.length<s;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(k)){const e=c[n++],i=r.getAttribute(t).split(A),s=/([.?@])?(.*)/.exec(e);o.push({type:1,index:a,name:s[2],strings:i,ctor:"."===s[1]?et:"?"===s[1]?it:"@"===s[1]?rt:tt}),r.removeAttribute(t)}else t.startsWith(A)&&(o.push({type:6,index:a}),r.removeAttribute(t));if(G.test(r.tagName)){const t=r.textContent.split(A),e=t.length-1;if(e>0){r.textContent=S?S.emptyScript:"";for(let i=0;i<e;i++)r.append(t[i],L()),q.nextNode(),o.push({type:2,index:++a});r.append(t[e],L())}}}else if(8===r.nodeType)if(r.data===M)o.push({type:2,index:a});else{let t=-1;for(;-1!==(t=r.data.indexOf(A,t+1));)o.push({type:7,index:a}),t+=A.length-1}a++}}static createElement(t,e){const i=E.createElement("template");return i.innerHTML=t,i}}function Q(t,e,i=t,r){if(e===U)return e;let a=void 0!==r?i._$Co?.[r]:i._$Cl;const n=O(e)?void 0:e._$litDirective$;return a?.constructor!==n&&(a?._$AO?.(!1),void 0===n?a=void 0:(a=new n(t),a._$AT(t,i,r)),void 0!==r?(i._$Co??=[])[r]=a:i._$Cl=a),void 0!==a&&(e=Q(t,a._$AS(t,e.values),a,r)),e}class K{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,r=(t?.creationScope??E).importNode(e,!0);q.currentNode=r;let a=q.nextNode(),n=0,s=0,o=i[0];for(;void 0!==o;){if(n===o.index){let e;2===o.type?e=new X(a,a.nextSibling,this,t):1===o.type?e=new o.ctor(a,o.name,o.strings,this,t):6===o.type&&(e=new at(a,this,t)),this._$AV.push(e),o=i[++s]}n!==o?.index&&(a=q.nextNode(),n++)}return q.currentNode=E,r}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,r){this.type=2,this._$AH=Z,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),O(t)?t===Z||null==t||""===t?(this._$AH!==Z&&this._$AR(),this._$AH=Z):t!==this._$AH&&t!==U&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>I(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==Z&&O(this._$AH)?this._$AA.nextSibling.data=t:this.T(E.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,r="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=J.createElement(W(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===r)this._$AH.p(e);else{const t=new K(r,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=B.get(t.strings);return void 0===e&&B.set(t.strings,e=new J(t)),e}k(t){I(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,r=0;for(const a of t)r===e.length?e.push(i=new X(this.O(L()),this.O(L()),this,this.options)):i=e[r],i._$AI(a),r++;r<e.length&&(this._$AR(i&&i._$AB.nextSibling,r),e.length=r)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,r,a){this.type=1,this._$AH=Z,this._$AN=void 0,this.element=t,this.name=e,this._$AM=r,this.options=a,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=Z}_$AI(t,e=this,i,r){const a=this.strings;let n=!1;if(void 0===a)t=Q(this,t,e,0),n=!O(t)||t!==this._$AH&&t!==U,n&&(this._$AH=t);else{const r=t;let s,o;for(t=a[0],s=0;s<a.length-1;s++)o=Q(this,r[i+s],e,s),o===U&&(o=this._$AH[s]),n||=!O(o)||o!==this._$AH[s],o===Z?t=Z:t!==Z&&(t+=(o??"")+a[s+1]),this._$AH[s]=o}n&&!r&&this.j(t)}j(t){t===Z?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===Z?void 0:t}}class it extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==Z)}}class rt extends tt{constructor(t,e,i,r,a){super(t,e,i,r,a),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??Z)===U)return;const i=this._$AH,r=t===Z&&i!==Z||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,a=t!==Z&&(i===Z||r);r&&this.element.removeEventListener(this.name,this,i),a&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class at{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const nt=D.litHtmlPolyfillSupport;nt?.(J,X),(D.litHtmlVersions??=[]).push("3.3.1");const st=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const r=i?.renderBefore??e;let a=r._$litPart$;if(void 0===a){const t=i?.renderBefore??null;r._$litPart$=a=new X(e.insertBefore(L(),t),t,void 0,i??{})}return a._$AI(t),a})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return U}}ot._$litElement$=!0,ot.finalized=!0,st.litElementHydrateSupport?.({LitElement:ot});const lt=st.litElementPolyfillSupport;lt?.({LitElement:ot}),(st.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ct=t=>(e,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)},dt={attribute:!0,type:String,converter:w,reflect:!1,hasChanged:x},pt=(t=dt,e,i)=>{const{kind:r,metadata:a}=i;let n=globalThis.litPropertyMetadata.get(a);if(void 0===n&&globalThis.litPropertyMetadata.set(a,n=new Map),"setter"===r&&((t=Object.create(t)).wrapped=!0),n.set(i.name,t),"accessor"===r){const{name:r}=i;return{set(i){const a=e.get.call(this);e.set.call(this,i),this.requestUpdate(r,a,t)},init(e){return void 0!==e&&this.C(r,void 0,t,e),e}}}if("setter"===r){const{name:r}=i;return function(i){const a=this[r];e.call(this,i),this.requestUpdate(r,a,t)}}throw Error("Unsupported decorator location: "+r)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ut(t){return(e,i)=>"object"==typeof i?pt(t,e,i):((t,e,i)=>{const r=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),r?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ht(t){return ut({...t,state:!0,attribute:!1})}var gt="M21.33,12.91C21.42,14.46 20.71,15.95 19.44,16.86L20.21,18.35C20.44,18.8 20.47,19.33 20.27,19.8C20.08,20.27 19.69,20.64 19.21,20.8L18.42,21.05C18.25,21.11 18.06,21.14 17.88,21.14C17.37,21.14 16.89,20.91 16.56,20.5L14.44,18C13.55,17.85 12.71,17.47 12,16.9C11.5,17.05 11,17.13 10.5,17.13C9.62,17.13 8.74,16.86 8,16.34C7.47,16.5 6.93,16.57 6.38,16.56C5.59,16.57 4.81,16.41 4.08,16.11C2.65,15.47 1.7,14.07 1.65,12.5C1.57,11.78 1.69,11.05 2,10.39C1.71,9.64 1.68,8.82 1.93,8.06C2.3,7.11 3,6.32 3.87,5.82C4.45,4.13 6.08,3 7.87,3.12C9.47,1.62 11.92,1.46 13.7,2.75C14.12,2.64 14.56,2.58 15,2.58C16.36,2.55 17.65,3.15 18.5,4.22C20.54,4.75 22,6.57 22.08,8.69C22.13,9.8 21.83,10.89 21.22,11.82C21.29,12.18 21.33,12.54 21.33,12.91M16.33,11.5C16.9,11.57 17.35,12 17.35,12.57A1,1 0 0,1 16.35,13.57H15.72C15.4,14.47 14.84,15.26 14.1,15.86C14.35,15.95 14.61,16 14.87,16.07C20,16 19.4,12.87 19.4,12.82C19.34,11.39 18.14,10.27 16.71,10.33A1,1 0 0,1 15.71,9.33A1,1 0 0,1 16.71,8.33C17.94,8.36 19.12,8.82 20.04,9.63C20.09,9.34 20.12,9.04 20.12,8.74C20.06,7.5 19.5,6.42 17.25,6.21C16,3.25 12.85,4.89 12.85,5.81V5.81C12.82,6.04 13.06,6.53 13.1,6.56A1,1 0 0,1 14.1,7.56C14.1,8.11 13.65,8.56 13.1,8.56V8.56C12.57,8.54 12.07,8.34 11.67,8C11.19,8.31 10.64,8.5 10.07,8.56V8.56C9.5,8.61 9.03,8.21 9,7.66C8.92,7.1 9.33,6.61 9.88,6.56C10.04,6.54 10.82,6.42 10.82,5.79V5.79C10.82,5.13 11.07,4.5 11.5,4C10.58,3.75 9.59,4.08 8.59,5.29C6.75,5 6,5.25 5.45,7.2C4.5,7.67 4,8 3.78,9C4.86,8.78 5.97,8.87 7,9.25C7.5,9.44 7.78,10 7.59,10.54C7.4,11.06 6.82,11.32 6.3,11.13C5.57,10.81 4.75,10.79 4,11.07C3.68,11.34 3.68,11.9 3.68,12.34C3.68,13.08 4.05,13.77 4.68,14.17C5.21,14.44 5.8,14.58 6.39,14.57C6.24,14.31 6.11,14.04 6,13.76C5.81,13.22 6.1,12.63 6.64,12.44C7.18,12.25 7.77,12.54 7.96,13.08C8.36,14.22 9.38,15 10.58,15.13C11.95,15.06 13.17,14.25 13.77,13C14,11.62 15.11,11.5 16.33,11.5M18.33,18.97L17.71,17.67L17,17.83L18,19.08L18.33,18.97M13.68,10.36C13.7,9.83 13.3,9.38 12.77,9.33C12.06,9.29 11.37,9.53 10.84,10C10.27,10.58 9.97,11.38 10,12.19A1,1 0 0,0 11,13.19C11.57,13.19 12,12.74 12,12.19C12,11.92 12.07,11.65 12.23,11.43C12.35,11.33 12.5,11.28 12.66,11.28C13.21,11.31 13.68,10.9 13.68,10.36Z",mt="M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z",ft="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",vt="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",yt="M11 20H6.5Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20H13V12.85L14.6 14.4L16 13L12 9L8 13L9.4 14.4L11 12.85Z",bt="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",wt="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z",xt="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",_t="M4,2H6V4C6,5.44 6.68,6.61 7.88,7.78C8.74,8.61 9.89,9.41 11.09,10.2L9.26,11.39C8.27,10.72 7.31,10 6.5,9.21C5.07,7.82 4,6.1 4,4V2M18,2H20V4C20,6.1 18.93,7.82 17.5,9.21C16.09,10.59 14.29,11.73 12.54,12.84C10.79,13.96 9.09,15.05 7.88,16.22C6.68,17.39 6,18.56 6,20V22H4V20C4,17.9 5.07,16.18 6.5,14.79C7.91,13.41 9.71,12.27 11.46,11.16C13.21,10.04 14.91,8.95 16.12,7.78C17.32,6.61 18,5.44 18,4V2M14.74,12.61C15.73,13.28 16.69,14 17.5,14.79C18.93,16.18 20,17.9 20,20V22H18V20C18,18.56 17.32,17.39 16.12,16.22C15.26,15.39 14.11,14.59 12.91,13.8L14.74,12.61M7,3H17V4L16.94,4.5H7.06L7,4V3M7.68,6H16.32C16.08,6.34 15.8,6.69 15.42,7.06L14.91,7.5H9.07L8.58,7.06C8.2,6.69 7.92,6.34 7.68,6M9.09,16.5H14.93L15.42,16.94C15.8,17.31 16.08,17.66 16.32,18H7.68C7.92,17.66 8.2,17.31 8.58,16.94L9.09,16.5M7.06,19.5H16.94L17,20V21H7V20L7.06,19.5Z",$t="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",Dt="M22 9A4.32 4.32 0 0 1 19.78 8.45A3.4 3.4 0 0 0 18 8V7A4.32 4.32 0 0 1 20.22 7.55A3.4 3.4 0 0 0 22 8M22 6A3.4 3.4 0 0 1 20.22 5.55A4.32 4.32 0 0 0 18 5V6A3.4 3.4 0 0 1 19.78 6.45A4.32 4.32 0 0 0 22 7M22 10A3.4 3.4 0 0 1 20.22 9.55A4.32 4.32 0 0 0 18 9V10A3.4 3.4 0 0 1 19.78 10.45A4.32 4.32 0 0 0 22 11M10 12.73A70.39 70.39 0 0 0 17 11V4S10.5 2 7.5 2A5.5 5.5 0 0 0 6.12 12.82L7 19H8A3 3 0 0 0 9.46 21.33A3.15 3.15 0 0 1 11 24H12A4.12 4.12 0 0 0 10.09 20.55C9.39 20 9 19.63 9 19H10M7.5 10A2.5 2.5 0 1 1 10 7.5A2.5 2.5 0 0 1 7.5 10Z",St="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z",Ct="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z",kt="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z",At="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",Mt="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",Tt="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z",Et="M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z",Lt="M8 13C6.14 13 4.59 14.28 4.14 16H2V18H4.14C4.59 19.72 6.14 21 8 21S11.41 19.72 11.86 18H22V16H11.86C11.41 14.28 9.86 13 8 13M8 19C6.9 19 6 18.1 6 17C6 15.9 6.9 15 8 15S10 15.9 10 17C10 18.1 9.1 19 8 19M19.86 6C19.41 4.28 17.86 3 16 3S12.59 4.28 12.14 6H2V8H12.14C12.59 9.72 14.14 11 16 11S19.41 9.72 19.86 8H22V6H19.86M16 9C14.9 9 14 8.1 14 7C14 5.9 14.9 5 16 5S18 5.9 18 7C18 8.1 17.1 9 16 9Z",Ot="M13,3V9H21V3M13,21H21V11H13M3,21H11V15H3M3,13H11V3H3V13Z",It="M12,20A6,6 0 0,1 6,14C6,10 12,3.25 12,3.25C12,3.25 18,10 18,14A6,6 0 0,1 12,20Z",Nt="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z",Vt="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z";class zt extends Error{}class Pt extends zt{constructor(t){super(`Invalid DateTime: ${t.toMessage()}`)}}class Ht extends zt{constructor(t){super(`Invalid Interval: ${t.toMessage()}`)}}class Ft extends zt{constructor(t){super(`Invalid Duration: ${t.toMessage()}`)}}class Rt extends zt{}class Gt extends zt{constructor(t){super(`Invalid unit ${t}`)}}class jt extends zt{}class Ut extends zt{constructor(){super("Zone is an abstract class")}}const Zt="numeric",Bt="short",qt="long",Wt={year:Zt,month:Zt,day:Zt},Yt={year:Zt,month:Bt,day:Zt},Jt={year:Zt,month:Bt,day:Zt,weekday:Bt},Qt={year:Zt,month:qt,day:Zt},Kt={year:Zt,month:qt,day:Zt,weekday:qt},Xt={hour:Zt,minute:Zt},te={hour:Zt,minute:Zt,second:Zt},ee={hour:Zt,minute:Zt,second:Zt,timeZoneName:Bt},ie={hour:Zt,minute:Zt,second:Zt,timeZoneName:qt},re={hour:Zt,minute:Zt,hourCycle:"h23"},ae={hour:Zt,minute:Zt,second:Zt,hourCycle:"h23"},ne={hour:Zt,minute:Zt,second:Zt,hourCycle:"h23",timeZoneName:Bt},se={hour:Zt,minute:Zt,second:Zt,hourCycle:"h23",timeZoneName:qt},oe={year:Zt,month:Zt,day:Zt,hour:Zt,minute:Zt},le={year:Zt,month:Zt,day:Zt,hour:Zt,minute:Zt,second:Zt},ce={year:Zt,month:Bt,day:Zt,hour:Zt,minute:Zt},de={year:Zt,month:Bt,day:Zt,hour:Zt,minute:Zt,second:Zt},pe={year:Zt,month:Bt,day:Zt,weekday:Bt,hour:Zt,minute:Zt},ue={year:Zt,month:qt,day:Zt,hour:Zt,minute:Zt,timeZoneName:Bt},he={year:Zt,month:qt,day:Zt,hour:Zt,minute:Zt,second:Zt,timeZoneName:Bt},ge={year:Zt,month:qt,day:Zt,weekday:qt,hour:Zt,minute:Zt,timeZoneName:qt},me={year:Zt,month:qt,day:Zt,weekday:qt,hour:Zt,minute:Zt,second:Zt,timeZoneName:qt};class fe{get type(){throw new Ut}get name(){throw new Ut}get ianaName(){return this.name}get isUniversal(){throw new Ut}offsetName(t,e){throw new Ut}formatOffset(t,e){throw new Ut}offset(t){throw new Ut}equals(t){throw new Ut}get isValid(){throw new Ut}}let ve=null;class ye extends fe{static get instance(){return null===ve&&(ve=new ye),ve}get type(){return"system"}get name(){return(new Intl.DateTimeFormat).resolvedOptions().timeZone}get isUniversal(){return!1}offsetName(t,{format:e,locale:i}){return Pi(t,e,i)}formatOffset(t,e){return Gi(this.offset(t),e)}offset(t){return-new Date(t).getTimezoneOffset()}equals(t){return"system"===t.type}get isValid(){return!0}}const be=new Map;const we={year:0,month:1,day:2,era:3,hour:4,minute:5,second:6};const xe=new Map;class _e extends fe{static create(t){let e=xe.get(t);return void 0===e&&xe.set(t,e=new _e(t)),e}static resetCache(){xe.clear(),be.clear()}static isValidSpecifier(t){return this.isValidZone(t)}static isValidZone(t){if(!t)return!1;try{return new Intl.DateTimeFormat("en-US",{timeZone:t}).format(),!0}catch(t){return!1}}constructor(t){super(),this.zoneName=t,this.valid=_e.isValidZone(t)}get type(){return"iana"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(t,{format:e,locale:i}){return Pi(t,e,i,this.name)}formatOffset(t,e){return Gi(this.offset(t),e)}offset(t){if(!this.valid)return NaN;const e=new Date(t);if(isNaN(e))return NaN;const i=function(t){let e=be.get(t);return void 0===e&&(e=new Intl.DateTimeFormat("en-US",{hour12:!1,timeZone:t,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",era:"short"}),be.set(t,e)),e}(this.name);let[r,a,n,s,o,l,c]=i.formatToParts?function(t,e){const i=t.formatToParts(e),r=[];for(let t=0;t<i.length;t++){const{type:e,value:a}=i[t],n=we[e];"era"===e?r[n]=a:vi(n)||(r[n]=parseInt(a,10))}return r}(i,e):function(t,e){const i=t.format(e).replace(/\u200E/g,""),r=/(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(i),[,a,n,s,o,l,c,d]=r;return[s,a,n,o,l,c,d]}(i,e);"BC"===s&&(r=1-Math.abs(r));let d=+e;const p=d%1e3;return d-=p>=0?p:1e3+p,(Ii({year:r,month:a,day:n,hour:24===o?0:o,minute:l,second:c,millisecond:0})-d)/6e4}equals(t){return"iana"===t.type&&t.name===this.name}get isValid(){return this.valid}}let $e={};const De=new Map;function Se(t,e={}){const i=JSON.stringify([t,e]);let r=De.get(i);return void 0===r&&(r=new Intl.DateTimeFormat(t,e),De.set(i,r)),r}const Ce=new Map;const ke=new Map;let Ae=null;const Me=new Map;function Te(t){let e=Me.get(t);return void 0===e&&(e=new Intl.DateTimeFormat(t).resolvedOptions(),Me.set(t,e)),e}const Ee=new Map;function Le(t,e,i,r){const a=t.listingMode();return"error"===a?null:"en"===a?i(e):r(e)}class Oe{constructor(t,e,i){this.padTo=i.padTo||0,this.floor=i.floor||!1;const{padTo:r,floor:a,...n}=i;if(!e||Object.keys(n).length>0){const e={useGrouping:!1,...i};i.padTo>0&&(e.minimumIntegerDigits=i.padTo),this.inf=function(t,e={}){const i=JSON.stringify([t,e]);let r=Ce.get(i);return void 0===r&&(r=new Intl.NumberFormat(t,e),Ce.set(i,r)),r}(t,e)}}format(t){if(this.inf){const e=this.floor?Math.floor(t):t;return this.inf.format(e)}return Ci(this.floor?Math.floor(t):Ti(t,3),this.padTo)}}class Ie{constructor(t,e,i){let r;if(this.opts=i,this.originalZone=void 0,this.opts.timeZone)this.dt=t;else if("fixed"===t.zone.type){const e=t.offset/60*-1,i=e>=0?`Etc/GMT+${e}`:`Etc/GMT${e}`;0!==t.offset&&_e.create(i).valid?(r=i,this.dt=t):(r="UTC",this.dt=0===t.offset?t:t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone)}else"system"===t.zone.type?this.dt=t:"iana"===t.zone.type?(this.dt=t,r=t.zone.name):(r="UTC",this.dt=t.setZone("UTC").plus({minutes:t.offset}),this.originalZone=t.zone);const a={...this.opts};a.timeZone=a.timeZone||r,this.dtf=Se(e,a)}format(){return this.originalZone?this.formatToParts().map(({value:t})=>t).join(""):this.dtf.format(this.dt.toJSDate())}formatToParts(){const t=this.dtf.formatToParts(this.dt.toJSDate());return this.originalZone?t.map(t=>{if("timeZoneName"===t.type){const e=this.originalZone.offsetName(this.dt.ts,{locale:this.dt.locale,format:this.opts.timeZoneName});return{...t,value:e}}return t}):t}resolvedOptions(){return this.dtf.resolvedOptions()}}class Ne{constructor(t,e,i){this.opts={style:"long",...i},!e&&wi()&&(this.rtf=function(t,e={}){const{base:i,...r}=e,a=JSON.stringify([t,r]);let n=ke.get(a);return void 0===n&&(n=new Intl.RelativeTimeFormat(t,e),ke.set(a,n)),n}(t,i))}format(t,e){return this.rtf?this.rtf.format(t,e):function(t,e,i="always",r=!1){const a={years:["year","yr."],quarters:["quarter","qtr."],months:["month","mo."],weeks:["week","wk."],days:["day","day","days"],hours:["hour","hr."],minutes:["minute","min."],seconds:["second","sec."]},n=-1===["hours","minutes","seconds"].indexOf(t);if("auto"===i&&n){const i="days"===t;switch(e){case 1:return i?"tomorrow":`next ${a[t][0]}`;case-1:return i?"yesterday":`last ${a[t][0]}`;case 0:return i?"today":`this ${a[t][0]}`}}const s=Object.is(e,-0)||e<0,o=Math.abs(e),l=1===o,c=a[t],d=r?l?c[1]:c[2]||c[1]:l?a[t][0]:t;return s?`${o} ${d} ago`:`in ${o} ${d}`}(e,t,this.opts.numeric,"long"!==this.opts.style)}formatToParts(t,e){return this.rtf?this.rtf.formatToParts(t,e):[]}}const Ve={firstDay:1,minimalDays:4,weekend:[6,7]};class ze{static fromOpts(t){return ze.create(t.locale,t.numberingSystem,t.outputCalendar,t.weekSettings,t.defaultToEN)}static create(t,e,i,r,a=!1){const n=t||ei.defaultLocale,s=n||(a?"en-US":Ae||(Ae=(new Intl.DateTimeFormat).resolvedOptions().locale,Ae)),o=e||ei.defaultNumberingSystem,l=i||ei.defaultOutputCalendar,c=Di(r)||ei.defaultWeekSettings;return new ze(s,o,l,c,n)}static resetCache(){Ae=null,De.clear(),Ce.clear(),ke.clear(),Me.clear(),Ee.clear()}static fromObject({locale:t,numberingSystem:e,outputCalendar:i,weekSettings:r}={}){return ze.create(t,e,i,r)}constructor(t,e,i,r,a){const[n,s,o]=function(t){const e=t.indexOf("-x-");-1!==e&&(t=t.substring(0,e));const i=t.indexOf("-u-");if(-1===i)return[t];{let e,r;try{e=Se(t).resolvedOptions(),r=t}catch(a){const n=t.substring(0,i);e=Se(n).resolvedOptions(),r=n}const{numberingSystem:a,calendar:n}=e;return[r,a,n]}}(t);this.locale=n,this.numberingSystem=e||s||null,this.outputCalendar=i||o||null,this.weekSettings=r,this.intl=function(t,e,i){return i||e?(t.includes("-u-")||(t+="-u"),i&&(t+=`-ca-${i}`),e&&(t+=`-nu-${e}`),t):t}(this.locale,this.numberingSystem,this.outputCalendar),this.weekdaysCache={format:{},standalone:{}},this.monthsCache={format:{},standalone:{}},this.meridiemCache=null,this.eraCache={},this.specifiedLocale=a,this.fastNumbersCached=null}get fastNumbers(){var t;return null==this.fastNumbersCached&&(this.fastNumbersCached=(!(t=this).numberingSystem||"latn"===t.numberingSystem)&&("latn"===t.numberingSystem||!t.locale||t.locale.startsWith("en")||"latn"===Te(t.locale).numberingSystem)),this.fastNumbersCached}listingMode(){const t=this.isEnglish(),e=!(null!==this.numberingSystem&&"latn"!==this.numberingSystem||null!==this.outputCalendar&&"gregory"!==this.outputCalendar);return t&&e?"en":"intl"}clone(t){return t&&0!==Object.getOwnPropertyNames(t).length?ze.create(t.locale||this.specifiedLocale,t.numberingSystem||this.numberingSystem,t.outputCalendar||this.outputCalendar,Di(t.weekSettings)||this.weekSettings,t.defaultToEN||!1):this}redefaultToEN(t={}){return this.clone({...t,defaultToEN:!0})}redefaultToSystem(t={}){return this.clone({...t,defaultToEN:!1})}months(t,e=!1){return Le(this,t,qi,()=>{const i="ja"===this.intl||this.intl.startsWith("ja-"),r=(e&=!i)?{month:t,day:"numeric"}:{month:t},a=e?"format":"standalone";if(!this.monthsCache[a][t]){const e=i?t=>this.dtFormatter(t,r).format():t=>this.extract(t,r,"month");this.monthsCache[a][t]=function(t){const e=[];for(let i=1;i<=12;i++){const r=Ka.utc(2009,i,1);e.push(t(r))}return e}(e)}return this.monthsCache[a][t]})}weekdays(t,e=!1){return Le(this,t,Qi,()=>{const i=e?{weekday:t,year:"numeric",month:"long",day:"numeric"}:{weekday:t},r=e?"format":"standalone";return this.weekdaysCache[r][t]||(this.weekdaysCache[r][t]=function(t){const e=[];for(let i=1;i<=7;i++){const r=Ka.utc(2016,11,13+i);e.push(t(r))}return e}(t=>this.extract(t,i,"weekday"))),this.weekdaysCache[r][t]})}meridiems(){return Le(this,void 0,()=>Ki,()=>{if(!this.meridiemCache){const t={hour:"numeric",hourCycle:"h12"};this.meridiemCache=[Ka.utc(2016,11,13,9),Ka.utc(2016,11,13,19)].map(e=>this.extract(e,t,"dayperiod"))}return this.meridiemCache})}eras(t){return Le(this,t,ir,()=>{const e={era:t};return this.eraCache[t]||(this.eraCache[t]=[Ka.utc(-40,1,1),Ka.utc(2017,1,1)].map(t=>this.extract(t,e,"era"))),this.eraCache[t]})}extract(t,e,i){const r=this.dtFormatter(t,e).formatToParts().find(t=>t.type.toLowerCase()===i);return r?r.value:null}numberFormatter(t={}){return new Oe(this.intl,t.forceSimple||this.fastNumbers,t)}dtFormatter(t,e={}){return new Ie(t,this.intl,e)}relFormatter(t={}){return new Ne(this.intl,this.isEnglish(),t)}listFormatter(t={}){return function(t,e={}){const i=JSON.stringify([t,e]);let r=$e[i];return r||(r=new Intl.ListFormat(t,e),$e[i]=r),r}(this.intl,t)}isEnglish(){return"en"===this.locale||"en-us"===this.locale.toLowerCase()||Te(this.intl).locale.startsWith("en-us")}getWeekSettings(){return this.weekSettings?this.weekSettings:xi()?function(t){let e=Ee.get(t);if(!e){const i=new Intl.Locale(t);e="getWeekInfo"in i?i.getWeekInfo():i.weekInfo,"minimalDays"in e||(e={...Ve,...e}),Ee.set(t,e)}return e}(this.locale):Ve}getStartOfWeek(){return this.getWeekSettings().firstDay}getMinDaysInFirstWeek(){return this.getWeekSettings().minimalDays}getWeekendDays(){return this.getWeekSettings().weekend}equals(t){return this.locale===t.locale&&this.numberingSystem===t.numberingSystem&&this.outputCalendar===t.outputCalendar}toString(){return`Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`}}let Pe=null;class He extends fe{static get utcInstance(){return null===Pe&&(Pe=new He(0)),Pe}static instance(t){return 0===t?He.utcInstance:new He(t)}static parseSpecifier(t){if(t){const e=t.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);if(e)return new He(Hi(e[1],e[2]))}return null}constructor(t){super(),this.fixed=t}get type(){return"fixed"}get name(){return 0===this.fixed?"UTC":`UTC${Gi(this.fixed,"narrow")}`}get ianaName(){return 0===this.fixed?"Etc/UTC":`Etc/GMT${Gi(-this.fixed,"narrow")}`}offsetName(){return this.name}formatOffset(t,e){return Gi(this.fixed,e)}get isUniversal(){return!0}offset(){return this.fixed}equals(t){return"fixed"===t.type&&t.fixed===this.fixed}get isValid(){return!0}}class Fe extends fe{constructor(t){super(),this.zoneName=t}get type(){return"invalid"}get name(){return this.zoneName}get isUniversal(){return!1}offsetName(){return null}formatOffset(){return""}offset(){return NaN}equals(){return!1}get isValid(){return!1}}function Re(t,e){if(vi(t)||null===t)return e;if(t instanceof fe)return t;if(function(t){return"string"==typeof t}(t)){const i=t.toLowerCase();return"default"===i?e:"local"===i||"system"===i?ye.instance:"utc"===i||"gmt"===i?He.utcInstance:He.parseSpecifier(i)||_e.create(t)}return yi(t)?He.instance(t):"object"==typeof t&&"offset"in t&&"function"==typeof t.offset?t:new Fe(t)}const Ge={arab:"[٠-٩]",arabext:"[۰-۹]",bali:"[᭐-᭙]",beng:"[০-৯]",deva:"[०-९]",fullwide:"[０-９]",gujr:"[૦-૯]",hanidec:"[〇|一|二|三|四|五|六|七|八|九]",khmr:"[០-៩]",knda:"[೦-೯]",laoo:"[໐-໙]",limb:"[᥆-᥏]",mlym:"[൦-൯]",mong:"[᠐-᠙]",mymr:"[၀-၉]",orya:"[୦-୯]",tamldec:"[௦-௯]",telu:"[౦-౯]",thai:"[๐-๙]",tibt:"[༠-༩]",latn:"\\d"},je={arab:[1632,1641],arabext:[1776,1785],bali:[6992,7001],beng:[2534,2543],deva:[2406,2415],fullwide:[65296,65303],gujr:[2790,2799],khmr:[6112,6121],knda:[3302,3311],laoo:[3792,3801],limb:[6470,6479],mlym:[3430,3439],mong:[6160,6169],mymr:[4160,4169],orya:[2918,2927],tamldec:[3046,3055],telu:[3174,3183],thai:[3664,3673],tibt:[3872,3881]},Ue=Ge.hanidec.replace(/[\[|\]]/g,"").split("");const Ze=new Map;function Be({numberingSystem:t},e=""){const i=t||"latn";let r=Ze.get(i);void 0===r&&(r=new Map,Ze.set(i,r));let a=r.get(e);return void 0===a&&(a=new RegExp(`${Ge[i]}${e}`),r.set(e,a)),a}let qe,We=()=>Date.now(),Ye="system",Je=null,Qe=null,Ke=null,Xe=60,ti=null;class ei{static get now(){return We}static set now(t){We=t}static set defaultZone(t){Ye=t}static get defaultZone(){return Re(Ye,ye.instance)}static get defaultLocale(){return Je}static set defaultLocale(t){Je=t}static get defaultNumberingSystem(){return Qe}static set defaultNumberingSystem(t){Qe=t}static get defaultOutputCalendar(){return Ke}static set defaultOutputCalendar(t){Ke=t}static get defaultWeekSettings(){return ti}static set defaultWeekSettings(t){ti=Di(t)}static get twoDigitCutoffYear(){return Xe}static set twoDigitCutoffYear(t){Xe=t%100}static get throwOnInvalid(){return qe}static set throwOnInvalid(t){qe=t}static resetCaches(){ze.resetCache(),_e.resetCache(),Ka.resetCache(),Ze.clear()}}class ii{constructor(t,e){this.reason=t,this.explanation=e}toMessage(){return this.explanation?`${this.reason}: ${this.explanation}`:this.reason}}const ri=[0,31,59,90,120,151,181,212,243,273,304,334],ai=[0,31,60,91,121,152,182,213,244,274,305,335];function ni(t,e){return new ii("unit out of range",`you specified ${e} (of type ${typeof e}) as a ${t}, which is invalid`)}function si(t,e,i){const r=new Date(Date.UTC(t,e-1,i));t<100&&t>=0&&r.setUTCFullYear(r.getUTCFullYear()-1900);const a=r.getUTCDay();return 0===a?7:a}function oi(t,e,i){return i+(Ei(t)?ai:ri)[e-1]}function li(t,e){const i=Ei(t)?ai:ri,r=i.findIndex(t=>t<e);return{month:r+1,day:e-i[r]}}function ci(t,e){return(t-e+7)%7+1}function di(t,e=4,i=1){const{year:r,month:a,day:n}=t,s=oi(r,a,n),o=ci(si(r,a,n),i);let l,c=Math.floor((s-o+14-e)/7);return c<1?(l=r-1,c=Vi(l,e,i)):c>Vi(r,e,i)?(l=r+1,c=1):l=r,{weekYear:l,weekNumber:c,weekday:o,...ji(t)}}function pi(t,e=4,i=1){const{weekYear:r,weekNumber:a,weekday:n}=t,s=ci(si(r,1,e),i),o=Li(r);let l,c=7*a+n-s-7+e;c<1?(l=r-1,c+=Li(l)):c>o?(l=r+1,c-=Li(r)):l=r;const{month:d,day:p}=li(l,c);return{year:l,month:d,day:p,...ji(t)}}function ui(t){const{year:e,month:i,day:r}=t;return{year:e,ordinal:oi(e,i,r),...ji(t)}}function hi(t){const{year:e,ordinal:i}=t,{month:r,day:a}=li(e,i);return{year:e,month:r,day:a,...ji(t)}}function gi(t,e){if(!vi(t.localWeekday)||!vi(t.localWeekNumber)||!vi(t.localWeekYear)){if(!vi(t.weekday)||!vi(t.weekNumber)||!vi(t.weekYear))throw new Rt("Cannot mix locale-based week fields with ISO-based week fields");return vi(t.localWeekday)||(t.weekday=t.localWeekday),vi(t.localWeekNumber)||(t.weekNumber=t.localWeekNumber),vi(t.localWeekYear)||(t.weekYear=t.localWeekYear),delete t.localWeekday,delete t.localWeekNumber,delete t.localWeekYear,{minDaysInFirstWeek:e.getMinDaysInFirstWeek(),startOfWeek:e.getStartOfWeek()}}return{minDaysInFirstWeek:4,startOfWeek:1}}function mi(t){const e=bi(t.year),i=Si(t.month,1,12),r=Si(t.day,1,Oi(t.year,t.month));return e?i?!r&&ni("day",t.day):ni("month",t.month):ni("year",t.year)}function fi(t){const{hour:e,minute:i,second:r,millisecond:a}=t,n=Si(e,0,23)||24===e&&0===i&&0===r&&0===a,s=Si(i,0,59),o=Si(r,0,59),l=Si(a,0,999);return n?s?o?!l&&ni("millisecond",a):ni("second",r):ni("minute",i):ni("hour",e)}function vi(t){return void 0===t}function yi(t){return"number"==typeof t}function bi(t){return"number"==typeof t&&t%1==0}function wi(){try{return"undefined"!=typeof Intl&&!!Intl.RelativeTimeFormat}catch(t){return!1}}function xi(){try{return"undefined"!=typeof Intl&&!!Intl.Locale&&("weekInfo"in Intl.Locale.prototype||"getWeekInfo"in Intl.Locale.prototype)}catch(t){return!1}}function _i(t,e,i){if(0!==t.length)return t.reduce((t,r)=>{const a=[e(r),r];return t&&i(t[0],a[0])===t[0]?t:a},null)[1]}function $i(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function Di(t){if(null==t)return null;if("object"!=typeof t)throw new jt("Week settings must be an object");if(!Si(t.firstDay,1,7)||!Si(t.minimalDays,1,7)||!Array.isArray(t.weekend)||t.weekend.some(t=>!Si(t,1,7)))throw new jt("Invalid week settings");return{firstDay:t.firstDay,minimalDays:t.minimalDays,weekend:Array.from(t.weekend)}}function Si(t,e,i){return bi(t)&&t>=e&&t<=i}function Ci(t,e=2){let i;return i=t<0?"-"+(""+-t).padStart(e,"0"):(""+t).padStart(e,"0"),i}function ki(t){return vi(t)||null===t||""===t?void 0:parseInt(t,10)}function Ai(t){return vi(t)||null===t||""===t?void 0:parseFloat(t)}function Mi(t){if(!vi(t)&&null!==t&&""!==t){const e=1e3*parseFloat("0."+t);return Math.floor(e)}}function Ti(t,e,i="round"){const r=10**e;switch(i){case"expand":return t>0?Math.ceil(t*r)/r:Math.floor(t*r)/r;case"trunc":return Math.trunc(t*r)/r;case"round":return Math.round(t*r)/r;case"floor":return Math.floor(t*r)/r;case"ceil":return Math.ceil(t*r)/r;default:throw new RangeError(`Value rounding ${i} is out of range`)}}function Ei(t){return t%4==0&&(t%100!=0||t%400==0)}function Li(t){return Ei(t)?366:365}function Oi(t,e){const i=function(t,e){return t-e*Math.floor(t/e)}(e-1,12)+1;return 2===i?Ei(t+(e-i)/12)?29:28:[31,null,31,30,31,30,31,31,30,31,30,31][i-1]}function Ii(t){let e=Date.UTC(t.year,t.month-1,t.day,t.hour,t.minute,t.second,t.millisecond);return t.year<100&&t.year>=0&&(e=new Date(e),e.setUTCFullYear(t.year,t.month-1,t.day)),+e}function Ni(t,e,i){return-ci(si(t,1,e),i)+e-1}function Vi(t,e=4,i=1){const r=Ni(t,e,i),a=Ni(t+1,e,i);return(Li(t)-r+a)/7}function zi(t){return t>99?t:t>ei.twoDigitCutoffYear?1900+t:2e3+t}function Pi(t,e,i,r=null){const a=new Date(t),n={hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"};r&&(n.timeZone=r);const s={timeZoneName:e,...n},o=new Intl.DateTimeFormat(i,s).formatToParts(a).find(t=>"timezonename"===t.type.toLowerCase());return o?o.value:null}function Hi(t,e){let i=parseInt(t,10);Number.isNaN(i)&&(i=0);const r=parseInt(e,10)||0;return 60*i+(i<0||Object.is(i,-0)?-r:r)}function Fi(t){const e=Number(t);if("boolean"==typeof t||""===t||!Number.isFinite(e))throw new jt(`Invalid unit value ${t}`);return e}function Ri(t,e){const i={};for(const r in t)if($i(t,r)){const a=t[r];if(null==a)continue;i[e(r)]=Fi(a)}return i}function Gi(t,e){const i=Math.trunc(Math.abs(t/60)),r=Math.trunc(Math.abs(t%60)),a=t>=0?"+":"-";switch(e){case"short":return`${a}${Ci(i,2)}:${Ci(r,2)}`;case"narrow":return`${a}${i}${r>0?`:${r}`:""}`;case"techie":return`${a}${Ci(i,2)}${Ci(r,2)}`;default:throw new RangeError(`Value format ${e} is out of range for property format`)}}function ji(t){return function(t,e){return e.reduce((e,i)=>(e[i]=t[i],e),{})}(t,["hour","minute","second","millisecond"])}const Ui=["January","February","March","April","May","June","July","August","September","October","November","December"],Zi=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],Bi=["J","F","M","A","M","J","J","A","S","O","N","D"];function qi(t){switch(t){case"narrow":return[...Bi];case"short":return[...Zi];case"long":return[...Ui];case"numeric":return["1","2","3","4","5","6","7","8","9","10","11","12"];case"2-digit":return["01","02","03","04","05","06","07","08","09","10","11","12"];default:return null}}const Wi=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],Yi=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],Ji=["M","T","W","T","F","S","S"];function Qi(t){switch(t){case"narrow":return[...Ji];case"short":return[...Yi];case"long":return[...Wi];case"numeric":return["1","2","3","4","5","6","7"];default:return null}}const Ki=["AM","PM"],Xi=["Before Christ","Anno Domini"],tr=["BC","AD"],er=["B","A"];function ir(t){switch(t){case"narrow":return[...er];case"short":return[...tr];case"long":return[...Xi];default:return null}}function rr(t,e){let i="";for(const r of t)r.literal?i+=r.val:i+=e(r.val);return i}const ar={D:Wt,DD:Yt,DDD:Qt,DDDD:Kt,t:Xt,tt:te,ttt:ee,tttt:ie,T:re,TT:ae,TTT:ne,TTTT:se,f:oe,ff:ce,fff:ue,ffff:ge,F:le,FF:de,FFF:he,FFFF:me};class nr{static create(t,e={}){return new nr(t,e)}static parseFormat(t){let e=null,i="",r=!1;const a=[];for(let n=0;n<t.length;n++){const s=t.charAt(n);"'"===s?((i.length>0||r)&&a.push({literal:r||/^\s+$/.test(i),val:""===i?"'":i}),e=null,i="",r=!r):r||s===e?i+=s:(i.length>0&&a.push({literal:/^\s+$/.test(i),val:i}),i=s,e=s)}return i.length>0&&a.push({literal:r||/^\s+$/.test(i),val:i}),a}static macroTokenToFormatOpts(t){return ar[t]}constructor(t,e){this.opts=e,this.loc=t,this.systemLoc=null}formatWithSystemDefault(t,e){null===this.systemLoc&&(this.systemLoc=this.loc.redefaultToSystem());return this.systemLoc.dtFormatter(t,{...this.opts,...e}).format()}dtFormatter(t,e={}){return this.loc.dtFormatter(t,{...this.opts,...e})}formatDateTime(t,e){return this.dtFormatter(t,e).format()}formatDateTimeParts(t,e){return this.dtFormatter(t,e).formatToParts()}formatInterval(t,e){return this.dtFormatter(t.start,e).dtf.formatRange(t.start.toJSDate(),t.end.toJSDate())}resolvedOptions(t,e){return this.dtFormatter(t,e).resolvedOptions()}num(t,e=0,i=void 0){if(this.opts.forceSimple)return Ci(t,e);const r={...this.opts};return e>0&&(r.padTo=e),i&&(r.signDisplay=i),this.loc.numberFormatter(r).format(t)}formatDateTimeFromString(t,e){const i="en"===this.loc.listingMode(),r=this.loc.outputCalendar&&"gregory"!==this.loc.outputCalendar,a=(e,i)=>this.loc.extract(t,e,i),n=e=>t.isOffsetFixed&&0===t.offset&&e.allowZ?"Z":t.isValid?t.zone.formatOffset(t.ts,e.format):"",s=()=>i?function(t){return Ki[t.hour<12?0:1]}(t):a({hour:"numeric",hourCycle:"h12"},"dayperiod"),o=(e,r)=>i?function(t,e){return qi(e)[t.month-1]}(t,e):a(r?{month:e}:{month:e,day:"numeric"},"month"),l=(e,r)=>i?function(t,e){return Qi(e)[t.weekday-1]}(t,e):a(r?{weekday:e}:{weekday:e,month:"long",day:"numeric"},"weekday"),c=e=>{const i=nr.macroTokenToFormatOpts(e);return i?this.formatWithSystemDefault(t,i):e},d=e=>i?function(t,e){return ir(e)[t.year<0?0:1]}(t,e):a({era:e},"era");return rr(nr.parseFormat(e),e=>{switch(e){case"S":return this.num(t.millisecond);case"u":case"SSS":return this.num(t.millisecond,3);case"s":return this.num(t.second);case"ss":return this.num(t.second,2);case"uu":return this.num(Math.floor(t.millisecond/10),2);case"uuu":return this.num(Math.floor(t.millisecond/100));case"m":return this.num(t.minute);case"mm":return this.num(t.minute,2);case"h":return this.num(t.hour%12==0?12:t.hour%12);case"hh":return this.num(t.hour%12==0?12:t.hour%12,2);case"H":return this.num(t.hour);case"HH":return this.num(t.hour,2);case"Z":return n({format:"narrow",allowZ:this.opts.allowZ});case"ZZ":return n({format:"short",allowZ:this.opts.allowZ});case"ZZZ":return n({format:"techie",allowZ:this.opts.allowZ});case"ZZZZ":return t.zone.offsetName(t.ts,{format:"short",locale:this.loc.locale});case"ZZZZZ":return t.zone.offsetName(t.ts,{format:"long",locale:this.loc.locale});case"z":return t.zoneName;case"a":return s();case"d":return r?a({day:"numeric"},"day"):this.num(t.day);case"dd":return r?a({day:"2-digit"},"day"):this.num(t.day,2);case"c":case"E":return this.num(t.weekday);case"ccc":return l("short",!0);case"cccc":return l("long",!0);case"ccccc":return l("narrow",!0);case"EEE":return l("short",!1);case"EEEE":return l("long",!1);case"EEEEE":return l("narrow",!1);case"L":return r?a({month:"numeric",day:"numeric"},"month"):this.num(t.month);case"LL":return r?a({month:"2-digit",day:"numeric"},"month"):this.num(t.month,2);case"LLL":return o("short",!0);case"LLLL":return o("long",!0);case"LLLLL":return o("narrow",!0);case"M":return r?a({month:"numeric"},"month"):this.num(t.month);case"MM":return r?a({month:"2-digit"},"month"):this.num(t.month,2);case"MMM":return o("short",!1);case"MMMM":return o("long",!1);case"MMMMM":return o("narrow",!1);case"y":return r?a({year:"numeric"},"year"):this.num(t.year);case"yy":return r?a({year:"2-digit"},"year"):this.num(t.year.toString().slice(-2),2);case"yyyy":return r?a({year:"numeric"},"year"):this.num(t.year,4);case"yyyyyy":return r?a({year:"numeric"},"year"):this.num(t.year,6);case"G":return d("short");case"GG":return d("long");case"GGGGG":return d("narrow");case"kk":return this.num(t.weekYear.toString().slice(-2),2);case"kkkk":return this.num(t.weekYear,4);case"W":return this.num(t.weekNumber);case"WW":return this.num(t.weekNumber,2);case"n":return this.num(t.localWeekNumber);case"nn":return this.num(t.localWeekNumber,2);case"ii":return this.num(t.localWeekYear.toString().slice(-2),2);case"iiii":return this.num(t.localWeekYear,4);case"o":return this.num(t.ordinal);case"ooo":return this.num(t.ordinal,3);case"q":return this.num(t.quarter);case"qq":return this.num(t.quarter,2);case"X":return this.num(Math.floor(t.ts/1e3));case"x":return this.num(t.ts);default:return c(e)}})}formatDurationFromString(t,e){const i="negativeLargestOnly"===this.opts.signMode?-1:1,r=t=>{switch(t[0]){case"S":return"milliseconds";case"s":return"seconds";case"m":return"minutes";case"h":return"hours";case"d":return"days";case"w":return"weeks";case"M":return"months";case"y":return"years";default:return null}},a=nr.parseFormat(e),n=a.reduce((t,{literal:e,val:i})=>e?t:t.concat(i),[]),s=t.shiftTo(...n.map(r).filter(t=>t));return rr(a,((t,e)=>a=>{const n=r(a);if(n){const r=e.isNegativeDuration&&n!==e.largestUnit?i:1;let s;return s="negativeLargestOnly"===this.opts.signMode&&n!==e.largestUnit?"never":"all"===this.opts.signMode?"always":"auto",this.num(t.get(n)*r,a.length,s)}return a})(s,{isNegativeDuration:s<0,largestUnit:Object.keys(s.values)[0]}))}}const sr=/[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;function or(...t){const e=t.reduce((t,e)=>t+e.source,"");return RegExp(`^${e}$`)}function lr(...t){return e=>t.reduce(([t,i,r],a)=>{const[n,s,o]=a(e,r);return[{...t,...n},s||i,o]},[{},null,1]).slice(0,2)}function cr(t,...e){if(null==t)return[null,null];for(const[i,r]of e){const e=i.exec(t);if(e)return r(e)}return[null,null]}function dr(...t){return(e,i)=>{const r={};let a;for(a=0;a<t.length;a++)r[t[a]]=ki(e[i+a]);return[r,null,i+a]}}const pr=/(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/,ur=/(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/,hr=RegExp(`${ur.source}${`(?:${pr.source}?(?:\\[(${sr.source})\\])?)?`}`),gr=RegExp(`(?:[Tt]${hr.source})?`),mr=dr("weekYear","weekNumber","weekDay"),fr=dr("year","ordinal"),vr=RegExp(`${ur.source} ?(?:${pr.source}|(${sr.source}))?`),yr=RegExp(`(?: ${vr.source})?`);function br(t,e,i){const r=t[e];return vi(r)?i:ki(r)}function wr(t,e){return[{hours:br(t,e,0),minutes:br(t,e+1,0),seconds:br(t,e+2,0),milliseconds:Mi(t[e+3])},null,e+4]}function xr(t,e){const i=!t[e]&&!t[e+1],r=Hi(t[e+1],t[e+2]);return[{},i?null:He.instance(r),e+3]}function _r(t,e){return[{},t[e]?_e.create(t[e]):null,e+1]}const $r=RegExp(`^T?${ur.source}$`),Dr=/^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;function Sr(t){const[e,i,r,a,n,s,o,l,c]=t,d="-"===e[0],p=l&&"-"===l[0],u=(t,e=!1)=>void 0!==t&&(e||t&&d)?-t:t;return[{years:u(Ai(i)),months:u(Ai(r)),weeks:u(Ai(a)),days:u(Ai(n)),hours:u(Ai(s)),minutes:u(Ai(o)),seconds:u(Ai(l),"-0"===l),milliseconds:u(Mi(c),p)}]}const Cr={GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function kr(t,e,i,r,a,n,s){const o={year:2===e.length?zi(ki(e)):ki(e),month:Zi.indexOf(i)+1,day:ki(r),hour:ki(a),minute:ki(n)};return s&&(o.second=ki(s)),t&&(o.weekday=t.length>3?Wi.indexOf(t)+1:Yi.indexOf(t)+1),o}const Ar=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;function Mr(t){const[,e,i,r,a,n,s,o,l,c,d,p]=t,u=kr(e,a,r,i,n,s,o);let h;return h=l?Cr[l]:c?0:Hi(d,p),[u,new He(h)]}const Tr=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/,Er=/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/,Lr=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;function Or(t){const[,e,i,r,a,n,s,o]=t;return[kr(e,a,r,i,n,s,o),He.utcInstance]}function Ir(t){const[,e,i,r,a,n,s,o]=t;return[kr(e,o,i,r,a,n,s),He.utcInstance]}const Nr=or(/([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/,gr),Vr=or(/(\d{4})-?W(\d\d)(?:-?(\d))?/,gr),zr=or(/(\d{4})-?(\d{3})/,gr),Pr=or(hr),Hr=lr(function(t,e){return[{year:br(t,e),month:br(t,e+1,1),day:br(t,e+2,1)},null,e+3]},wr,xr,_r),Fr=lr(mr,wr,xr,_r),Rr=lr(fr,wr,xr,_r),Gr=lr(wr,xr,_r);const jr=lr(wr);const Ur=or(/(\d{4})-(\d\d)-(\d\d)/,yr),Zr=or(vr),Br=lr(wr,xr,_r);const qr="Invalid Duration",Wr={weeks:{days:7,hours:168,minutes:10080,seconds:604800,milliseconds:6048e5},days:{hours:24,minutes:1440,seconds:86400,milliseconds:864e5},hours:{minutes:60,seconds:3600,milliseconds:36e5},minutes:{seconds:60,milliseconds:6e4},seconds:{milliseconds:1e3}},Yr={years:{quarters:4,months:12,weeks:52,days:365,hours:8760,minutes:525600,seconds:31536e3,milliseconds:31536e6},quarters:{months:3,weeks:13,days:91,hours:2184,minutes:131040,seconds:7862400,milliseconds:78624e5},months:{weeks:4,days:30,hours:720,minutes:43200,seconds:2592e3,milliseconds:2592e6},...Wr},Jr=365.2425,Qr=30.436875,Kr={years:{quarters:4,months:12,weeks:52.1775,days:Jr,hours:8765.82,minutes:525949.2,seconds:525949.2*60,milliseconds:525949.2*60*1e3},quarters:{months:3,weeks:13.044375,days:91.310625,hours:2191.455,minutes:131487.3,seconds:525949.2*60/4,milliseconds:7889237999.999999},months:{weeks:4.3481250000000005,days:Qr,hours:730.485,minutes:43829.1,seconds:2629746,milliseconds:2629746e3},...Wr},Xr=["years","quarters","months","weeks","days","hours","minutes","seconds","milliseconds"],ta=Xr.slice(0).reverse();function ea(t,e,i=!1){const r={values:i?e.values:{...t.values,...e.values||{}},loc:t.loc.clone(e.loc),conversionAccuracy:e.conversionAccuracy||t.conversionAccuracy,matrix:e.matrix||t.matrix};return new na(r)}function ia(t,e){let i=e.milliseconds??0;for(const r of ta.slice(1))e[r]&&(i+=e[r]*t[r].milliseconds);return i}function ra(t,e){const i=ia(t,e)<0?-1:1;Xr.reduceRight((r,a)=>{if(vi(e[a]))return r;if(r){const n=e[r]*i,s=t[a][r],o=Math.floor(n/s);e[a]+=o*i,e[r]-=o*s*i}return a},null),Xr.reduce((i,r)=>{if(vi(e[r]))return i;if(i){const a=e[i]%1;e[i]-=a,e[r]+=a*t[i][r]}return r},null)}function aa(t){const e={};for(const[i,r]of Object.entries(t))0!==r&&(e[i]=r);return e}class na{constructor(t){const e="longterm"===t.conversionAccuracy||!1;let i=e?Kr:Yr;t.matrix&&(i=t.matrix),this.values=t.values,this.loc=t.loc||ze.create(),this.conversionAccuracy=e?"longterm":"casual",this.invalid=t.invalid||null,this.matrix=i,this.isLuxonDuration=!0}static fromMillis(t,e){return na.fromObject({milliseconds:t},e)}static fromObject(t,e={}){if(null==t||"object"!=typeof t)throw new jt("Duration.fromObject: argument expected to be an object, got "+(null===t?"null":typeof t));return new na({values:Ri(t,na.normalizeUnit),loc:ze.fromObject(e),conversionAccuracy:e.conversionAccuracy,matrix:e.matrix})}static fromDurationLike(t){if(yi(t))return na.fromMillis(t);if(na.isDuration(t))return t;if("object"==typeof t)return na.fromObject(t);throw new jt(`Unknown duration argument ${t} of type ${typeof t}`)}static fromISO(t,e){const[i]=function(t){return cr(t,[Dr,Sr])}(t);return i?na.fromObject(i,e):na.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static fromISOTime(t,e){const[i]=function(t){return cr(t,[$r,jr])}(t);return i?na.fromObject(i,e):na.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static invalid(t,e=null){if(!t)throw new jt("need to specify a reason the Duration is invalid");const i=t instanceof ii?t:new ii(t,e);if(ei.throwOnInvalid)throw new Ft(i);return new na({invalid:i})}static normalizeUnit(t){const e={year:"years",years:"years",quarter:"quarters",quarters:"quarters",month:"months",months:"months",week:"weeks",weeks:"weeks",day:"days",days:"days",hour:"hours",hours:"hours",minute:"minutes",minutes:"minutes",second:"seconds",seconds:"seconds",millisecond:"milliseconds",milliseconds:"milliseconds"}[t?t.toLowerCase():t];if(!e)throw new Gt(t);return e}static isDuration(t){return t&&t.isLuxonDuration||!1}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}toFormat(t,e={}){const i={...e,floor:!1!==e.round&&!1!==e.floor};return this.isValid?nr.create(this.loc,i).formatDurationFromString(this,t):qr}toHuman(t={}){if(!this.isValid)return qr;const e=!1!==t.showZeros,i=Xr.map(i=>{const r=this.values[i];return vi(r)||0===r&&!e?null:this.loc.numberFormatter({style:"unit",unitDisplay:"long",...t,unit:i.slice(0,-1)}).format(r)}).filter(t=>t);return this.loc.listFormatter({type:"conjunction",style:t.listStyle||"narrow",...t}).format(i)}toObject(){return this.isValid?{...this.values}:{}}toISO(){if(!this.isValid)return null;let t="P";return 0!==this.years&&(t+=this.years+"Y"),0===this.months&&0===this.quarters||(t+=this.months+3*this.quarters+"M"),0!==this.weeks&&(t+=this.weeks+"W"),0!==this.days&&(t+=this.days+"D"),0===this.hours&&0===this.minutes&&0===this.seconds&&0===this.milliseconds||(t+="T"),0!==this.hours&&(t+=this.hours+"H"),0!==this.minutes&&(t+=this.minutes+"M"),0===this.seconds&&0===this.milliseconds||(t+=Ti(this.seconds+this.milliseconds/1e3,3)+"S"),"P"===t&&(t+="T0S"),t}toISOTime(t={}){if(!this.isValid)return null;const e=this.toMillis();if(e<0||e>=864e5)return null;t={suppressMilliseconds:!1,suppressSeconds:!1,includePrefix:!1,format:"extended",...t,includeOffset:!1};return Ka.fromMillis(e,{zone:"UTC"}).toISOTime(t)}toJSON(){return this.toISO()}toString(){return this.toISO()}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Duration { values: ${JSON.stringify(this.values)} }`:`Duration { Invalid, reason: ${this.invalidReason} }`}toMillis(){return this.isValid?ia(this.matrix,this.values):NaN}valueOf(){return this.toMillis()}plus(t){if(!this.isValid)return this;const e=na.fromDurationLike(t),i={};for(const t of Xr)($i(e.values,t)||$i(this.values,t))&&(i[t]=e.get(t)+this.get(t));return ea(this,{values:i},!0)}minus(t){if(!this.isValid)return this;const e=na.fromDurationLike(t);return this.plus(e.negate())}mapUnits(t){if(!this.isValid)return this;const e={};for(const i of Object.keys(this.values))e[i]=Fi(t(this.values[i],i));return ea(this,{values:e},!0)}get(t){return this[na.normalizeUnit(t)]}set(t){if(!this.isValid)return this;return ea(this,{values:{...this.values,...Ri(t,na.normalizeUnit)}})}reconfigure({locale:t,numberingSystem:e,conversionAccuracy:i,matrix:r}={}){return ea(this,{loc:this.loc.clone({locale:t,numberingSystem:e}),matrix:r,conversionAccuracy:i})}as(t){return this.isValid?this.shiftTo(t).get(t):NaN}normalize(){if(!this.isValid)return this;const t=this.toObject();return ra(this.matrix,t),ea(this,{values:t},!0)}rescale(){if(!this.isValid)return this;return ea(this,{values:aa(this.normalize().shiftToAll().toObject())},!0)}shiftTo(...t){if(!this.isValid)return this;if(0===t.length)return this;t=t.map(t=>na.normalizeUnit(t));const e={},i={},r=this.toObject();let a;for(const n of Xr)if(t.indexOf(n)>=0){a=n;let t=0;for(const e in i)t+=this.matrix[e][n]*i[e],i[e]=0;yi(r[n])&&(t+=r[n]);const s=Math.trunc(t);e[n]=s,i[n]=(1e3*t-1e3*s)/1e3}else yi(r[n])&&(i[n]=r[n]);for(const t in i)0!==i[t]&&(e[a]+=t===a?i[t]:i[t]/this.matrix[a][t]);return ra(this.matrix,e),ea(this,{values:e},!0)}shiftToAll(){return this.isValid?this.shiftTo("years","months","weeks","days","hours","minutes","seconds","milliseconds"):this}negate(){if(!this.isValid)return this;const t={};for(const e of Object.keys(this.values))t[e]=0===this.values[e]?0:-this.values[e];return ea(this,{values:t},!0)}removeZeros(){if(!this.isValid)return this;return ea(this,{values:aa(this.values)},!0)}get years(){return this.isValid?this.values.years||0:NaN}get quarters(){return this.isValid?this.values.quarters||0:NaN}get months(){return this.isValid?this.values.months||0:NaN}get weeks(){return this.isValid?this.values.weeks||0:NaN}get days(){return this.isValid?this.values.days||0:NaN}get hours(){return this.isValid?this.values.hours||0:NaN}get minutes(){return this.isValid?this.values.minutes||0:NaN}get seconds(){return this.isValid?this.values.seconds||0:NaN}get milliseconds(){return this.isValid?this.values.milliseconds||0:NaN}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}equals(t){if(!this.isValid||!t.isValid)return!1;if(!this.loc.equals(t.loc))return!1;function e(t,e){return void 0===t||0===t?void 0===e||0===e:t===e}for(const i of Xr)if(!e(this.values[i],t.values[i]))return!1;return!0}}const sa="Invalid Interval";class oa{constructor(t){this.s=t.start,this.e=t.end,this.invalid=t.invalid||null,this.isLuxonInterval=!0}static invalid(t,e=null){if(!t)throw new jt("need to specify a reason the Interval is invalid");const i=t instanceof ii?t:new ii(t,e);if(ei.throwOnInvalid)throw new Ht(i);return new oa({invalid:i})}static fromDateTimes(t,e){const i=Xa(t),r=Xa(e),a=function(t,e){return t&&t.isValid?e&&e.isValid?e<t?oa.invalid("end before start",`The end of an interval must be after its start, but you had start=${t.toISO()} and end=${e.toISO()}`):null:oa.invalid("missing or invalid end"):oa.invalid("missing or invalid start")}(i,r);return null==a?new oa({start:i,end:r}):a}static after(t,e){const i=na.fromDurationLike(e),r=Xa(t);return oa.fromDateTimes(r,r.plus(i))}static before(t,e){const i=na.fromDurationLike(e),r=Xa(t);return oa.fromDateTimes(r.minus(i),r)}static fromISO(t,e){const[i,r]=(t||"").split("/",2);if(i&&r){let t,a,n,s;try{t=Ka.fromISO(i,e),a=t.isValid}catch(r){a=!1}try{n=Ka.fromISO(r,e),s=n.isValid}catch(r){s=!1}if(a&&s)return oa.fromDateTimes(t,n);if(a){const i=na.fromISO(r,e);if(i.isValid)return oa.after(t,i)}else if(s){const t=na.fromISO(i,e);if(t.isValid)return oa.before(n,t)}}return oa.invalid("unparsable",`the input "${t}" can't be parsed as ISO 8601`)}static isInterval(t){return t&&t.isLuxonInterval||!1}get start(){return this.isValid?this.s:null}get end(){return this.isValid?this.e:null}get lastDateTime(){return this.isValid&&this.e?this.e.minus(1):null}get isValid(){return null===this.invalidReason}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}length(t="milliseconds"){return this.isValid?this.toDuration(t).get(t):NaN}count(t="milliseconds",e){if(!this.isValid)return NaN;const i=this.start.startOf(t,e);let r;return r=e?.useLocaleWeeks?this.end.reconfigure({locale:i.locale}):this.end,r=r.startOf(t,e),Math.floor(r.diff(i,t).get(t))+(r.valueOf()!==this.end.valueOf())}hasSame(t){return!!this.isValid&&(this.isEmpty()||this.e.minus(1).hasSame(this.s,t))}isEmpty(){return this.s.valueOf()===this.e.valueOf()}isAfter(t){return!!this.isValid&&this.s>t}isBefore(t){return!!this.isValid&&this.e<=t}contains(t){return!!this.isValid&&(this.s<=t&&this.e>t)}set({start:t,end:e}={}){return this.isValid?oa.fromDateTimes(t||this.s,e||this.e):this}splitAt(...t){if(!this.isValid)return[];const e=t.map(Xa).filter(t=>this.contains(t)).sort((t,e)=>t.toMillis()-e.toMillis()),i=[];let{s:r}=this,a=0;for(;r<this.e;){const t=e[a]||this.e,n=+t>+this.e?this.e:t;i.push(oa.fromDateTimes(r,n)),r=n,a+=1}return i}splitBy(t){const e=na.fromDurationLike(t);if(!this.isValid||!e.isValid||0===e.as("milliseconds"))return[];let i,{s:r}=this,a=1;const n=[];for(;r<this.e;){const t=this.start.plus(e.mapUnits(t=>t*a));i=+t>+this.e?this.e:t,n.push(oa.fromDateTimes(r,i)),r=i,a+=1}return n}divideEqually(t){return this.isValid?this.splitBy(this.length()/t).slice(0,t):[]}overlaps(t){return this.e>t.s&&this.s<t.e}abutsStart(t){return!!this.isValid&&+this.e===+t.s}abutsEnd(t){return!!this.isValid&&+t.e===+this.s}engulfs(t){return!!this.isValid&&(this.s<=t.s&&this.e>=t.e)}equals(t){return!(!this.isValid||!t.isValid)&&(this.s.equals(t.s)&&this.e.equals(t.e))}intersection(t){if(!this.isValid)return this;const e=this.s>t.s?this.s:t.s,i=this.e<t.e?this.e:t.e;return e>=i?null:oa.fromDateTimes(e,i)}union(t){if(!this.isValid)return this;const e=this.s<t.s?this.s:t.s,i=this.e>t.e?this.e:t.e;return oa.fromDateTimes(e,i)}static merge(t){const[e,i]=t.sort((t,e)=>t.s-e.s).reduce(([t,e],i)=>e?e.overlaps(i)||e.abutsStart(i)?[t,e.union(i)]:[t.concat([e]),i]:[t,i],[[],null]);return i&&e.push(i),e}static xor(t){let e=null,i=0;const r=[],a=t.map(t=>[{time:t.s,type:"s"},{time:t.e,type:"e"}]),n=Array.prototype.concat(...a).sort((t,e)=>t.time-e.time);for(const t of n)i+="s"===t.type?1:-1,1===i?e=t.time:(e&&+e!==+t.time&&r.push(oa.fromDateTimes(e,t.time)),e=null);return oa.merge(r)}difference(...t){return oa.xor([this].concat(t)).map(t=>this.intersection(t)).filter(t=>t&&!t.isEmpty())}toString(){return this.isValid?`[${this.s.toISO()} – ${this.e.toISO()})`:sa}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`:`Interval { Invalid, reason: ${this.invalidReason} }`}toLocaleString(t=Wt,e={}){return this.isValid?nr.create(this.s.loc.clone(e),t).formatInterval(this):sa}toISO(t){return this.isValid?`${this.s.toISO(t)}/${this.e.toISO(t)}`:sa}toISODate(){return this.isValid?`${this.s.toISODate()}/${this.e.toISODate()}`:sa}toISOTime(t){return this.isValid?`${this.s.toISOTime(t)}/${this.e.toISOTime(t)}`:sa}toFormat(t,{separator:e=" – "}={}){return this.isValid?`${this.s.toFormat(t)}${e}${this.e.toFormat(t)}`:sa}toDuration(t,e){return this.isValid?this.e.diff(this.s,t,e):na.invalid(this.invalidReason)}mapEndpoints(t){return oa.fromDateTimes(t(this.s),t(this.e))}}class la{static hasDST(t=ei.defaultZone){const e=Ka.now().setZone(t).set({month:12});return!t.isUniversal&&e.offset!==e.set({month:6}).offset}static isValidIANAZone(t){return _e.isValidZone(t)}static normalizeZone(t){return Re(t,ei.defaultZone)}static getStartOfWeek({locale:t=null,locObj:e=null}={}){return(e||ze.create(t)).getStartOfWeek()}static getMinimumDaysInFirstWeek({locale:t=null,locObj:e=null}={}){return(e||ze.create(t)).getMinDaysInFirstWeek()}static getWeekendWeekdays({locale:t=null,locObj:e=null}={}){return(e||ze.create(t)).getWeekendDays().slice()}static months(t="long",{locale:e=null,numberingSystem:i=null,locObj:r=null,outputCalendar:a="gregory"}={}){return(r||ze.create(e,i,a)).months(t)}static monthsFormat(t="long",{locale:e=null,numberingSystem:i=null,locObj:r=null,outputCalendar:a="gregory"}={}){return(r||ze.create(e,i,a)).months(t,!0)}static weekdays(t="long",{locale:e=null,numberingSystem:i=null,locObj:r=null}={}){return(r||ze.create(e,i,null)).weekdays(t)}static weekdaysFormat(t="long",{locale:e=null,numberingSystem:i=null,locObj:r=null}={}){return(r||ze.create(e,i,null)).weekdays(t,!0)}static meridiems({locale:t=null}={}){return ze.create(t).meridiems()}static eras(t="short",{locale:e=null}={}){return ze.create(e,null,"gregory").eras(t)}static features(){return{relative:wi(),localeWeek:xi()}}}function ca(t,e){const i=t=>t.toUTC(0,{keepLocalTime:!0}).startOf("day").valueOf(),r=i(e)-i(t);return Math.floor(na.fromMillis(r).as("days"))}function da(t,e,i,r){let[a,n,s,o]=function(t,e,i){const r=[["years",(t,e)=>e.year-t.year],["quarters",(t,e)=>e.quarter-t.quarter+4*(e.year-t.year)],["months",(t,e)=>e.month-t.month+12*(e.year-t.year)],["weeks",(t,e)=>{const i=ca(t,e);return(i-i%7)/7}],["days",ca]],a={},n=t;let s,o;for(const[l,c]of r)i.indexOf(l)>=0&&(s=l,a[l]=c(t,e),o=n.plus(a),o>e?(a[l]--,(t=n.plus(a))>e&&(o=t,a[l]--,t=n.plus(a))):t=o);return[t,a,o,s]}(t,e,i);const l=e-a,c=i.filter(t=>["hours","minutes","seconds","milliseconds"].indexOf(t)>=0);0===c.length&&(s<e&&(s=a.plus({[o]:1})),s!==a&&(n[o]=(n[o]||0)+l/(s-a)));const d=na.fromObject(n,r);return c.length>0?na.fromMillis(l,r).shiftTo(...c).plus(d):d}function pa(t,e=t=>t){return{regex:t,deser:([t])=>e(function(t){let e=parseInt(t,10);if(isNaN(e)){e="";for(let i=0;i<t.length;i++){const r=t.charCodeAt(i);if(-1!==t[i].search(Ge.hanidec))e+=Ue.indexOf(t[i]);else for(const t in je){const[i,a]=je[t];r>=i&&r<=a&&(e+=r-i)}}return parseInt(e,10)}return e}(t))}}const ua=`[ ${String.fromCharCode(160)}]`,ha=new RegExp(ua,"g");function ga(t){return t.replace(/\./g,"\\.?").replace(ha,ua)}function ma(t){return t.replace(/\./g,"").replace(ha," ").toLowerCase()}function fa(t,e){return null===t?null:{regex:RegExp(t.map(ga).join("|")),deser:([i])=>t.findIndex(t=>ma(i)===ma(t))+e}}function va(t,e){return{regex:t,deser:([,t,e])=>Hi(t,e),groups:e}}function ya(t){return{regex:t,deser:([t])=>t}}const ba={year:{"2-digit":"yy",numeric:"yyyyy"},month:{numeric:"M","2-digit":"MM",short:"MMM",long:"MMMM"},day:{numeric:"d","2-digit":"dd"},weekday:{short:"EEE",long:"EEEE"},dayperiod:"a",dayPeriod:"a",hour12:{numeric:"h","2-digit":"hh"},hour24:{numeric:"H","2-digit":"HH"},minute:{numeric:"m","2-digit":"mm"},second:{numeric:"s","2-digit":"ss"},timeZoneName:{long:"ZZZZZ",short:"ZZZ"}};let wa=null;function xa(t,e){return Array.prototype.concat(...t.map(t=>function(t,e){if(t.literal)return t;const i=Da(nr.macroTokenToFormatOpts(t.val),e);return null==i||i.includes(void 0)?t:i}(t,e)))}class _a{constructor(t,e){if(this.locale=t,this.format=e,this.tokens=xa(nr.parseFormat(e),t),this.units=this.tokens.map(e=>function(t,e){const i=Be(e),r=Be(e,"{2}"),a=Be(e,"{3}"),n=Be(e,"{4}"),s=Be(e,"{6}"),o=Be(e,"{1,2}"),l=Be(e,"{1,3}"),c=Be(e,"{1,6}"),d=Be(e,"{1,9}"),p=Be(e,"{2,4}"),u=Be(e,"{4,6}"),h=t=>{return{regex:RegExp((e=t.val,e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g,"\\$&"))),deser:([t])=>t,literal:!0};var e},g=(g=>{if(t.literal)return h(g);switch(g.val){case"G":return fa(e.eras("short"),0);case"GG":return fa(e.eras("long"),0);case"y":return pa(c);case"yy":case"kk":return pa(p,zi);case"yyyy":case"kkkk":return pa(n);case"yyyyy":return pa(u);case"yyyyyy":return pa(s);case"M":case"L":case"d":case"H":case"h":case"m":case"q":case"s":case"W":return pa(o);case"MM":case"LL":case"dd":case"HH":case"hh":case"mm":case"qq":case"ss":case"WW":return pa(r);case"MMM":return fa(e.months("short",!0),1);case"MMMM":return fa(e.months("long",!0),1);case"LLL":return fa(e.months("short",!1),1);case"LLLL":return fa(e.months("long",!1),1);case"o":case"S":return pa(l);case"ooo":case"SSS":return pa(a);case"u":return ya(d);case"uu":return ya(o);case"uuu":case"E":case"c":return pa(i);case"a":return fa(e.meridiems(),0);case"EEE":return fa(e.weekdays("short",!1),1);case"EEEE":return fa(e.weekdays("long",!1),1);case"ccc":return fa(e.weekdays("short",!0),1);case"cccc":return fa(e.weekdays("long",!0),1);case"Z":case"ZZ":return va(new RegExp(`([+-]${o.source})(?::(${r.source}))?`),2);case"ZZZ":return va(new RegExp(`([+-]${o.source})(${r.source})?`),2);case"z":return ya(/[a-z_+-/]{1,256}?/i);case" ":return ya(/[^\S\n\r]/);default:return h(g)}})(t)||{invalidReason:"missing Intl.DateTimeFormat.formatToParts support"};return g.token=t,g}(e,t)),this.disqualifyingUnit=this.units.find(t=>t.invalidReason),!this.disqualifyingUnit){const[t,e]=function(t){const e=t.map(t=>t.regex).reduce((t,e)=>`${t}(${e.source})`,"");return[`^${e}$`,t]}(this.units);this.regex=RegExp(t,"i"),this.handlers=e}}explainFromTokens(t){if(this.isValid){const[e,i]=function(t,e,i){const r=t.match(e);if(r){const t={};let e=1;for(const a in i)if($i(i,a)){const n=i[a],s=n.groups?n.groups+1:1;!n.literal&&n.token&&(t[n.token.val[0]]=n.deser(r.slice(e,e+s))),e+=s}return[r,t]}return[r,{}]}(t,this.regex,this.handlers),[r,a,n]=i?function(t){let e,i=null;vi(t.z)||(i=_e.create(t.z)),vi(t.Z)||(i||(i=new He(t.Z)),e=t.Z),vi(t.q)||(t.M=3*(t.q-1)+1),vi(t.h)||(t.h<12&&1===t.a?t.h+=12:12===t.h&&0===t.a&&(t.h=0)),0===t.G&&t.y&&(t.y=-t.y),vi(t.u)||(t.S=Mi(t.u));const r=Object.keys(t).reduce((e,i)=>{const r=(t=>{switch(t){case"S":return"millisecond";case"s":return"second";case"m":return"minute";case"h":case"H":return"hour";case"d":return"day";case"o":return"ordinal";case"L":case"M":return"month";case"y":return"year";case"E":case"c":return"weekday";case"W":return"weekNumber";case"k":return"weekYear";case"q":return"quarter";default:return null}})(i);return r&&(e[r]=t[i]),e},{});return[r,i,e]}(i):[null,null,void 0];if($i(i,"a")&&$i(i,"H"))throw new Rt("Can't include meridiem when specifying 24-hour format");return{input:t,tokens:this.tokens,regex:this.regex,rawMatches:e,matches:i,result:r,zone:a,specificOffset:n}}return{input:t,tokens:this.tokens,invalidReason:this.invalidReason}}get isValid(){return!this.disqualifyingUnit}get invalidReason(){return this.disqualifyingUnit?this.disqualifyingUnit.invalidReason:null}}function $a(t,e,i){return new _a(t,i).explainFromTokens(e)}function Da(t,e){if(!t)return null;const i=nr.create(e,t).dtFormatter((wa||(wa=Ka.fromMillis(1555555555555)),wa)),r=i.formatToParts(),a=i.resolvedOptions();return r.map(e=>function(t,e,i){const{type:r,value:a}=t;if("literal"===r){const t=/^\s+$/.test(a);return{literal:!t,val:t?" ":a}}const n=e[r];let s=r;"hour"===r&&(s=null!=e.hour12?e.hour12?"hour12":"hour24":null!=e.hourCycle?"h11"===e.hourCycle||"h12"===e.hourCycle?"hour12":"hour24":i.hour12?"hour12":"hour24");let o=ba[s];if("object"==typeof o&&(o=o[n]),o)return{literal:!1,val:o}}(e,t,a))}const Sa="Invalid DateTime",Ca=864e13;function ka(t){return new ii("unsupported zone",`the zone "${t.name}" is not supported`)}function Aa(t){return null===t.weekData&&(t.weekData=di(t.c)),t.weekData}function Ma(t){return null===t.localWeekData&&(t.localWeekData=di(t.c,t.loc.getMinDaysInFirstWeek(),t.loc.getStartOfWeek())),t.localWeekData}function Ta(t,e){const i={ts:t.ts,zone:t.zone,c:t.c,o:t.o,loc:t.loc,invalid:t.invalid};return new Ka({...i,...e,old:i})}function Ea(t,e,i){let r=t-60*e*1e3;const a=i.offset(r);if(e===a)return[r,e];r-=60*(a-e)*1e3;const n=i.offset(r);return a===n?[r,a]:[t-60*Math.min(a,n)*1e3,Math.max(a,n)]}function La(t,e){const i=new Date(t+=60*e*1e3);return{year:i.getUTCFullYear(),month:i.getUTCMonth()+1,day:i.getUTCDate(),hour:i.getUTCHours(),minute:i.getUTCMinutes(),second:i.getUTCSeconds(),millisecond:i.getUTCMilliseconds()}}function Oa(t,e,i){return Ea(Ii(t),e,i)}function Ia(t,e){const i=t.o,r=t.c.year+Math.trunc(e.years),a=t.c.month+Math.trunc(e.months)+3*Math.trunc(e.quarters),n={...t.c,year:r,month:a,day:Math.min(t.c.day,Oi(r,a))+Math.trunc(e.days)+7*Math.trunc(e.weeks)},s=na.fromObject({years:e.years-Math.trunc(e.years),quarters:e.quarters-Math.trunc(e.quarters),months:e.months-Math.trunc(e.months),weeks:e.weeks-Math.trunc(e.weeks),days:e.days-Math.trunc(e.days),hours:e.hours,minutes:e.minutes,seconds:e.seconds,milliseconds:e.milliseconds}).as("milliseconds"),o=Ii(n);let[l,c]=Ea(o,i,t.zone);return 0!==s&&(l+=s,c=t.zone.offset(l)),{ts:l,o:c}}function Na(t,e,i,r,a,n){const{setZone:s,zone:o}=i;if(t&&0!==Object.keys(t).length||e){const r=e||o,a=Ka.fromObject(t,{...i,zone:r,specificOffset:n});return s?a:a.setZone(o)}return Ka.invalid(new ii("unparsable",`the input "${a}" can't be parsed as ${r}`))}function Va(t,e,i=!0){return t.isValid?nr.create(ze.create("en-US"),{allowZ:i,forceSimple:!0}).formatDateTimeFromString(t,e):null}function za(t,e,i){const r=t.c.year>9999||t.c.year<0;let a="";if(r&&t.c.year>=0&&(a+="+"),a+=Ci(t.c.year,r?6:4),"year"===i)return a;if(e){if(a+="-",a+=Ci(t.c.month),"month"===i)return a;a+="-"}else if(a+=Ci(t.c.month),"month"===i)return a;return a+=Ci(t.c.day),a}function Pa(t,e,i,r,a,n,s){let o=!i||0!==t.c.millisecond||0!==t.c.second,l="";switch(s){case"day":case"month":case"year":break;default:if(l+=Ci(t.c.hour),"hour"===s)break;if(e){if(l+=":",l+=Ci(t.c.minute),"minute"===s)break;o&&(l+=":",l+=Ci(t.c.second))}else{if(l+=Ci(t.c.minute),"minute"===s)break;o&&(l+=Ci(t.c.second))}if("second"===s)break;!o||r&&0===t.c.millisecond||(l+=".",l+=Ci(t.c.millisecond,3))}return a&&(t.isOffsetFixed&&0===t.offset&&!n?l+="Z":t.o<0?(l+="-",l+=Ci(Math.trunc(-t.o/60)),l+=":",l+=Ci(Math.trunc(-t.o%60))):(l+="+",l+=Ci(Math.trunc(t.o/60)),l+=":",l+=Ci(Math.trunc(t.o%60)))),n&&(l+="["+t.zone.ianaName+"]"),l}const Ha={month:1,day:1,hour:0,minute:0,second:0,millisecond:0},Fa={weekNumber:1,weekday:1,hour:0,minute:0,second:0,millisecond:0},Ra={ordinal:1,hour:0,minute:0,second:0,millisecond:0},Ga=["year","month","day","hour","minute","second","millisecond"],ja=["weekYear","weekNumber","weekday","hour","minute","second","millisecond"],Ua=["year","ordinal","hour","minute","second","millisecond"];function Za(t){const e={year:"year",years:"year",month:"month",months:"month",day:"day",days:"day",hour:"hour",hours:"hour",minute:"minute",minutes:"minute",quarter:"quarter",quarters:"quarter",second:"second",seconds:"second",millisecond:"millisecond",milliseconds:"millisecond",weekday:"weekday",weekdays:"weekday",weeknumber:"weekNumber",weeksnumber:"weekNumber",weeknumbers:"weekNumber",weekyear:"weekYear",weekyears:"weekYear",ordinal:"ordinal"}[t.toLowerCase()];if(!e)throw new Gt(t);return e}function Ba(t){switch(t.toLowerCase()){case"localweekday":case"localweekdays":return"localWeekday";case"localweeknumber":case"localweeknumbers":return"localWeekNumber";case"localweekyear":case"localweekyears":return"localWeekYear";default:return Za(t)}}function qa(t,e){const i=Re(e.zone,ei.defaultZone);if(!i.isValid)return Ka.invalid(ka(i));const r=ze.fromObject(e);let a,n;if(vi(t.year))a=ei.now();else{for(const e of Ga)vi(t[e])&&(t[e]=Ha[e]);const e=mi(t)||fi(t);if(e)return Ka.invalid(e);const r=function(t){if(void 0===Ja&&(Ja=ei.now()),"iana"!==t.type)return t.offset(Ja);const e=t.name;let i=Qa.get(e);return void 0===i&&(i=t.offset(Ja),Qa.set(e,i)),i}(i);[a,n]=Oa(t,r,i)}return new Ka({ts:a,zone:i,loc:r,o:n})}function Wa(t,e,i){const r=!!vi(i.round)||i.round,a=vi(i.rounding)?"trunc":i.rounding,n=(t,n)=>{t=Ti(t,r||i.calendary?0:2,i.calendary?"round":a);return e.loc.clone(i).relFormatter(i).format(t,n)},s=r=>i.calendary?e.hasSame(t,r)?0:e.startOf(r).diff(t.startOf(r),r).get(r):e.diff(t,r).get(r);if(i.unit)return n(s(i.unit),i.unit);for(const t of i.units){const e=s(t);if(Math.abs(e)>=1)return n(e,t)}return n(t>e?-0:0,i.units[i.units.length-1])}function Ya(t){let e,i={};return t.length>0&&"object"==typeof t[t.length-1]?(i=t[t.length-1],e=Array.from(t).slice(0,t.length-1)):e=Array.from(t),[i,e]}let Ja;const Qa=new Map;class Ka{constructor(t){const e=t.zone||ei.defaultZone;let i=t.invalid||(Number.isNaN(t.ts)?new ii("invalid input"):null)||(e.isValid?null:ka(e));this.ts=vi(t.ts)?ei.now():t.ts;let r=null,a=null;if(!i){if(t.old&&t.old.ts===this.ts&&t.old.zone.equals(e))[r,a]=[t.old.c,t.old.o];else{const n=yi(t.o)&&!t.old?t.o:e.offset(this.ts);r=La(this.ts,n),i=Number.isNaN(r.year)?new ii("invalid input"):null,r=i?null:r,a=i?null:n}}this._zone=e,this.loc=t.loc||ze.create(),this.invalid=i,this.weekData=null,this.localWeekData=null,this.c=r,this.o=a,this.isLuxonDateTime=!0}static now(){return new Ka({})}static local(){const[t,e]=Ya(arguments),[i,r,a,n,s,o,l]=e;return qa({year:i,month:r,day:a,hour:n,minute:s,second:o,millisecond:l},t)}static utc(){const[t,e]=Ya(arguments),[i,r,a,n,s,o,l]=e;return t.zone=He.utcInstance,qa({year:i,month:r,day:a,hour:n,minute:s,second:o,millisecond:l},t)}static fromJSDate(t,e={}){const i=function(t){return"[object Date]"===Object.prototype.toString.call(t)}(t)?t.valueOf():NaN;if(Number.isNaN(i))return Ka.invalid("invalid input");const r=Re(e.zone,ei.defaultZone);return r.isValid?new Ka({ts:i,zone:r,loc:ze.fromObject(e)}):Ka.invalid(ka(r))}static fromMillis(t,e={}){if(yi(t))return t<-Ca||t>Ca?Ka.invalid("Timestamp out of range"):new Ka({ts:t,zone:Re(e.zone,ei.defaultZone),loc:ze.fromObject(e)});throw new jt(`fromMillis requires a numerical input, but received a ${typeof t} with value ${t}`)}static fromSeconds(t,e={}){if(yi(t))return new Ka({ts:1e3*t,zone:Re(e.zone,ei.defaultZone),loc:ze.fromObject(e)});throw new jt("fromSeconds requires a numerical input")}static fromObject(t,e={}){t=t||{};const i=Re(e.zone,ei.defaultZone);if(!i.isValid)return Ka.invalid(ka(i));const r=ze.fromObject(e),a=Ri(t,Ba),{minDaysInFirstWeek:n,startOfWeek:s}=gi(a,r),o=ei.now(),l=vi(e.specificOffset)?i.offset(o):e.specificOffset,c=!vi(a.ordinal),d=!vi(a.year),p=!vi(a.month)||!vi(a.day),u=d||p,h=a.weekYear||a.weekNumber;if((u||c)&&h)throw new Rt("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(p&&c)throw new Rt("Can't mix ordinal dates with month/day");const g=h||a.weekday&&!u;let m,f,v=La(o,l);g?(m=ja,f=Fa,v=di(v,n,s)):c?(m=Ua,f=Ra,v=ui(v)):(m=Ga,f=Ha);let y=!1;for(const t of m){vi(a[t])?a[t]=y?f[t]:v[t]:y=!0}const b=g?function(t,e=4,i=1){const r=bi(t.weekYear),a=Si(t.weekNumber,1,Vi(t.weekYear,e,i)),n=Si(t.weekday,1,7);return r?a?!n&&ni("weekday",t.weekday):ni("week",t.weekNumber):ni("weekYear",t.weekYear)}(a,n,s):c?function(t){const e=bi(t.year),i=Si(t.ordinal,1,Li(t.year));return e?!i&&ni("ordinal",t.ordinal):ni("year",t.year)}(a):mi(a),w=b||fi(a);if(w)return Ka.invalid(w);const x=g?pi(a,n,s):c?hi(a):a,[_,$]=Oa(x,l,i),D=new Ka({ts:_,zone:i,o:$,loc:r});return a.weekday&&u&&t.weekday!==D.weekday?Ka.invalid("mismatched weekday",`you can't specify both a weekday of ${a.weekday} and a date of ${D.toISO()}`):D.isValid?D:Ka.invalid(D.invalid)}static fromISO(t,e={}){const[i,r]=function(t){return cr(t,[Nr,Hr],[Vr,Fr],[zr,Rr],[Pr,Gr])}(t);return Na(i,r,e,"ISO 8601",t)}static fromRFC2822(t,e={}){const[i,r]=function(t){return cr(function(t){return t.replace(/\([^()]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").trim()}(t),[Ar,Mr])}(t);return Na(i,r,e,"RFC 2822",t)}static fromHTTP(t,e={}){const[i,r]=function(t){return cr(t,[Tr,Or],[Er,Or],[Lr,Ir])}(t);return Na(i,r,e,"HTTP",e)}static fromFormat(t,e,i={}){if(vi(t)||vi(e))throw new jt("fromFormat requires an input string and a format");const{locale:r=null,numberingSystem:a=null}=i,n=ze.fromOpts({locale:r,numberingSystem:a,defaultToEN:!0}),[s,o,l,c]=function(t,e,i){const{result:r,zone:a,specificOffset:n,invalidReason:s}=$a(t,e,i);return[r,a,n,s]}(n,t,e);return c?Ka.invalid(c):Na(s,o,i,`format ${e}`,t,l)}static fromString(t,e,i={}){return Ka.fromFormat(t,e,i)}static fromSQL(t,e={}){const[i,r]=function(t){return cr(t,[Ur,Hr],[Zr,Br])}(t);return Na(i,r,e,"SQL",t)}static invalid(t,e=null){if(!t)throw new jt("need to specify a reason the DateTime is invalid");const i=t instanceof ii?t:new ii(t,e);if(ei.throwOnInvalid)throw new Pt(i);return new Ka({invalid:i})}static isDateTime(t){return t&&t.isLuxonDateTime||!1}static parseFormatForOpts(t,e={}){const i=Da(t,ze.fromObject(e));return i?i.map(t=>t?t.val:null).join(""):null}static expandFormat(t,e={}){return xa(nr.parseFormat(t),ze.fromObject(e)).map(t=>t.val).join("")}static resetCache(){Ja=void 0,Qa.clear()}get(t){return this[t]}get isValid(){return null===this.invalid}get invalidReason(){return this.invalid?this.invalid.reason:null}get invalidExplanation(){return this.invalid?this.invalid.explanation:null}get locale(){return this.isValid?this.loc.locale:null}get numberingSystem(){return this.isValid?this.loc.numberingSystem:null}get outputCalendar(){return this.isValid?this.loc.outputCalendar:null}get zone(){return this._zone}get zoneName(){return this.isValid?this.zone.name:null}get year(){return this.isValid?this.c.year:NaN}get quarter(){return this.isValid?Math.ceil(this.c.month/3):NaN}get month(){return this.isValid?this.c.month:NaN}get day(){return this.isValid?this.c.day:NaN}get hour(){return this.isValid?this.c.hour:NaN}get minute(){return this.isValid?this.c.minute:NaN}get second(){return this.isValid?this.c.second:NaN}get millisecond(){return this.isValid?this.c.millisecond:NaN}get weekYear(){return this.isValid?Aa(this).weekYear:NaN}get weekNumber(){return this.isValid?Aa(this).weekNumber:NaN}get weekday(){return this.isValid?Aa(this).weekday:NaN}get isWeekend(){return this.isValid&&this.loc.getWeekendDays().includes(this.weekday)}get localWeekday(){return this.isValid?Ma(this).weekday:NaN}get localWeekNumber(){return this.isValid?Ma(this).weekNumber:NaN}get localWeekYear(){return this.isValid?Ma(this).weekYear:NaN}get ordinal(){return this.isValid?ui(this.c).ordinal:NaN}get monthShort(){return this.isValid?la.months("short",{locObj:this.loc})[this.month-1]:null}get monthLong(){return this.isValid?la.months("long",{locObj:this.loc})[this.month-1]:null}get weekdayShort(){return this.isValid?la.weekdays("short",{locObj:this.loc})[this.weekday-1]:null}get weekdayLong(){return this.isValid?la.weekdays("long",{locObj:this.loc})[this.weekday-1]:null}get offset(){return this.isValid?+this.o:NaN}get offsetNameShort(){return this.isValid?this.zone.offsetName(this.ts,{format:"short",locale:this.locale}):null}get offsetNameLong(){return this.isValid?this.zone.offsetName(this.ts,{format:"long",locale:this.locale}):null}get isOffsetFixed(){return this.isValid?this.zone.isUniversal:null}get isInDST(){return!this.isOffsetFixed&&(this.offset>this.set({month:1,day:1}).offset||this.offset>this.set({month:5}).offset)}getPossibleOffsets(){if(!this.isValid||this.isOffsetFixed)return[this];const t=864e5,e=6e4,i=Ii(this.c),r=this.zone.offset(i-t),a=this.zone.offset(i+t),n=this.zone.offset(i-r*e),s=this.zone.offset(i-a*e);if(n===s)return[this];const o=i-n*e,l=i-s*e,c=La(o,n),d=La(l,s);return c.hour===d.hour&&c.minute===d.minute&&c.second===d.second&&c.millisecond===d.millisecond?[Ta(this,{ts:o}),Ta(this,{ts:l})]:[this]}get isInLeapYear(){return Ei(this.year)}get daysInMonth(){return Oi(this.year,this.month)}get daysInYear(){return this.isValid?Li(this.year):NaN}get weeksInWeekYear(){return this.isValid?Vi(this.weekYear):NaN}get weeksInLocalWeekYear(){return this.isValid?Vi(this.localWeekYear,this.loc.getMinDaysInFirstWeek(),this.loc.getStartOfWeek()):NaN}resolvedLocaleOptions(t={}){const{locale:e,numberingSystem:i,calendar:r}=nr.create(this.loc.clone(t),t).resolvedOptions(this);return{locale:e,numberingSystem:i,outputCalendar:r}}toUTC(t=0,e={}){return this.setZone(He.instance(t),e)}toLocal(){return this.setZone(ei.defaultZone)}setZone(t,{keepLocalTime:e=!1,keepCalendarTime:i=!1}={}){if((t=Re(t,ei.defaultZone)).equals(this.zone))return this;if(t.isValid){let r=this.ts;if(e||i){const e=t.offset(this.ts),i=this.toObject();[r]=Oa(i,e,t)}return Ta(this,{ts:r,zone:t})}return Ka.invalid(ka(t))}reconfigure({locale:t,numberingSystem:e,outputCalendar:i}={}){return Ta(this,{loc:this.loc.clone({locale:t,numberingSystem:e,outputCalendar:i})})}setLocale(t){return this.reconfigure({locale:t})}set(t){if(!this.isValid)return this;const e=Ri(t,Ba),{minDaysInFirstWeek:i,startOfWeek:r}=gi(e,this.loc),a=!vi(e.weekYear)||!vi(e.weekNumber)||!vi(e.weekday),n=!vi(e.ordinal),s=!vi(e.year),o=!vi(e.month)||!vi(e.day),l=s||o,c=e.weekYear||e.weekNumber;if((l||n)&&c)throw new Rt("Can't mix weekYear/weekNumber units with year/month/day or ordinals");if(o&&n)throw new Rt("Can't mix ordinal dates with month/day");let d;a?d=pi({...di(this.c,i,r),...e},i,r):vi(e.ordinal)?(d={...this.toObject(),...e},vi(e.day)&&(d.day=Math.min(Oi(d.year,d.month),d.day))):d=hi({...ui(this.c),...e});const[p,u]=Oa(d,this.o,this.zone);return Ta(this,{ts:p,o:u})}plus(t){if(!this.isValid)return this;return Ta(this,Ia(this,na.fromDurationLike(t)))}minus(t){if(!this.isValid)return this;return Ta(this,Ia(this,na.fromDurationLike(t).negate()))}startOf(t,{useLocaleWeeks:e=!1}={}){if(!this.isValid)return this;const i={},r=na.normalizeUnit(t);switch(r){case"years":i.month=1;case"quarters":case"months":i.day=1;case"weeks":case"days":i.hour=0;case"hours":i.minute=0;case"minutes":i.second=0;case"seconds":i.millisecond=0}if("weeks"===r)if(e){const t=this.loc.getStartOfWeek(),{weekday:e}=this;e<t&&(i.weekNumber=this.weekNumber-1),i.weekday=t}else i.weekday=1;if("quarters"===r){const t=Math.ceil(this.month/3);i.month=3*(t-1)+1}return this.set(i)}endOf(t,e){return this.isValid?this.plus({[t]:1}).startOf(t,e).minus(1):this}toFormat(t,e={}){return this.isValid?nr.create(this.loc.redefaultToEN(e)).formatDateTimeFromString(this,t):Sa}toLocaleString(t=Wt,e={}){return this.isValid?nr.create(this.loc.clone(e),t).formatDateTime(this):Sa}toLocaleParts(t={}){return this.isValid?nr.create(this.loc.clone(t),t).formatDateTimeParts(this):[]}toISO({format:t="extended",suppressSeconds:e=!1,suppressMilliseconds:i=!1,includeOffset:r=!0,extendedZone:a=!1,precision:n="milliseconds"}={}){if(!this.isValid)return null;const s="extended"===t;let o=za(this,s,n=Za(n));return Ga.indexOf(n)>=3&&(o+="T"),o+=Pa(this,s,e,i,r,a,n),o}toISODate({format:t="extended",precision:e="day"}={}){return this.isValid?za(this,"extended"===t,Za(e)):null}toISOWeekDate(){return Va(this,"kkkk-'W'WW-c")}toISOTime({suppressMilliseconds:t=!1,suppressSeconds:e=!1,includeOffset:i=!0,includePrefix:r=!1,extendedZone:a=!1,format:n="extended",precision:s="milliseconds"}={}){if(!this.isValid)return null;return s=Za(s),(r&&Ga.indexOf(s)>=3?"T":"")+Pa(this,"extended"===n,e,t,i,a,s)}toRFC2822(){return Va(this,"EEE, dd LLL yyyy HH:mm:ss ZZZ",!1)}toHTTP(){return Va(this.toUTC(),"EEE, dd LLL yyyy HH:mm:ss 'GMT'")}toSQLDate(){return this.isValid?za(this,!0):null}toSQLTime({includeOffset:t=!0,includeZone:e=!1,includeOffsetSpace:i=!0}={}){let r="HH:mm:ss.SSS";return(e||t)&&(i&&(r+=" "),e?r+="z":t&&(r+="ZZ")),Va(this,r,!0)}toSQL(t={}){return this.isValid?`${this.toSQLDate()} ${this.toSQLTime(t)}`:null}toString(){return this.isValid?this.toISO():Sa}[Symbol.for("nodejs.util.inspect.custom")](){return this.isValid?`DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`:`DateTime { Invalid, reason: ${this.invalidReason} }`}valueOf(){return this.toMillis()}toMillis(){return this.isValid?this.ts:NaN}toSeconds(){return this.isValid?this.ts/1e3:NaN}toUnixInteger(){return this.isValid?Math.floor(this.ts/1e3):NaN}toJSON(){return this.toISO()}toBSON(){return this.toJSDate()}toObject(t={}){if(!this.isValid)return{};const e={...this.c};return t.includeConfig&&(e.outputCalendar=this.outputCalendar,e.numberingSystem=this.loc.numberingSystem,e.locale=this.loc.locale),e}toJSDate(){return new Date(this.isValid?this.ts:NaN)}diff(t,e="milliseconds",i={}){if(!this.isValid||!t.isValid)return na.invalid("created by diffing an invalid DateTime");const r={locale:this.locale,numberingSystem:this.numberingSystem,...i},a=(o=e,Array.isArray(o)?o:[o]).map(na.normalizeUnit),n=t.valueOf()>this.valueOf(),s=da(n?this:t,n?t:this,a,r);var o;return n?s.negate():s}diffNow(t="milliseconds",e={}){return this.diff(Ka.now(),t,e)}until(t){return this.isValid?oa.fromDateTimes(this,t):this}hasSame(t,e,i){if(!this.isValid)return!1;const r=t.valueOf(),a=this.setZone(t.zone,{keepLocalTime:!0});return a.startOf(e,i)<=r&&r<=a.endOf(e,i)}equals(t){return this.isValid&&t.isValid&&this.valueOf()===t.valueOf()&&this.zone.equals(t.zone)&&this.loc.equals(t.loc)}toRelative(t={}){if(!this.isValid)return null;const e=t.base||Ka.fromObject({},{zone:this.zone}),i=t.padding?this<e?-t.padding:t.padding:0;let r=["years","months","days","hours","minutes","seconds"],a=t.unit;return Array.isArray(t.unit)&&(r=t.unit,a=void 0),Wa(e,this.plus(i),{...t,numeric:"always",units:r,unit:a})}toRelativeCalendar(t={}){return this.isValid?Wa(t.base||Ka.fromObject({},{zone:this.zone}),this,{...t,numeric:"auto",units:["years","months","days"],calendary:!0}):null}static min(...t){if(!t.every(Ka.isDateTime))throw new jt("min requires all arguments be DateTimes");return _i(t,t=>t.valueOf(),Math.min)}static max(...t){if(!t.every(Ka.isDateTime))throw new jt("max requires all arguments be DateTimes");return _i(t,t=>t.valueOf(),Math.max)}static fromFormatExplain(t,e,i={}){const{locale:r=null,numberingSystem:a=null}=i;return $a(ze.fromOpts({locale:r,numberingSystem:a,defaultToEN:!0}),t,e)}static fromStringExplain(t,e,i={}){return Ka.fromFormatExplain(t,e,i)}static buildFormatParser(t,e={}){const{locale:i=null,numberingSystem:r=null}=e,a=ze.fromOpts({locale:i,numberingSystem:r,defaultToEN:!0});return new _a(a,t)}static fromFormatParser(t,e,i={}){if(vi(t)||vi(e))throw new jt("fromFormatParser requires an input string and a format parser");const{locale:r=null,numberingSystem:a=null}=i,n=ze.fromOpts({locale:r,numberingSystem:a,defaultToEN:!0});if(!n.equals(e.locale))throw new jt(`fromFormatParser called with a locale of ${n}, but the format parser was created for ${e.locale}`);const{result:s,zone:o,specificOffset:l,invalidReason:c}=e.explainFromTokens(t);return c?Ka.invalid(c):Na(s,o,i,`format ${e.format}`,t,l)}static get DATE_SHORT(){return Wt}static get DATE_MED(){return Yt}static get DATE_MED_WITH_WEEKDAY(){return Jt}static get DATE_FULL(){return Qt}static get DATE_HUGE(){return Kt}static get TIME_SIMPLE(){return Xt}static get TIME_WITH_SECONDS(){return te}static get TIME_WITH_SHORT_OFFSET(){return ee}static get TIME_WITH_LONG_OFFSET(){return ie}static get TIME_24_SIMPLE(){return re}static get TIME_24_WITH_SECONDS(){return ae}static get TIME_24_WITH_SHORT_OFFSET(){return ne}static get TIME_24_WITH_LONG_OFFSET(){return se}static get DATETIME_SHORT(){return oe}static get DATETIME_SHORT_WITH_SECONDS(){return le}static get DATETIME_MED(){return ce}static get DATETIME_MED_WITH_SECONDS(){return de}static get DATETIME_MED_WITH_WEEKDAY(){return pe}static get DATETIME_FULL(){return ue}static get DATETIME_FULL_WITH_SECONDS(){return he}static get DATETIME_HUGE(){return ge}static get DATETIME_HUGE_WITH_SECONDS(){return me}}function Xa(t){if(Ka.isDateTime(t))return t;if(t&&t.valueOf&&yi(t.valueOf()))return Ka.fromJSDate(t);if(t&&"object"==typeof t)return Ka.fromObject(t);throw new jt(`Unknown datetime argument: ${t}, of type ${typeof t}`)}const tn=o`
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
`;class en{static normalizeStage(t){const e=t.toLowerCase();return"veg"===e?"vegetative":"mom"===e?"mother":e}static getPlantStageColor(t){const e=this.normalizeStage(t);return this.stageColors[e]??"#757575"}static getPlantStageIcon(t){const e=this.normalizeStage(t);return this.stageIcons[e]??Tt}static getPlantStage(t){const e=t?.attributes??{},i=new Date;return e.cure_start?"cure":e.dry_start?"dry":e.mom_start?"mother":e.clone_start?"clone":e.flower_start&&new Date(e.flower_start)<=i?"flower":e.veg_start&&new Date(e.veg_start)<=i?"vegetative":"seedling"}static createGridLayout(t,e,i){const r=Array.from({length:e},()=>Array.from({length:i},()=>null));return t.forEach(t=>{const a=(t.attributes?.row??1)-1,n=(t.attributes?.col??1)-1;a>=0&&a<e&&n>=0&&n<i&&(r[a][n]=t)}),{rows:e,cols:i,grid:r}}static calculateEffectiveRows(t){const{name:e,plants:i,plants_per_row:r,rows:a}=t;if("dry"===e||"cure"===e||"mother"===e||"clone"===e){if(0===i.length)return 1;const t=Math.max(...i.map(t=>t.attributes?.row||1)),e=i.filter(e=>(e.attributes?.row||1)===t).length;return e>=r?t+1:t}return a}static parseDateTimeLocal(t){if(t)try{const e=16===t.length?t+":00":t,i=new Date(e);if(isNaN(i.getTime()))return;const r=i.getFullYear(),a=String(i.getMonth()+1).padStart(2,"0"),n=String(i.getDate()).padStart(2,"0"),s=String(i.getHours()).padStart(2,"0"),o=String(i.getMinutes()).padStart(2,"0");return`${r}-${a}-${n}T${s}:${o}:${String(i.getSeconds()).padStart(2,"0")}`}catch{return}}static formatDateForBackend(t){if(t)try{const e=t.split("T");if(e.length>0&&e[0].match(/^\d{4}-\d{2}-\d{2}$/))return e[0];const i=new Date(t);if(isNaN(i.getTime()))return;const r=i.getFullYear(),a=String(i.getMonth()+1).padStart(2,"0");return`${r}-${a}-${String(i.getDate()).padStart(2,"0")}`}catch{return}}static getCurrentDateTime(){const t=new Date,e=t=>t.toString().padStart(2,"0");return`${t.getFullYear()}-${e(t.getMonth()+1)}-${e(t.getDate())}T${e(t.getHours())}:${e(t.getMinutes())}:00`}static toDateTimeLocal(t){if(!t)return"";try{const e=new Date(t);if(isNaN(e.getTime()))return"";const i=t=>t.toString().padStart(2,"0"),r=e.getFullYear(),a=i(e.getMonth()+1),n=i(e.getDate()),s=i(e.getHours());return`${r}-${a}-${n}T${s}:${i(e.getMinutes())}`}catch{return""}}static getDominantStage(t){if(!t||0===t.length)return null;const e=["cure","dry","flower","vegetative","clone","mother","seedling"];let i=null,r=0;const a={};for(const e of t){const t=this.normalizeStage(e.state||this.getPlantStage(e));a[t]||(a[t]=[]),a[t].push(e)}for(const t of e)if(a[t]&&a[t].length>0){i=t;const e=`${"vegetative"===t?"veg":t}_days`,n=a[t].map(t=>{const i=t.attributes[e];return"number"==typeof i?i:0});r=Math.max(...n);break}return i?{stage:i,days:r}:null}static compressImage(t,e=800,i=800,r=.7){return new Promise((a,n)=>{const s=new FileReader;s.readAsDataURL(t),s.onload=t=>{const s=new Image;s.src=t.target?.result,s.onload=()=>{let t=s.width,o=s.height;t>o?t>e&&(o=Math.round(o*e/t),t=e):o>i&&(t=Math.round(t*i/o),o=i);const l=document.createElement("canvas");l.width=t,l.height=o;const c=l.getContext("2d");if(!c)return void n(new Error("Failed to get canvas context"));c.drawImage(s,0,0,t,o);const d=l.toDataURL("image/jpeg",r);a(d)},s.onerror=t=>n(t)},s.onerror=t=>n(t)})}static preloadImage(t){return new Promise((e,i)=>{const r=new Image;r.src=t,r.onload=()=>e(),r.onerror=()=>i()})}}en.stageColors={mother:"#E91E63",clone:"#FF5722",seedling:"#4CAF50",vegetative:"#8BC34A",flower:"#FF9800",dry:"#795548",cure:"#9C27B0"},en.stageIcons={mother:Tt,clone:Tt,seedling:Tt,vegetative:Tt,flower:$t,dry:Dt,cure:mt};class rn{constructor(t){this.hass=t}getGrowspaceDevices(){if(!this.hass)return[];const t=Object.values(this.hass.states),e=t.filter(t=>t.entity_id.startsWith("sensor.")&&void 0!==t.attributes?.growspace_id&&void 0!==t.attributes?.rows&&void 0!==t.attributes?.plants_per_row&&void 0===t.attributes?.row&&void 0===t.attributes?.col),i=new Map;return e.forEach(t=>{const e=t.attributes.growspace_id;i.set(e,[])}),t.forEach(t=>{if(void 0!==t.attributes?.row&&void 0!==t.attributes?.col){const e=this.getGrowspaceId(t);i.has(e)||i.set(e,[]),i.get(e).push(t)}}),Array.from(i.entries()).map(([t,i])=>{const r=e.find(e=>e.attributes?.growspace_id===t),a=r?.attributes?.friendly_name||`Growspace ${t}`,n=r?.attributes?.type??(a.toLowerCase().includes("dry")?"dry":a.toLowerCase().includes("cure")?"cure":"normal");return s={device_id:t,overview_entity_id:r?.entity_id,name:a,plants:i,rows:r?.attributes?.rows??3,plants_per_row:r?.attributes?.plants_per_row??3,type:n},{...s,type:s.type??"normal"};var s})}getGrowspaceId(t){return t.attributes?.growspace_id||"unknown"}getStrainLibrary(){const t=Object.values(this.hass.states).find(t=>void 0!==t.attributes?.strains&&null!==t.attributes?.strains),e=t?.attributes?.strains;if(!e)return console.warn("[DataService] No strain data in sensor attributes"),[];if(Array.isArray(e))return e.map(t=>({strain:t,phenotype:"",key:`${t}|default`}));if("object"==typeof e){const t=[];for(const[i,r]of Object.entries(e)){const e=r.meta||{},a=r.phenotypes||{};Object.entries(a).forEach(([r,a])=>{t.push({strain:i,phenotype:r,key:`${i}|${r}`,breeder:e.breeder,type:e.type,lineage:e.lineage,sex:e.sex,sativa_percentage:e.sativa_percentage,indica_percentage:e.indica_percentage,description:a.description,image:a.image_path,image_crop_meta:a.image_crop_meta,flowering_days_min:a.flower_days_min,flowering_days_max:a.flower_days_max})})}return t.sort((t,e)=>{const i=t.strain.localeCompare(e.strain);return 0!==i?i:(t.phenotype||"").localeCompare(e.phenotype||"")})}return[]}async getHistory(t,e,i){if(!this.hass)return[];let r=`history/period/${e.toISOString()}?filter_entity_id=${t}`;i&&(r+=`&end_time=${i.toISOString()}`);try{const t=await this.hass.callApi("GET",r);return t&&t.length>0?t[0]:[]}catch(t){return console.error("Error fetching history:",t),[]}}async addPlant(t){console.log("[DataService:addPlant] Sending payload:",t);try{"mother"!==t.growspace_id&&"mother_overview"!==t.growspace_id||(t.mother_start=(new Date).toISOString().split("T")[0]),"clone"!==t.growspace_id&&"clone_overview"!==t.growspace_id||(t.clone_start=(new Date).toISOString().split("T")[0]);const e=await this.hass.callService("growspace_manager","add_plant",t);return console.log("[DataService:addPlant] Response:",e),e}catch(t){throw console.error("[DataService:addPlant] Error:",t),t}}async updatePlant(t){console.log("[DataService:updatePlant] Sending payload:",t);try{const e=await this.hass.callService("growspace_manager","update_plant",t);return console.log("[DataService:updatePlant] Response:",e),e}catch(t){throw console.error("[DataService:updatePlant] Error:",t),t}}async removePlant(t){console.log("[DataService:removePlant] Removing plant_id:",t);try{const e=await this.hass.callService("growspace_manager","remove_plant",{plant_id:t});return console.log("[DataService:removePlant] Response:",e),e}catch(t){throw console.error("[DataService:removePlant] Error:",t),t}}async harvestPlant(t,e="dry"){console.log("[DataService:harvestPlant] Harvesting plant:",t,"→ target:",e);try{const i=(e||"").toLowerCase(),r={plant_id:t};i.includes("dry")?r.target_growspace_id="dry_overview":i.includes("cure")?r.target_growspace_id="cure_overview":i.includes("mother")?r.target_growspace_id="mother_overview":i.includes("clone")?r.target_growspace_id="clone_overview":i&&(r.target_growspace_name=e);const a=await this.hass.callService("growspace_manager","harvest_plant",r);return console.log("[DataService:harvestPlant] Response:",a),a}catch(t){throw console.error("[DataService:harvestPlant] Error:",t),t}}async takeClone(t,e="clone"){console.log("[DataService:takeClone] Cloning plant:",t,"→ target:",e);try{const i=(e||"").toLowerCase(),r={plant_id:t};i.includes("dry")?r.target_growspace_id="dry_overview":i.includes("cure")?r.target_growspace_id="cure_overview":i.includes("mother")?r.target_growspace_id="mother_overview":i.includes("clone")?r.target_growspace_id="clone_overview":i&&(r.target_growspace_name=e);const a=await this.hass.callService("growspace_manager","takeClone",r);return console.log("[DataService:takeClone] Response:",a),a}catch(t){throw console.error("[DataService:takeClone] Error:",t),t}}async swapPlants(t,e){console.log(`[DataService:swapPlants] Swapping plants: ${t} and ${e}`);try{const i=await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e});return console.log("[DataService:swapPlants] Response:",i),i}catch(t){throw console.error("[DataService:swapPlants] Error:",t),t}}async addStrain(t){console.log("[DataService:addStrain] Adding strain:",t);try{const e={...t};Object.keys(e).forEach(t=>{void 0===e[t]&&delete e[t]}),t.image&&(t.image.startsWith("data:")?(e.image_base64=t.image,delete e.image):(e.image_path=t.image,delete e.image));const i=await this.hass.callService("growspace_manager","add_strain",e);return console.log("[DataService:addStrain] Response:",i),i}catch(t){throw console.error("[DataService:addStrain] Error:",t),t}}async removeStrain(t,e){console.log("[DataService:removeStrain] Removing strain:",t,e);try{const i=await this.hass.callService("growspace_manager","remove_strain",{strain:t,phenotype:e});return console.log("[DataService:removeStrain] Response:",i),i}catch(t){throw console.error("[DataService:removeStrain] Error:",t),t}}async importStrainLibrary(t,e){console.log("[DataService:importStrainLibrary] Importing strain library ZIP via HTTP. Replace:",e);const i=new FormData;i.append("file",t),i.append("replace",e.toString());try{const t=await fetch("/api/growspace_manager/import_strains",{method:"POST",body:i,headers:{Authorization:`Bearer ${this.hass.auth.data.access_token}`}});if(!t.ok){const e=await t.text();throw new Error(e||t.statusText)}const e=await t.json();if(console.log("[DataService:importStrainLibrary] Response:",e),e.success)return e;throw new Error(e.error||"Unknown import error")}catch(t){throw console.error("[DataService:importStrainLibrary] Error:",t),t}}async clearStrainLibrary(){console.log("[DataService:clearStrainLibrary] Clearing library");try{const t=await this.hass.callService("growspace_manager","clear_strain_library");return console.log("[DataService:clearStrainLibrary] Response:",t),t}catch(t){throw console.error("[DataService:clearStrainLibrary] Error:",t),t}}async addGrowspace(t){console.log("[DataService:addGrowspace] Adding growspace:",t);try{const e=await this.hass.callService("growspace_manager","add_growspace",t);return console.log("[DataService:addGrowspace] Response:",e),e}catch(t){throw console.error("[DataService:addGrowspace] Error:",t),t}}async configureGrowspaceSensors(t){console.log("[DataService:configureGrowspaceSensors] Configuring sensors:",t);try{const e=await this.hass.callService("growspace_manager","configure_growspace",t);return console.log("[DataService:configureGrowspaceSensors] Response:",e),e}catch(t){throw console.error("[DataService:configureGrowspaceSensors] Error:",t),t}}async configureGlobalSettings(t){console.log("[DataService:configureGlobalSettings] Configuring global settings:",t);try{const e=await this.hass.callService("growspace_manager","configure_global",t);return console.log("[DataService:configureGlobalSettings] Response:",e),e}catch(t){throw console.error("[DataService:configureGlobalSettings] Error:",t),t}}async askGrowAdvice(t,e){console.log("[DataService:askGrowAdvice] Asking advice for:",t,e);try{return await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"ask_grow_advice",service_data:{growspace_id:t,user_query:e},return_response:!0})}catch(t){throw console.error("[DataService:askGrowAdvice] Error:",t),t}}async analyzeAllGrowspaces(){console.log("[DataService:analyzeAllGrowspaces] Analyzing all growspaces");try{return await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"analyze_all_growspaces",service_data:{},return_response:!0})}catch(t){throw console.error("[DataService:analyzeAllGrowspaces] Error:",t),t}}async getStrainRecommendation(t){console.log("[DataService:getStrainRecommendation] Getting strain recommendation for:",t);try{return await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"strain_recommendation",service_data:{user_query:t},return_response:!0})}catch(t){throw console.error("[DataService:getStrainRecommendation] Error:",t),t}}}class an{static getCropStyle(t,e){return e?`\n      background-image: url('${t}');\n      background-size: ${100*e.scale}%;\n      background-position: ${e.x}% ${e.y}%;\n    `:`background-image: url('${t}')`}static renderAddPlantDialog(t,e,i,r){if(!t?.open)return j``;const a=[...new Set(e.map(t=>t.strain))].sort(),n=an.getTimelineContent(t,i,r);return j`
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
                 <path d="${vt}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${an.renderMD3SelectInput("Strain *",t.strain||"",a,r.onStrainChange)}
               ${an.renderMD3TextInput("Phenotype",t.phenotype||"",r.onPhenotypeChange)}
               <div style="display:flex; gap:16px;">
                 ${an.renderMD3NumberInput("Row",t.row+1,t=>r.onRowChange(t))}
                 ${an.renderMD3NumberInput("Col",t.col+1,t=>r.onColChange(t))}
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
              <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Tt}"></path></svg>
              Add Plant
            </button>
          </div>

        </div>
      </ha-dialog>
    `}static parseScheduleString(t){if("string"!=typeof t)return t;if(!t||"[]"===t)return[];try{const e=t.replace(/'/g,'"'),i=JSON.parse(e);return Array.isArray(i)?i:[]}catch(e){return console.error("Failed to parse irrigation schedule string:",t,e),[]}}static getTimelineContent(t,e,i){const r=e.toLowerCase();let a;return a=r.includes("mother")?j`${an.renderMD3DateInput("Mother Start",t.mother_start||"",i.onMotherStartChange)}`:r.includes("clone")?j`${an.renderMD3DateInput("Clone Start",t.clone_start||"",i.onCloneStartChange)}`:r.includes("dry")?j`${an.renderMD3DateInput("Dry Start",t.dry_start||"",i.onDryStartChange)}`:r.includes("cure")?j`${an.renderMD3DateInput("Cure Start",t.cure_start||"",i.onCureStartChange)}`:j`
        ${an.renderMD3DateInput("Seedling Start",t.seedling_start||"",i.onSeedlingStartChange)}
        ${an.renderMD3DateInput("Vegetative Start",t.veg_start||"",i.onVegStartChange)}
        ${an.renderMD3DateInput("Flower Start",t.flower_start||"",i.onFlowerStartChange)}
      `,j`
      <h3>Timeline</h3>
      ${a}
    `}static renderPlantOverviewDialog(t,e,i){if(!t?.open)return j``;const{plant:r,editedAttributes:a}=t,n=r.attributes?.plant_id||r.entity_id.replace("sensor.",""),s=en.getPlantStageColor(r.state),o=en.getPlantStageIcon(r.state),l=(t,e)=>{a[t]="number"==typeof e?e.toString():e,i.onAttributeChange(t,a[t])};return j`
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
                 <path d="${vt}"></path>
               </svg>
            </button>
          </div>

          <div class="overview-grid">
             <!-- IDENTITY & LOCATION CARD -->
             <div class="detail-card">
               <h3>Identity & Location</h3>
               ${an.renderMD3TextInput("Strain Name",a.strain||"",t=>i.onAttributeChange("strain",t))}
               ${an.renderMD3TextInput("Phenotype",a.phenotype||"",t=>i.onAttributeChange("phenotype",t))}
               <div style="display:flex; gap:16px;">
                 ${an.renderMD3NumberInput("Row",a.row||1,t=>i.onAttributeChange("row",parseInt(t)))}
                 ${an.renderMD3NumberInput("Col",a.col||1,t=>i.onAttributeChange("col",parseInt(t)))}
               </div>
             </div>

             <!-- TIMELINE CARD -->
             <div class="detail-card">
               <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                 <h3 style="margin: 0;">Timeline</h3>
                 <button class="md3-button text" style="min-width: auto; padding: 4px;" @click=${i.onToggleShowAllDates}>
                    <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${At}"></path></svg>
                 </button>
               </div>
               
               ${t.showAllDates?j`
                  ${an.renderMD3DateTimeInput("Seedling Start",a.seedling_start??"",t=>l("seedling_start",t))}
                  ${an.renderMD3DateTimeInput("Mother Start",a.mother_start??"",t=>l("mother_start",t))}
                  ${an.renderMD3DateTimeInput("Clone Start",a.clone_start??"",t=>l("clone_start",t))}
                  ${an.renderMD3DateTimeInput("Vegetative Start",a.veg_start??"",t=>l("veg_start",t))}
                  ${an.renderMD3DateTimeInput("Flower Start",a.flower_start??"",t=>l("flower_start",t))}
                  ${an.renderMD3DateTimeInput("Dry Start",a.dry_start??"",t=>l("dry_start",t))}
                  ${an.renderMD3DateTimeInput("Cure Start",a.cure_start??"",t=>l("cure_start",t))}
               `:j`
                  ${"mother"===a.stage?an.renderMD3DateTimeInput("Mother Start",a.mother_start??"",t=>l("mother_start",t)):Z}
                  ${"clone"===a.stage?an.renderMD3DateTimeInput("Clone Start",a.clone_start??"",t=>l("clone_start",t)):Z}
                  ${"veg"===a.stage||"flower"===a.stage?an.renderMD3DateTimeInput("Vegetative Start",a.veg_start??"",t=>l("veg_start",t)):Z}
                  ${"flower"===a.stage?an.renderMD3DateTimeInput("Flower Start",a.flower_start??"",t=>l("flower_start",t)):Z}
                  ${"dry"===a.stage||"cure"===a.stage?an.renderMD3DateTimeInput("Dry Start",a.dry_start??"",t=>l("dry_start",t)):Z}
                  ${"cure"===a.stage?an.renderMD3DateTimeInput("Cure Start",a.cure_start??"",t=>l("cure_start",t)):Z}
               `}
             </div>

             <!-- STATS CARD -->
             ${an.renderPlantStatsMD3(r)}

          </div>

          <!-- ACTION BUTTONS -->
          <div class="button-group">
             <button class="md3-button danger" @click=${()=>i.onDelete(n)}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${xt}"></path></svg>
               Delete
             </button>

             <button class="md3-button tonal" @click=${i.onUpdate}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ft}"></path></svg>
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
                    @click=${t=>{const e=t.currentTarget.previousElementSibling,a=e?parseInt(e.value,10):1;i.onTakeClone(r,a)}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${wt}"></path></svg>
                    Take Clone
                  </button>
                </div>
             `:Z}

             ${"flower"===r.state.toLowerCase()?j`
               <button class="md3-button primary" @click=${()=>i.onHarvest(r)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${$t}"></path></svg>
                 Harvest
               </button>
             `:Z}

             ${"dry"===r.state.toLowerCase()?j`
               <button class="md3-button primary" @click=${()=>i.onFinishDrying(r)}>
                 <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${mt}"></path></svg>
                 Finish Drying
               </button>
             `:Z}

             ${"clone"===r.state.toLowerCase()?j`
               <div style="display:contents;">
                  <select class="md3-input" style="width: auto; height: 40px; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 0 16px;" id="clone-target-select">
                    <option value="">Move to...</option>
                    ${Object.entries(e).map(([t,e])=>j`<option value="${t}">${e}</option>`)}
                  </select>
                  <button class="md3-button primary"
                    @click=${t=>{const e=t.currentTarget.previousElementSibling;e.value?i.onMoveClone(r,e.value):alert("Select a growspace")}}
                  >
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"}"></path></svg>
                    Move
                  </button>
               </div>
             `:Z}
          </div>

        </div>
      </ha-dialog>
    `}static renderStrainLibraryDialog(t,e){return t?.open?j`
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
           ${"browse"===t.view?this.renderStrainBrowseView(t,e):this.renderStrainEditorView(t,e)}
        </div>

        ${t.isCropping?this.renderCropOverlay(t,e):Z}
        ${t.isImageSelectorOpen?this.renderImageSelector(t,e):Z}
        ${t.importDialog?.open?this.renderImportDialog(t,e):Z}

      </ha-dialog>
    `:j``}static renderImportDialog(t,e){const i=t.importDialog?.replace||!1;return j`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 400px; max-width: 90vw; border-radius: 16px; padding: 24px; border: 1px solid var(--border-color); color: #fff; display: flex; flex-direction: column; gap: 20px;">

              <div style="display: flex; justify-content: space-between; align-items: center;">
                 <h2 style="margin: 0; font-size: 1.25rem;">Import Strains</h2>
                 <button class="sd-close-btn" @click=${()=>e.onImportDialogChange({open:!1})}>
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
                 </button>
              </div>

              <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">
                 Select a ZIP file containing your strain library export. You can either merge the new strains with your existing library or replace it entirely.
              </div>

              <div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
                 <label style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
                    <input type="radio" name="import_mode"
                           .checked=${!i}
                           @change=${()=>e.onImportDialogChange({replace:!1})}
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
                           @change=${()=>e.onImportDialogChange({replace:!0})}
                           style="accent-color: var(--accent-green); transform: scale(1.2);" />
                     <div>
                       <div style="font-weight: 600;">Replace</div>
                       <div style="font-size: 0.8rem; color: var(--text-secondary);">Overwrite entire library with import.</div>
                    </div>
                 </label>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px;">
                 <button class="sd-btn secondary" @click=${()=>e.onImportDialogChange({open:!1})}>
                    Cancel
                 </button>
                 <button class="sd-btn primary" @click=${e.onConfirmImport}>
                    <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${yt}"></path></svg>
                    Select File
                 </button>
              </div>

           </div>
        </div>
     `}static renderImageSelector(t,e){const i=new Map;return t.strains.forEach(t=>{t.image&&(i.has(t.image)||i.set(t.image,[]),i.get(t.image).push({strain:t.strain,phenotype:t.phenotype||""}))}),j`
        <div class="crop-overlay">
           <div style="background: #1a1a1a; width: 80%; max-width: 800px; height: 80%; max-height: 600px; border-radius: 16px; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color);">
              <div class="sd-header">
                 <h2 class="sd-title">Select from Library</h2>
                 <button class="sd-close-btn" @click=${()=>e.onToggleImageSelector(!1)}>
                    <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
                 </button>
              </div>
              <div class="sd-content" style="overflow-y: auto;">
                 <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
                    ${[...i.entries()].map(([t,i])=>j`
                       <div style="aspect-ratio: 1; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; position: relative;"
                            @click=${()=>e.onSelectLibraryImage(t)}>
                          <img src="${t}" style="width: 100%; height: 100%; object-fit: cover;" />

                          <!-- Info Overlay -->
                          <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 8px; font-size: 0.75rem; color: white;">
                             ${i.map((t,e)=>j`
                                <div style="${e<i.length-1?"margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.2);":""}">
                                   <div style="font-weight: 700;">Strain: ${t.strain}</div>
                                   <div style="opacity: 0.9;">Pheno: ${t.phenotype||"N/A"}</div>
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
     `}static renderCropOverlay(t,e){const i=t.editorState;if(!i.image)return Z;const r=i.image_crop_meta||{x:50,y:50,scale:1};return j`
       <div class="crop-overlay">
          <h3 style="color:white; margin-bottom:20px;">Adjust Image</h3>
          <div class="crop-viewport"
               @wheel=${t=>{t.preventDefault();const i=-.001*t.deltaY,a=Math.min(Math.max(r.scale+i,1),5);e.onEditorChange("image_crop_meta",{...r,scale:a})}}
               @mousedown=${t=>{const i=t.clientX,a=t.clientY,n=r.x,s=r.y,o=t=>{const o=(i-t.clientX)*(.2/r.scale),l=(a-t.clientY)*(.2/r.scale);let c=Math.min(Math.max(n+o,0),100),d=Math.min(Math.max(s+l,0),100);e.onEditorChange("image_crop_meta",{...r,x:c,y:d})},l=()=>{window.removeEventListener("mousemove",o),window.removeEventListener("mouseup",l)};window.addEventListener("mousemove",o),window.addEventListener("mouseup",l)}}
               @dragstart=${t=>t.preventDefault()}>
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
                    @input=${t=>e.onEditorChange("image_crop_meta",{...r,scale:parseFloat(t.target.value)})} />

             <div style="display:flex; gap:12px; margin-top:12px;">
                <button class="md3-button tonal" style="flex:1" @click=${()=>e.onToggleCropMode(!1)}>Done</button>
             </div>
             <div style="text-align:center; font-size:0.8rem; color:#888; margin-top:8px;">
                Drag to pan • Scroll to zoom
             </div>
          </div>
       </div>
    `}static renderStrainBrowseView(t,e){const i=(t.searchQuery||"").toLowerCase(),r=t.strains.filter(t=>t.strain.toLowerCase().includes(i)||t.breeder&&t.breeder.toLowerCase().includes(i)||t.phenotype&&t.phenotype.toLowerCase().includes(i));return j`
      <div class="sd-header">
         <h2 class="sd-title">Strain Library</h2>
         <button class="sd-close-btn" @click=${e.onClose}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
         <!-- SEARCH & FILTER -->
         <div class="search-bar-container">
            <div class="search-input-wrapper">
               <svg viewBox="0 0 24 24"><path d="${kt}"></path></svg>
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
                  <svg style="width:16px;height:16px;fill:currentColor;cursor:pointer" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
               </div>
               <div class="filter-chip">
                  <span>Under 60 Days</span>
                  <svg style="width:16px;height:16px;fill:currentColor;cursor:pointer" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
               </div>
               <a class="clear-link">Clear All</a>
            </div>
         </div>

         <!-- GRID -->
         <div class="sd-grid">
            ${r.map(t=>this.renderStrainCard(t,e))}
         </div>

         ${0===r.length?j`
            <div style="text-align:center; padding: 40px; color: var(--text-secondary);">
               <svg style="width:48px;height:48px;fill:currentColor; opacity:0.5;" viewBox="0 0 24 24"><path d="${kt}"></path></svg>
               <p>No strains found matching "${i}"</p>
            </div>
         `:Z}
      </div>

      <div class="sd-footer">
         <button class="sd-btn secondary" @click=${e.onGetRecommendation}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${gt}"></path></svg>
            Get Recommendation
         </button>
         <button class="sd-btn secondary" @click=${e.onOpenImportDialog}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${yt}"></path></svg>
            Import Strains
         </button>
         <button class="sd-btn secondary" @click=${e.onExportStrains}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"}"></path></svg>
            Export Strains
         </button>
         <button class="sd-btn primary" @click=${()=>e.onSwitchView("editor")}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Mt}"></path></svg>
            New Strain
         </button>
      </div>
    `}static getImgStyle(t){return t?`width: 100%; height: 100%; object-fit: cover; object-position: ${t.x}% ${t.y}%; transform: scale(${t.scale}); transform-origin: ${t.x}% ${t.y}%;`:"width: 100%; height: 100%; object-fit: cover;"}static renderStrainCard(t,e){let i=St,r=t.type||"Unknown";const a=(t.type||"").toLowerCase();return a.includes("indica")?i=Nt:a.includes("sativa")?i=Vt:a.includes("hybrid")?i=Lt:(a.includes("ruderalis")||a.includes("auto"))&&(i=St),j`
       <div class="strain-card" @click=${()=>e.onSwitchView("editor",t)}>
          <div class="sc-thumb" style="overflow: hidden;">
             ${t.image?j`<img src="${t.image}" loading="lazy" alt="${t.strain}" style="${an.getImgStyle(t.image_crop_meta)}" />`:j`<svg style="width:48px;height:48px;opacity:0.2;fill:currentColor;" viewBox="0 0 24 24"><path d="${mt}"></path></svg>`}
             <div class="sc-actions">
                <button class="sc-action-btn" @click=${i=>{i.stopPropagation(),e.onRemoveStrain(t.key)}}>
                   <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${xt}"></path></svg>
                </button>
             </div>
          </div>
          <div class="sc-content">
             <h3 class="sc-title">${t.strain} ${t.phenotype?`(${t.phenotype})`:""}</h3>
             <div class="sc-type-row" style="flex-wrap: wrap;">
                <div style="display:flex; align-items:center; gap:6px; width: 100%;">
                   <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${i}"></path></svg>
                   <span>${r}</span>
                </div>
                ${a.includes("hybrid")?j`
                   <div class="hg-container" title="Indica: ${t.indica_percentage||0}% | Sativa: ${t.sativa_percentage||0}%">
                      <div class="hg-labels">
                         <span>Indica: ${t.indica_percentage||0}%</span>
                         <span>Sativa: ${t.sativa_percentage||0}%</span>
                      </div>
                      <div class="hg-bar-track" style="cursor: default;">
                         <div class="hg-bar-indica" style="width: ${t.indica_percentage||0}%"></div>
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
                ${t.flowering_days_min?j`<span>Flowering: ${t.flowering_days_min}-${t.flowering_days_max||"?"} Days</span>`:Z}
                ${t.breeder?j`<span>Breeder: ${t.breeder}</span>`:Z}
             </div>
          </div>
       </div>
     `}static renderStrainEditorView(t,e){const i=t.editorState||{},r=!!i.strain&&t.strains.some(t=>t.strain===i.strain&&t.phenotype===i.phenotype),a=(t,i)=>e.onEditorChange(t,i),n=[...new Set(t.strains.map(t=>t.strain).filter(Boolean))].sort(),s=[...new Set(t.strains.map(t=>t.breeder).filter(Boolean))].sort();return j`
      <datalist id="strain-suggestions">
         ${n.map(t=>j`<option value="${t}"></option>`)}
      </datalist>
      <datalist id="breeder-suggestions">
         ${s.map(t=>j`<option value="${t}"></option>`)}
      </datalist>

      <div class="sd-header">
         <div style="display:flex; align-items:center; gap:16px;">
            <button class="sd-btn secondary" style="padding: 8px 12px;" @click=${()=>e.onSwitchView("browse")}>
               <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"}"></path></svg>
               Back
            </button>
            <h2 class="sd-title">${r?"Edit Strain":"Add New Strain"}</h2>
         </div>
         <button class="sd-close-btn" @click=${e.onClose}>
            <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
         </button>
      </div>

      <div class="sd-content">
         <div class="editor-layout">
            <!-- LEFT COL: IDENTITY -->
            <div class="editor-col">
               <div class="photo-upload-area"
                    @click=${t=>{const e=t.target;e.closest(".crop-btn")||e.closest(".select-library-btn")||t.currentTarget.querySelector("input")?.click()}}
                    @dragover=${t=>{t.preventDefault(),t.dataTransfer.dropEffect="copy"}}
                    @drop=${t=>{t.preventDefault();const e=t.dataTransfer?.files[0];e&&en.compressImage(e).then(t=>a("image",t)).catch(t=>console.error("Error compressing image:",t))}}>

                  <button class="select-library-btn" @click=${t=>{t.stopPropagation(),e.onToggleImageSelector(!0)}}>
                      <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Ot}"></path></svg>
                      Select from Library
                  </button>

                  ${i.image?j`
                     ${i.image_crop_meta?j`<div style="width:100%; height:100%; border-radius:10px; ${an.getCropStyle(i.image,i.image_crop_meta)}; background-repeat: no-repeat;"></div>`:j`<img src="${i.image}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" />`}

                     <div style="position:absolute; bottom:8px; right:8px; display:flex; gap:8px;">
                         <button class="crop-btn"
                                 style="background:rgba(0,0,0,0.6); border:none; padding:6px; border-radius:50%; cursor:pointer; color:white;"
                                 @click=${t=>{t.stopPropagation(),e.onToggleCropMode(!0)}}
                                 title="Crop Image">
                            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${wt}"></path></svg>
                         </button>
                         <div style="background:rgba(0,0,0,0.6); padding:6px; border-radius:50%; pointer-events:none;">
                            <svg style="width:18px;height:18px;fill:white;" viewBox="0 0 24 24"><path d="${At}"></path></svg>
                         </div>
                     </div>
                  `:j`
                     <svg style="width:48px;height:48px;fill:currentColor;margin-bottom:16px;" viewBox="0 0 24 24"><path d="${"M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z"}"></path></svg>
                     <span style="font-weight:600;">PHOTO UPLOAD AREA</span>
                     <span style="font-size:0.8rem; margin-top:4px;">(Drag & Drop or Click)</span>
                  `}
                  <input type="file" id="strain-image-upload" style="display:none" accept="image/*"
                         @change=${t=>{const e=t.target.files?.[0];e&&en.compressImage(e).then(t=>a("image",t)).catch(t=>console.error("Error compressing image:",t))}} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Strain Name *</label>
                  <input type="text" class="sd-input" list="strain-suggestions" .value=${i.strain} @input=${t=>a("strain",t.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Phenotype</label>
                  <input type="text" class="sd-input" placeholder="e.g. #1 (Optional)" .value=${i.phenotype} @input=${t=>a("phenotype",t.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Breeder/Seedbank</label>
                  <input type="text" class="sd-input" list="breeder-suggestions" .value=${i.breeder} @input=${t=>a("breeder",t.target.value)} />
               </div>
            </div>

            <!-- RIGHT COL: GENETICS -->
            <div class="editor-col">
               <div class="sd-form-group">
                  <label class="sd-label">Type *</label>
                  <div class="type-selector-grid">
                     ${["Indica","Sativa","Hybrid","Ruderalis"].map(t=>{let e=St;"Indica"===t&&(e=Nt),"Sativa"===t&&(e=Vt),"Hybrid"===t&&(e=Lt);const r=(i.type||"").toLowerCase()===t.toLowerCase();return j`
                           <div class="type-option ${r?"active":""}"
                                @click=${()=>a("type",t)}>
                              <svg viewBox="0 0 24 24"><path d="${e}"></path></svg>
                              <span class="type-label">${t}</span>
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
                                 @input=${t=>{let e=Math.floor(parseFloat(t.target.value))||0;e<0&&(e=0),e>100&&(e=100),a("indica_percentage",e),a("sativa_percentage",100-e)}} />
                              <span>%</span>
                           </div>

                           <div class="hg-input-label">
                              <span>Sativa:</span>
                              <input class="hg-num-input" type="number" min="0" max="100"
                                 .value=${i.sativa_percentage||0}
                                 @input=${t=>{let e=Math.floor(parseFloat(t.target.value))||0;e<0&&(e=0),e>100&&(e=100),a("sativa_percentage",e),a("indica_percentage",100-e)}} />
                              <span>%</span>
                           </div>
                        </div>

                        <!-- Bar -->
                        <div class="hg-bar-track"
                             @click=${t=>{const e=t.currentTarget.getBoundingClientRect(),i=t.clientX-e.left,r=e.width;let n=Math.round(i/r*100);n<0&&(n=0),n>100&&(n=100),a("indica_percentage",n),a("sativa_percentage",100-n)}}>
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
                     <input type="number" class="sd-input" placeholder="Min" .value=${i.flowering_min} @input=${t=>a("flowering_min",t.target.value)} />
                     <input type="number" class="sd-input" placeholder="Max" .value=${i.flowering_max} @input=${t=>a("flowering_max",t.target.value)} />
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Lineage</label>
                  <input type="text" class="sd-input" .value=${i.lineage} @input=${t=>a("lineage",t.target.value)} />
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Sex</label>
                  <div style="display:flex; gap:20px; padding: 8px 0;">
                     ${["Feminized","Regular"].map(t=>j`
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:white;">
                           <input type="radio" name="sex_radio"
                                  .checked=${i.sex===t}
                                  @change=${()=>a("sex",t)}
                                  style="accent-color: var(--accent-green); transform: scale(1.2);" />
                           ${t}
                        </label>
                     `)}
                  </div>
               </div>

               <div class="sd-form-group">
                  <label class="sd-label">Description</label>
                  <textarea class="sd-textarea" .value=${i.description} @input=${t=>a("description",t.target.value)}></textarea>
               </div>
            </div>
         </div>
      </div>

      <div class="sd-footer">
         <button class="sd-btn secondary" @click=${()=>e.onSwitchView("browse")}>
            Cancel
         </button>
         <button class="sd-btn primary" @click=${e.onAddStrain}>
            <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${ft}"></path></svg>
            Save Strain
         </button>
      </div>
    `}static renderMD3TextInput(t,e,i){return j`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="text"
          class="md3-input"
          .value=${e}
          @input=${t=>i(t.target.value)}
        />
      </div>
    `}static renderMD3SelectInput(t,e,i,r){return j`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <select
          class="md3-input"
          .value=${e}
          @change=${t=>r(t.target.value)}
        >
          <option value="">Select...</option>
          ${i.map(t=>j`<option value="${t}" ?selected=${t===e}>${t}</option>`)}
        </select>
      </div>
    `}static renderMD3NumberInput(t,e,i){return j`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="number"
          class="md3-input"
          min="1"
          .value=${e}
          @input=${t=>i(t.target.value)}
        />
      </div>
    `}static renderMD3DateTimeInput(t,e,i){const r=en.toDateTimeLocal(e);return j`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="datetime-local"
          class="md3-input"
          .value=${r}
          @input=${t=>i(t.target.value)}
        />
      </div>
    `}static renderMD3DateInput(t,e,i){const r=e?e.split("T")[0]:"";return j`
      <div class="md3-input-group">
        <label class="md3-label">${t}</label>
        <input
          type="date"
          class="md3-input"
          .value=${r}
          @input=${t=>i(t.target.value)}
        />
      </div>
    `}static renderTextInput(t,e,i){return j`
      <div class="form-group">
        <label>${t}</label>
        <input 
          type="text" 
          class="form-input"
          .value=${e}
          @input=${t=>i(t.target.value)}
        />
      </div>
    `}static renderNumberInput(t,e,i){return j`
      <div class="form-group">
        <label>${t}</label>
        <input 
          type="number" 
          class="form-input"
          min="1"
          .value=${e}
          @input=${t=>i(t.target.value)}
        />
      </div>
    `}static renderDateTimeInput(t,e,i,r){return j`
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
    `:j``}static renderPlantStats(t){return this.renderPlantStatsMD3(t)}static renderConfigDialog(t,e,i){if(!t?.open)return j``;const r=t.currentTab;return j`
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
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${bt}"></path></svg>
              </div>
              <h2 class="config-title">Configuration</h2>
              <div style="flex:1"></div>
              <button class="md3-button text" @click=${i.onClose} style="min-width: auto; padding: 8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
              </button>
           </div>

           <!-- Tabs -->
           <div class="config-tabs">
              <div class="config-tab ${"add_growspace"===r?"active":""}"
                   @click=${()=>i.onSwitchTab("add_growspace")}>
                 <svg viewBox="0 0 24 24"><path d="${Ot}"></path></svg>
                 Add Growspace
              </div>
              <div class="config-tab ${"environment"===r?"active":""}"
                   @click=${()=>i.onSwitchTab("environment")}>
                 <svg viewBox="0 0 24 24"><path d="${Et}"></path></svg>
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
              ${"add_growspace"===r?this.renderAddGrowspaceTab(t,i):Z}
              ${"environment"===r?this.renderEnvironmentTab(t,e,i):Z}
              ${"global"===r?this.renderGlobalTab(t,i):Z}
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
    `}static renderAddGrowspaceTab(t,e){const i=t.addGrowspaceData;return j`
      <div style="display:flex; flex-direction:column; gap:20px;">
         <div class="detail-card">
            <h3>New Growspace Details</h3>
            ${this.renderMD3TextInput("Growspace Name",i.name,t=>e.onAddGrowspaceChange("name",t))}
            <div style="display:flex; gap:16px;">
               ${this.renderMD3NumberInput("Rows",i.rows,t=>e.onAddGrowspaceChange("rows",parseInt(t)))}
               ${this.renderMD3NumberInput("Plants per Row",i.plants_per_row,t=>e.onAddGrowspaceChange("plants_per_row",parseInt(t)))}
            </div>
            ${this.renderMD3TextInput("Notification Service (Optional)",i.notification_service,t=>e.onAddGrowspaceChange("notification_service",t))}
         </div>
      </div>
    `}static renderEnvironmentTab(t,e,i){const r=t.environmentData,a=Object.entries(e).map(([t,e])=>({id:t,name:e}));return j`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Select Target</h3>
             <div class="md3-input-group">
                <label class="md3-label">Growspace</label>
                <select class="md3-input" .value=${r.selectedGrowspaceId} @change=${t=>i.onEnvChange("selectedGrowspaceId",t.target.value)}>
                   <option value="">Select...</option>
                   ${a.map(t=>j`<option value="${t.id}">${t.name}</option>`)}
                </select>
             </div>
          </div>

          <div class="detail-card">
             <h3>Sensors</h3>
             ${this.renderMD3TextInput("Temperature Sensor ID",r.temp_sensor,t=>i.onEnvChange("temp_sensor",t))}
             ${this.renderMD3TextInput("Humidity Sensor ID",r.humidity_sensor,t=>i.onEnvChange("humidity_sensor",t))}
             ${this.renderMD3TextInput("VPD Sensor ID",r.vpd_sensor,t=>i.onEnvChange("vpd_sensor",t))}
          </div>

          <div class="detail-card">
             <h3>Optional</h3>
             ${this.renderMD3TextInput("CO2 Sensor ID",r.co2_sensor,t=>i.onEnvChange("co2_sensor",t))}
             ${this.renderMD3TextInput("Light Sensor/State ID",r.light_sensor,t=>i.onEnvChange("light_sensor",t))}
             ${this.renderMD3TextInput("Fan Switch ID",r.fan_switch,t=>i.onEnvChange("fan_switch",t))}
          </div>
       </div>
    `}static renderGlobalTab(t,e){const i=t.globalData;return j`
       <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="detail-card">
             <h3>Global Environment</h3>
             ${this.renderMD3TextInput("Weather Entity ID",i.weather_entity,t=>e.onGlobalChange("weather_entity",t))}
          </div>
          <div class="detail-card">
             <h3>Lung Room</h3>
             ${this.renderMD3TextInput("Lung Room Temp Sensor",i.lung_room_temp,t=>e.onGlobalChange("lung_room_temp",t))}
             ${this.renderMD3TextInput("Lung Room Humidity Sensor",i.lung_room_humidity,t=>e.onGlobalChange("lung_room_humidity",t))}
          </div>
       </div>
    `}static renderGrowMasterDialog(t,e,i,r){if(!t?.open)return j``;const a=e?"#FF9800":"#4CAF50",n=i?`Ask the ${i}`:"Ask the Grow Master";return j`
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
                 <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${gt}"></path></svg>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">${n}</h2>
                 <div style="font-size:0.8rem; color:var(--secondary-text-color); margin-top:4px;">
                    ${e?"Warning: Plant Stress Detected":"All systems normal"}
                 </div>
              </div>
              <button class="md3-button text" @click=${r.onClose} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
              </button>
           </div>

           <div class="gm-content">
              <!-- Input Area -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Question</label>
                 <textarea
                    class="sd-textarea"
                    placeholder="Ask about this growspace..."
                    .value=${t.userQuery}
                    @input=${t=>r.onQueryChange(t.target.value)}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <button
                    class="md3-button tonal"
                    @click=${r.onAnalyzeAll}
                    ?disabled=${t.isLoading}
                    style="opacity: ${t.isLoading?.7:1}"
                 >
                    Analyze All
                 </button>
                 <button
                    class="md3-button primary"
                    @click=${r.onAnalyze}
                    ?disabled=${t.isLoading}
                    style="opacity: ${t.isLoading?.7:1}"
                 >
                    ${t.isLoading?"Analyzing...":"Analyze Environment"}
                 </button>
              </div>

              <!-- Response Area -->
              ${t.isLoading?j`
                 <div class="gm-loading">
                    <svg class="spinner" viewBox="0 0 24 24"><path d="${Ct}" fill="currentColor"></path></svg>
                    <span>Consulting the archives...</span>
                 </div>
              `:Z}

              ${!t.isLoading&&t.response?j`
                 <div class="gm-response-box">
                    ${t.response}
                 </div>
              `:Z}
           </div>
        </div>
      </ha-dialog>
    `}static renderStrainRecommendationDialog(t,e){return t?.open?j`
      <ha-dialog
        open
        @closed=${e.onClose}
        hideActions
        .scrimClickAction=${""}
        .escapeKeyAction=${""}
      >
        <div class="gm-container">
           <div class="gm-header">
              <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; color: #4CAF50">
                 <svg style="width:28px;height:28px;fill:currentColor;" viewBox="0 0 24 24"><path d="${gt}"></path></svg>
              </div>
              <div style="flex:1">
                 <h2 style="margin:0; font-size:1.25rem;">Get Strain Recommendation</h2>
              </div>
              <button class="md3-button text" @click=${e.onClose} style="min-width:auto; padding:8px;">
                 <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${vt}"></path></svg>
              </button>
           </div>

           <div class="gm-content">
              <!-- Input Area -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                 <label style="font-size:0.9rem; font-weight:500; color:#ccc;">Your Preferences</label>
                 <textarea
                    class="sd-textarea"
                    placeholder="e.g., something fruity and good for daytime use..."
                    .value=${t.userQuery}
                    @input=${t=>e.onQueryChange(t.target.value)}
                    style="min-height: 80px;"
                 ></textarea>
              </div>

              <!-- Action -->
              <div style="display:flex; justify-content:flex-end; gap: 12px;">
                 <button
                    class="md3-button tonal"
                    @click=${e.onClose}
                 >
                    OK
                 </button>
                 <button
                    class="md3-button primary"
                    @click=${e.onGetRecommendation}
                    ?disabled=${t.isLoading}
                    style="opacity: ${t.isLoading?.7:1}"
                 >
                    ${t.isLoading?"Getting Recommendation...":"Get Recommendation"}
                 </button>
              </div>

              ${t.isLoading?j`
                 <div class="gm-loading">
                    <svg class="spinner" viewBox="0 0 24 24"><path d="${Ct}" fill="currentColor"></path></svg>
                    <span>Consulting the archives...</span>
                 </div>
              `:Z}

              ${!t.isLoading&&t.response?j`
                 <div class="gm-response-box">
                    ${t.response}
                 </div>
              `:Z}
           </div>
        </div>
      </ha-dialog>
    `:j``}static renderScheduleSection(t,e,i,r,a,n,s){const o="irrigation"===n?a.onAddIrrigationTime:a.onAddDrainTime,l="irrigation"===n?a.onRemoveIrrigationTime:a.onRemoveDrainTime,c="irrigation"===n?a.onStartAddingIrrigationTime:a.onStartAddingDrainTime,d="irrigation"===n?a.onCancelAddingIrrigationTime:a.onCancelAddingDrainTime,p="irrigation"===n?a.onConfirmAddIrrigationTime:a.onConfirmAddDrainTime,u="irrigation"===n?a.onIrrigationTimeInputChange:a.onDrainTimeInputChange,h="irrigation"===n?r.adding_irrigation_time:r.adding_drain_time;return j`
         <div class="detail-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
               <h3 style="margin: 0;">${t}</h3>
               <button
                  @click=${o}
                  class="md3-button primary"
                  style="background: ${s};"
               >
                  <svg style="width:18px;height:18px;fill:currentColor;" viewBox="0 0 24 24"><path d="${Mt}"></path></svg>
                  ADD TIME
               </button>
            </div>

            <div
               class="${n}-time-bar"
               @click=${t=>{const e=t.currentTarget.getBoundingClientRect(),i=t.clientX-e.left;c(i,e.width)}}
               style="position: relative; height: 80px; background: rgba(0,0,0,0.3); border-radius: 8px; cursor: crosshair; border: 2px solid ${s}40;"
            >
               ${Array.from({length:25},(t,e)=>e).map(t=>j`
                  <div style="position: absolute; left: ${t/24*100}%; top: 0; bottom: 0; border-left: 1px solid ${t%6==0?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.05)"}; pointer-events: none;">
                     ${t%3==0?j`
                        <span style="position: absolute; bottom: -22px; left: -12px; font-size: 0.7rem; color: var(--secondary-text-color);">${t.toString().padStart(2,"0")}:00</span>
                     `:""}
                  </div>
               `)}

               ${e.map(t=>{const[e,r]=t.time.split(":").map(Number);return j`
                     <div
                        @click=${e=>{e.stopPropagation(),confirm(`Remove ${n} time ${t.time}?`)&&l(t.time)}}
                        style="position: absolute; left: ${(e+r/60)/24*100}%; top: 10%; bottom: 10%; width: 4px; background: ${s}; cursor: pointer; box-shadow: 0 0 8px ${s}; border-radius: 2px;"
                        title="${t.time} | Duration: ${t.duration||i}seconds"
                     >
                        <div style="position: absolute; left: 8px; top: -24px; background: ${s}; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                           ${t.time} | ${t.duration||i}seconds
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

            ${h?j`
               <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;" @click=${d}>
                  <div class="detail-card" style="max-width: 400px; margin: 0;" @click=${t=>t.stopPropagation()}>
                     <h3>Add ${t} Time</h3>

                     <div class="md3-input-group">
                        <label class="md3-label">Time</label>
                        <input
                           type="time"
                           class="md3-input"
                           .value=${h.time}
                           @input=${t=>u("time",t.target.value)}
                        />
                     </div>

                     <div class="md3-input-group">
                        <label class="md3-label">Duration (minutes)</label>
                        <input
                           type="number"
                           class="md3-input"
                           .value=${h.duration.toString()}
                           @input=${t=>{const e=parseInt(t.target.value);isNaN(e)||u("duration",e)}}
                           min="1"
                        />
                     </div>

                     <div class="button-group">
                        <button class="md3-button tonal" @click=${d}>
                           Cancel
                        </button>
                        <button
                           class="md3-button primary"
                           @click=${()=>p(h.time,h.duration)}
                           style="background: ${s};"
                        >
                           Add Schedule
                        </button>
                     </div>
                  </div>
               </div>
            `:""}
         </div>
      `}static renderIrrigationDialog(t,e){if(!t?.open)return Z;const i="#2196F3",r=an.parseScheduleString(t.irrigation_times),a=an.parseScheduleString(t.drain_times);return j`
         <ha-dialog
            open
            @closed=${e.onClose}
            hideActions
            .scrimClickAction=${""}
            .escapeKeyAction=${""}
         >
            <div class="glass-dialog-container" style="--stage-color: ${i}; max-width: 1000px; max-height: 90vh; overflow-y: auto;">

               <div class="dialog-header">
                  <div class="dialog-icon" style="background: ${i}30; color: ${i};">
                     <svg style="width:32px;height:32px;fill:currentColor;" viewBox="0 0 24 24">
                        <path d="${It}"></path>
                     </svg>
                  </div>
                  <div class="dialog-title-group">
                     <h2 class="dialog-title">Irrigation Management</h2>
                     <div class="dialog-subtitle">${t.growspace_name}</div>
                  </div>
                  <button class="md3-button text" @click=${e.onClose} style="min-width: auto; padding: 8px;">
                     <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24">
                        <path d="${vt}"></path>
                     </svg>
                  </button>
               </div>

               <div class="dialog-body" style="padding: 0; background: transparent;">
                  ${this.renderScheduleSection("Irrigation Schedule",r,t.irrigation_duration,t,e,"irrigation",i)}

                           ${this.renderScheduleSection("Drain Schedule",a,t.drain_duration,t,e,"drain","#FF9800")}

               </div>

               <div class="button-group">
                  <button class="md3-button tonal" @click=${e.onClose}>
                     Close
                  </button>
               </div>

            </div>
         </ha-dialog>
      `}}let nn=class extends ot{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._optimisticDeletedPlantIds=new Set,this._strainLibraryDialog=null,this._configDialog=null,this._growMasterDialog=null,this._strainRecommendationDialog=null,this._irrigationDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1,this._strainLibrary=[],this._historyData=null,this._activeEnvGraphs=new Set,this._graphRanges={},this._tooltip=null,this._menuOpen=!1,this._isEditMode=!1,this._selectedPlants=new Set,this._handleDocumentClick=t=>{if(this._menuOpen){const e=t.composedPath(),i=this.shadowRoot?.querySelector(".menu-container");i&&!e.includes(i)&&(this._menuOpen=!1)}},this._handleTakeClone=t=>{const e=t.attributes?.plant_id||t.entity_id.replace("sensor.","");this.hass.callService("growspace_manager","take_clone",{mother_plant_id:e}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})},this.clonePlant=(t,e)=>{const i=t.attributes?.plant_id||t.entity_id.replace("sensor.",""),r=e;this.hass.callService("growspace_manager","take_clone",{mother_plant_id:i,num_clones:r}).then(()=>{console.log(`Clone taken from ${t.attributes?.strain||"plant"}`)}).catch(t=>{console.error(`Failed to take clone: ${t.message}`)})}}connectedCallback(){super.connectedCallback(),document.addEventListener("click",this._handleDocumentClick)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this._handleDocumentClick)}firstUpdated(){this.dataService=new rn(this.hass),this.initializeSelectedDevice(),this._fetchHistory(),this._fetchStrainLibrary()}updated(t){super.updated(t),t.has("selectedDevice")&&this._fetchHistory()}async _fetchHistory(){if(!this.hass||!this.selectedDevice)return;const t=this.dataService.getGrowspaceDevices().find(t=>t.device_id===this.selectedDevice);if(!t)return;let e=t.name.toLowerCase().replace(/\s+/g,"_");t.overview_entity_id&&(e=t.overview_entity_id.replace("sensor.",""));let i=`binary_sensor.${e}_optimal_conditions`;"cure"===e?i="binary_sensor.cure_optimal_curing":"dry"===e&&(i="binary_sensor.dry_optimal_drying");const r=new Date,a=new Date(r.getTime()-864e5);try{const t=await this.dataService.getHistory(i,a,r);this._historyData=t}catch(t){console.error("Failed to fetch history",t)}}async _fetchStrainLibrary(){if(!this.hass)return;const t=localStorage.getItem("growspace_strain_library");if(t)try{this._strainLibrary=JSON.parse(t),this.requestUpdate()}catch(t){console.warn("Failed to parse cached strain library",t)}try{const t=await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"get_strain_library",service_data:{},return_response:!0}),e=t?.response||{},i=[];Object.entries(e).forEach(([t,e])=>{const r=e.meta||{},a=e.phenotypes||{};Object.entries(a).forEach(([e,a])=>{i.push({strain:t,phenotype:e,key:`${t}|${e}`,breeder:r.breeder,type:r.type,lineage:r.lineage,sex:r.sex,sativa_percentage:r.sativa_percentage,indica_percentage:r.indica_percentage,description:a.description,image:a.image_path,image_crop_meta:a.image_crop_meta,flowering_days_min:a.flower_days_min,flowering_days_max:a.flower_days_max})})}),this._strainLibrary=i,localStorage.setItem("growspace_strain_library",JSON.stringify(i))}catch(t){console.error("Failed to fetch strain library for grid:",t)}}initializeSelectedDevice(){const t=this.dataService.getGrowspaceDevices();if(t.length&&!this.selectedDevice){if(this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);if(e)return void(this.selectedDevice=e.device_id)}this.selectedDevice=t[0].device_id}}static async getConfigElement(){await Promise.resolve().then(function(){return on});return document.createElement("growspace-manager-card-editor")}static getStubConfig(){return{default_growspace:"4x4",compact:!0}}setConfig(t){if(!t)throw new Error("Invalid configuration");this._config=t,void 0!==this._config.compact&&(this._isCompactView=this._config.compact)}getCardSize(){return 4}_handleDeviceChange(t){const e=t.target;this.selectedDevice=e.value}_togglePlantSelection(t){const e=t.attributes.plant_id;if(!e)return;const i=new Set(this._selectedPlants);i.has(e)?i.delete(e):i.add(e),this._selectedPlants=i,this.requestUpdate()}_handlePlantClick(t){if(this._isEditMode&&this._selectedPlants.size>0){const e=t.attributes.plant_id;e&&!this._selectedPlants.has(e)&&this._togglePlantSelection(t),this._openPlantOverviewDialog(t,Array.from(this._selectedPlants))}else this._openPlantOverviewDialog(t)}_openPlantOverviewDialog(t,e){this._plantOverviewDialog={open:!0,plant:t,editedAttributes:{...t.attributes},activeTab:"dashboard",selectedPlantIds:e}}getHaDateTimeString(){const t=this.hass.config.time_zone||Intl.DateTimeFormat().resolvedOptions().timeZone;return Ka.now().setZone(t).toFormat("yyyy-LL-dd'T'HH:mm")}_openAddPlantDialog(t,e){const i=this.dataService.getStrainLibrary(),r=i.length>0?i[0].strain:"",a=i.length>0?i[0].phenotype:"";this._addPlantDialog={open:!0,row:t,col:e,strain:r,phenotype:a,veg_start:"",flower_start:"",seedling_start:"",mother_start:"",clone_start:"",dry_start:"",cure_start:""}}async _confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const{row:t,col:e,strain:i,phenotype:r,veg_start:a,flower_start:n,seedling_start:s,mother_start:o,clone_start:l,dry_start:c,cure_start:d}=this._addPlantDialog;try{const a={growspace_id:this.selectedDevice,row:t+1,col:e+1,strain:i,phenotype:r};["veg_start","flower_start","seedling_start","mother_start","clone_start","dry_start","cure_start"].forEach(t=>{const e=this._addPlantDialog[t];if(e)if(10!==e.length||e.includes("T"))a[t]=e;else{const i=(new Date).toTimeString().split(" ")[0];a[t]=`${e}T${i}`}}),console.log("Adding plant to growspace:",this.selectedDevice,a),console.log("Adding plant:",a),await this.dataService.addPlant(a),this._addPlantDialog=null}catch(t){console.error("Error adding plant:",t)}}async _updatePlant(){if(!this._plantOverviewDialog)return;const{plant:t,editedAttributes:e,selectedPlantIds:i}=this._plantOverviewDialog,r=t.attributes?.plant_id||t.entity_id.replace("sensor.",""),a=i&&i.length>0?i:[r],n={},s=["seedling_start","mother_start","clone_start","veg_start","flower_start","dry_start","cure_start"];["strain","phenotype","row","col",...s].forEach(t=>{if(void 0!==e[t])if(s.includes(t)){const i=String(e[t]||"");if(i&&"null"!==i&&"undefined"!==i){const e=en.formatDateForBackend(i);e&&(n[t]=e)}else n[t]=null}else null!==e[t]&&(n[t]=e[t])});try{const t=a.map(t=>{const e={...n,plant_id:t};return a.length>1&&(delete e.row,delete e.col),this.dataService.updatePlant(e)});await Promise.all(t),this._plantOverviewDialog=null,this._isEditMode&&(this._selectedPlants=new Set,this._isEditMode=!1)}catch(t){console.error("Error updating plant(s):",t)}}async _handleDeletePlant(t){if(confirm("Are you sure you want to delete this plant?")){if(this.selectedDevice){const e=this.dataService.getGrowspaceDevices().find(t=>t.device_id===this.selectedDevice);e&&(e.plants=e.plants.filter(e=>(e.attributes.plant_id||e.entity_id.replace("sensor.",""))!==t),this.requestUpdate())}this._plantOverviewDialog=null;try{await this.dataService.removePlant(t)}catch(t){console.error("Error deleting plant:",t),alert("Failed to delete plant. It may reappear on refresh."),this.updateGrid()}}}async _movePlantToNextStage(t){if(!this._plantOverviewDialog?.plant)return void console.error("No plant found in overview dialog");const e=this._plantOverviewDialog.plant,i=e.attributes?.stage;let r="";const a=new Set(["mother","flower","dry","cure"]);if(i&&a.has(i)){"flower"===i?r="dry":"dry"===i?r="cure":"mother"===i?r="clone":(console.error("Unknown stage, cannot move plant",r),r="error");try{const t=e.attributes?.plant_id||e.entity_id.replace("sensor.","");await this.dataService.harvestPlant(t,r),this._plantOverviewDialog=null}catch(t){console.error("Error moving plant to next stage:",t)}}else alert("Plant must be in mother or flower or dry or cure stage to move. stage is "+i)}async _harvestPlant(t){await this._movePlantToNextStage(t)}async _finishDryingPlant(t){await this._movePlantToNextStage(t)}async _openStrainLibraryDialog(){let t;try{t=await this.hass.connection.sendMessagePromise({type:"call_service",domain:"growspace_manager",service:"get_strain_library",service_data:{},return_response:!0})}catch(t){console.error("Failed to fetch strain library:",t)}const e=t?.response||{},i=[];Object.entries(e).forEach(([t,e])=>{const r=e.meta||{},a=e.phenotypes||{};Object.entries(a).forEach(([e,a])=>{i.push({strain:t,phenotype:e,key:`${t}|${e}`,breeder:r.breeder,type:r.type,lineage:r.lineage,sex:r.sex,sativa_percentage:r.sativa_percentage,indica_percentage:r.indica_percentage,description:a.description,image:a.image_path,image_crop_meta:a.image_crop_meta,flowering_days_min:a.flower_days_min,flowering_days_max:a.flower_days_max})})}),this._strainLibraryDialog={open:!0,view:"browse",strains:i,searchQuery:"",editorState:this._createEmptyEditorState()}}_createEmptyEditorState(){return{strain:"",phenotype:"",breeder:"",type:"",flowering_min:"",flowering_max:"",lineage:"",sex:"",description:"",image:"",image_crop_meta:void 0}}_switchStrainView(t,e){this._strainLibraryDialog&&(this._strainLibraryDialog.view=t,this._strainLibraryDialog.isCropping=!1,"editor"===t&&(this._strainLibraryDialog.editorState=e?{strain:e.strain,phenotype:e.phenotype||"",breeder:e.breeder||"",type:e.type||"",flowering_min:e.flowering_days_min?.toString()||"",flowering_max:e.flowering_days_max?.toString()||"",lineage:e.lineage||"",sex:e.sex||"",description:e.description||"",image:e.image||"",image_crop_meta:e.image_crop_meta,sativa_percentage:e.sativa_percentage,indica_percentage:e.indica_percentage}:this._createEmptyEditorState()),this.requestUpdate())}_openIrrigationDialog(){const t=this.dataService.getGrowspaceDevices().find(t=>t.device_id===this.selectedDevice);if(!t||!t.overview_entity_id)return;const e=this.hass.states[t.overview_entity_id],i=e?.attributes||{},r=i.irrigation_times||[],a=i.drain_times||[],n=i.irrigation_pump_entity||"",s=i.drain_pump_entity||"",o=i.irrigation_duration||3,l=i.drain_duration||3;this._irrigationDialog={open:!0,growspace_id:t.device_id,growspace_name:t.name,irrigation_pump_entity:n,drain_pump_entity:s,irrigation_duration:o,drain_duration:l,irrigation_times:r,drain_times:a}}async _saveIrrigationPumpSettings(){if(this._irrigationDialog)try{await this.hass.callService("growspace_manager","set_irrigation_settings",{growspace_id:this._irrigationDialog.growspace_id,irrigation_pump_entity:this._irrigationDialog.irrigation_pump_entity,drain_pump_entity:this._irrigationDialog.drain_pump_entity,irrigation_duration:this._irrigationDialog.irrigation_duration,drain_duration:this._irrigationDialog.drain_duration}),console.log("Irrigation pump settings saved")}catch(t){console.error("Error saving irrigation pump settings:",t)}}async _addIrrigationTime(t,e){if(this._irrigationDialog)try{await this.hass.callService("growspace_manager","add_irrigation_time",{growspace_id:this._irrigationDialog.growspace_id,time:t,...void 0!==e&&{duration:e}}),this._irrigationDialog.irrigation_times.push({time:t,duration:e}),this._irrigationDialog.adding_irrigation_time=void 0,this.requestUpdate(),console.log("Irrigation time added:",t)}catch(t){console.error("Error adding irrigation time:",t)}}async _removeIrrigationTime(t){if(this._irrigationDialog)try{await this.hass.callService("growspace_manager","remove_irrigation_time",{growspace_id:this._irrigationDialog.growspace_id,time:t}),this._irrigationDialog.irrigation_times=this._irrigationDialog.irrigation_times.filter(e=>e.time!==t),this.requestUpdate(),console.log("Irrigation time removed:",t)}catch(t){console.error("Error removing irrigation time:",t)}}async _addDrainTime(t,e){if(this._irrigationDialog)try{await this.hass.callService("growspace_manager","add_drain_time",{growspace_id:this._irrigationDialog.growspace_id,time:t,...void 0!==e&&{duration:e}}),this._irrigationDialog.drain_times.push({time:t,duration:e}),this._irrigationDialog.adding_drain_time=void 0,this.requestUpdate(),console.log("Drain time added:",t)}catch(t){console.error("Error adding drain time:",t)}}async _removeDrainTime(t){if(this._irrigationDialog)try{await this.hass.callService("growspace_manager","remove_drain_time",{growspace_id:this._irrigationDialog.growspace_id,time:t}),this._irrigationDialog.drain_times=this._irrigationDialog.drain_times.filter(e=>e.time!==t),this.requestUpdate(),console.log("Drain time removed:",t)}catch(t){console.error("Error removing drain time:",t)}}_startAddingIrrigationTime(t,e){if(!this._irrigationDialog)return;const i=Math.floor(t/e*24),r=Math.floor(60*(t/e*24-i)),a=`${i.toString().padStart(2,"0")}:${r.toString().padStart(2,"0")}`;this._irrigationDialog.adding_irrigation_time={time:a,duration:this._irrigationDialog.irrigation_duration},this.requestUpdate()}_startAddingDrainTime(t,e){if(!this._irrigationDialog)return;const i=Math.floor(t/e*24),r=Math.floor(60*(t/e*24-i)),a=`${i.toString().padStart(2,"0")}:${r.toString().padStart(2,"0")}`;this._irrigationDialog.adding_drain_time={time:a,duration:this._irrigationDialog.drain_duration},this.requestUpdate()}_handleStrainEditorChange(t,e){this._strainLibraryDialog&&this._strainLibraryDialog.editorState&&(this._strainLibraryDialog.editorState[t]=e,this.requestUpdate())}_toggleCropMode(t){this._strainLibraryDialog&&(this._strainLibraryDialog.isCropping=t,this.requestUpdate())}_toggleImageSelector(t){this._strainLibraryDialog&&(this._strainLibraryDialog.isImageSelectorOpen=t,this.requestUpdate())}_handleSelectLibraryImage(t){if(this._strainLibraryDialog&&this._strainLibraryDialog.editorState){this._strainLibraryDialog.editorState.image=t;const e=this._strainLibraryDialog.strains.find(e=>e.image===t&&!!e.image_crop_meta);e&&e.image_crop_meta?this._strainLibraryDialog.editorState.image_crop_meta={...e.image_crop_meta}:this._strainLibraryDialog.editorState.image_crop_meta=void 0,this._strainLibraryDialog.isImageSelectorOpen=!1,this.requestUpdate()}}_toggleEnvGraph(t){const e=new Set(this._activeEnvGraphs);e.has(t)?e.delete(t):e.add(t),this._activeEnvGraphs=e,this.requestUpdate()}_setGraphRange(t,e){this._graphRanges={...this._graphRanges,[t]:e},this.requestUpdate()}_handleGraphHover(t,e,i,r,a){const n=t.clientX-r.left,s=r.width,o="1h"===(this._graphRanges[e]||"24h")?36e5:864e5,l=(new Date).getTime()-o+n/s*o;let c=i[0],d=Math.abs(i[0].time-l);for(let t=1;t<i.length;t++){const e=Math.abs(i[t].time-l);e<d&&(d=e,c=i[t])}const p=new Date(c.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});let u=`${c.value} ${a}`;"state"===a&&(u="irrigation"===e||"drain"===e?1===c.value?`ON (${c.meta?.duration||"Unknown"})`:"OFF":1===c.value?"Optimal Conditions":c.meta||"Not Optimal"),this._tooltip={id:e,x:n,time:p,value:u}}renderEnvGraph(t,e,i,r,a="line"){const n=this.dataService.getGrowspaceDevices().find(t=>t.device_id===this.selectedDevice);if(!n)return j``;let s=n.name.toLowerCase().replace(/\s+/g,"_");n.overview_entity_id&&(s=n.overview_entity_id.replace("sensor.",""));let o=`binary_sensor.${s}_optimal_conditions`;"cure"===s?o="binary_sensor.cure_optimal_curing":"dry"===s&&(o="binary_sensor.dry_optimal_drying"),this.hass.states[o];const l=n.overview_entity_id?this.hass.states[n.overview_entity_id]:void 0,c=this._graphRanges[t]||"24h",d="1h"===c?36e5:864e5,p=new Date,u=new Date(p.getTime()-d);let h=[];if("irrigation"===t||"drain"===t){const e="irrigation"===t?l?.attributes?.irrigation_times:l?.attributes?.drain_times;if(e&&Array.isArray(e)){const t=[],i=[new Date(p),new Date(u)];e.forEach(e=>{const[r,a]=e.time.split(":").map(Number),n=1e3*(e.duration||60);i.forEach(e=>{const i=new Date(e);i.setHours(r,a,0,0);const s=new Date(i.getTime()+n);s.getTime()>u.getTime()&&i.getTime()<p.getTime()&&t.push({start:Math.max(i.getTime(),u.getTime()),end:Math.min(s.getTime(),p.getTime())})})}),t.sort((t,e)=>t.start-e.start),h.push({time:u.getTime(),value:0}),t.forEach(t=>{const e=(t.end-t.start)/1e3;let i=`${e}s`;e>=60&&(i=`${Math.round(e/60)}m`),h.push({time:t.start-1,value:0}),h.push({time:t.start,value:1,meta:{duration:i}}),h.push({time:t.end,value:1,meta:{duration:i}}),h.push({time:t.end+1,value:0})}),h.push({time:p.getTime(),value:0}),a="step"}}else{if(!this._historyData||0===this._historyData.length)return j``;const e=(t,e)=>{if(t&&t.attributes){if("state"===r&&"optimal"===e)return"on"===t.state?1:0;if("light"===e){return!0===(t.attributes.is_lights_on??t.attributes.observations?.is_lights_on)?1:0}return void 0!==t.attributes[e]?t.attributes[e]:t.attributes.observations&&"object"==typeof t.attributes.observations?t.attributes.observations[e]:void 0}},i=(t,e)=>{if("state"===r&&"optimal"===e)return t.attributes.reasons;if("light"===e){return{state:t.attributes.is_lights_on??t.attributes.observations?.is_lights_on?"ON":"OFF"}}},a=[...this._historyData].sort((t,e)=>new Date(t.last_changed).getTime()-new Date(e.last_changed).getTime());a.forEach(r=>{const a=new Date(r.last_changed).getTime();if(a<u.getTime())return;const n=e(r,t),s=i(r,t);void 0===n||isNaN(parseFloat(n))||h.push({time:a,value:parseFloat(n),meta:s})})}if(h.length<2&&"step"!==a)return j``;const g=1e3,m="step"===a?100:180;let f=0,v=1;"state"!==r&&"irrigation"!==t&&"drain"!==t&&(f=Math.min(...h.map(t=>t.value)),v=Math.max(...h.map(t=>t.value)));const y=v-f||1,b=f-.1*y,w=v+.1*y,x=w-b,_=h.length>0?h.reduce((t,e)=>t+e.value,0)/h.length:(f+v)/2;let $="";if("step"===a){const t=[];let e=h.length>0?h[0].value:0;t.push([0,m-(e-b)/x*m]),h.forEach(i=>{const r=(i.time-u.getTime())/d*g,a=m-(i.value-b)/x*m;t.push([r,t[t.length-1][1]]),t.push([r,a]),e=i.value}),t.push([g,m-(e-b)/x*m]),$=`M ${t.map(t=>`${t[0]},${t[1]}`).join(" L ")}`}else{const t=h.map(t=>[(t.time-u.getTime())/d*g,m-(t.value-b)/x*m]);$=`M ${t.map(t=>`${t[0]},${t[1]}`).join(" L ")}`}if("step"===a)return j`
        <div class="gs-light-cycle-card" style="margin-top: 12px; border: 1px solid ${e}40;">
           <div class="gs-light-header-row">
               <div class="gs-light-title" style="font-size: 1.2rem; flex: 1; cursor: pointer;" @click=${()=>this._toggleEnvGraph(t)}>
                   <div class="gs-icon-box" style="color: ${e}; background: ${e}10; border-color: ${e}30; width: 36px; height: 36px;">
                        <svg style="width:20px;height:20px;fill:currentColor;" viewBox="0 0 24 24"><path d="${kt}"></path></svg>
                   </div>
                   <div>
                      <div>${i}</div>
                      <div class="gs-light-subtitle">${c.toUpperCase()} HISTORY • ${(()=>{if("light"===t){const t=this.dataService.getGrowspaceDevices().find(t=>t.device_id===this.selectedDevice);if(t){const e=`binary_sensor.${t.device_id}_light_schedule_correct`,i=this.hass.states[e];if(i?.attributes["Expected schedule"])return i.attributes["Expected schedule"]}return 1===h[h.length-1]?.value?"ON":"OFF"}return"state"===r?1===h[h.length-1]?.value?"OPTIMAL":"NOT OPTIMAL":"irrigation"===t||"drain"===t?1===h[h.length-1]?.value?"ACTIVE":"INACTIVE":`${f.toFixed(1)} - ${v.toFixed(1)} ${r}`})()}</div>
                   </div>
               </div>
               
               <!-- Range Toggle -->
               <div style="display: flex; gap: 4px; margin-right: 12px;">
                  <button 
                    style="background: ${"24h"===c?e+"30":"transparent"}; border: 1px solid ${e}40; color: ${"24h"===c?"#fff":"#aaa"}; border-radius: 4px; padding: 2px 6px; font-size: 0.7rem; cursor: pointer;"
                    @click=${e=>{e.stopPropagation(),this._setGraphRange(t,"24h")}}
                  >24H</button>
                  <button 
                    style="background: ${"1h"===c?e+"30":"transparent"}; border: 1px solid ${e}40; color: ${"1h"===c?"#fff":"#aaa"}; border-radius: 4px; padding: 2px 6px; font-size: 0.7rem; cursor: pointer;"
                    @click=${e=>{e.stopPropagation(),this._setGraphRange(t,"1h")}}
                  >1H</button>
               </div>

               <div style="opacity: 0.7; cursor: pointer;" @click=${()=>this._toggleEnvGraph(t)}>
                  <svg style="width:24px;height:24px;fill:currentColor;" viewBox="0 0 24 24"><path d="${"M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"}"></path></svg>
               </div>
           </div>

           <div class="gs-chart-container" style="height: 100px;"
                @mousemove=${e=>{const i=e.currentTarget.getBoundingClientRect();this._handleGraphHover(e,t,h,i,r)}}
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
                   <path class="chart-line" d="${$}" style="stroke: ${e};" />
                   <path class="chart-gradient-fill" d="${$} V 100 H 0 Z" style="fill: url(#grad-${t});" />
               </svg>
               <div class="chart-markers">
                  <span>-24H</span>
                  <span>NOW</span>
               </div>
           </div>
        </div>
      `;const D=[w,w-.25*x,w-.5*x,w-.75*x,b];return j`
      <div class="gs-env-graph-card" style="margin-top: 12px; background: #1a1a1a; border-radius: 12px; padding: 16px;">
         <div class="gs-env-graph-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; cursor: pointer;" @click=${()=>this._toggleEnvGraph(t)}>
             <div style="display: flex; align-items: center; gap: 12px;">
                 <svg style="width:24px;height:24px;fill:${e};" viewBox="0 0 24 24"><path d="${kt}"></path></svg>
                 <div>
                    <div style="font-size: 0.9rem; font-weight: 600; color: #fff;">${i}</div>
                    <div style="font-size: 0.75rem; color: #999;">${c.toUpperCase()} HISTORY</div>
                 </div>
             </div>
             
             <div style="display: flex; align-items: center; gap: 12px;">
                <!-- Range Toggle -->
                 <div style="display: flex; gap: 4px;">
                    <button 
                      style="background: ${"24h"===c?e+"30":"transparent"}; border: 1px solid ${e}40; color: ${"24h"===c?"#fff":"#aaa"}; border-radius: 4px; padding: 2px 6px; font-size: 0.7rem; cursor: pointer;"
                      @click=${e=>{e.stopPropagation(),this._setGraphRange(t,"24h")}}
                    >24H</button>
                    <button 
                      style="background: ${"1h"===c?e+"30":"transparent"}; border: 1px solid ${e}40; color: ${"1h"===c?"#fff":"#aaa"}; border-radius: 4px; padding: 2px 6px; font-size: 0.7rem; cursor: pointer;"
                      @click=${e=>{e.stopPropagation(),this._setGraphRange(t,"1h")}}
                    >1H</button>
                 </div>

                 <div style="text-align: right;">
                    <div style="font-size: 0.85rem; color: #999;">${f.toFixed(1)} - ${v.toFixed(1)} ${r}</div>
                 </div>
             </div>
         </div>

         <div class="gs-env-chart-container" style="position: relative; height: 180px; background: #0d0d0d; border-radius: 8px; padding: 20px 40px 30px 50px;"
              @mousemove=${e=>{const i=e.currentTarget.getBoundingClientRect();this._handleGraphHover(e,t,h,i,r)}}
              @mouseleave=${()=>this._tooltip=null}>

             ${this._tooltip&&this._tooltip.id===t?j`
                 <div style="position: absolute; left: ${this._tooltip.x}px; top: 0; bottom: 0; width: 1px; background: ${e}80; pointer-events: none;"></div>
                 <div style="position: absolute; left: ${this._tooltip.x+10}px; top: 20px; background: rgba(0,0,0,0.9); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 0.75rem; border: 1px solid ${e}; pointer-events: none; z-index: 1000;">
                    <div style="color: ${e}; font-weight: 600;">${this._tooltip.time}</div>
                    <div style="margin-top: 4px;">${this._tooltip.value}</div>
                 </div>
             `:""}

             <!-- Y-axis labels -->
             <div style="position: absolute; left: 0; top: 20px; bottom: 30px; width: 45px; display: flex; flex-direction: column; justify-content: space-between; font-size: 0.65rem; color: #666; text-align: right; padding-right: 8px;">
                ${D.map(t=>j`<div>${t.toFixed(1)} ${r}</div>`)}
             </div>

             <svg style="position: absolute; left: 50px; top: 20px; right: 40px; bottom: 30px; width: calc(100% - 90px); height: calc(100% - 50px);" viewBox="0 0 1000 ${m}" preserveAspectRatio="none">
                 <defs>
                     <linearGradient id="grad-${t}" x1="0%" y1="0%" x2="0%" y2="100%">
                         <stop offset="0%" style="stop-color:${e};stop-opacity:0.3" />
                         <stop offset="100%" style="stop-color:${e};stop-opacity:0" />
                     </linearGradient>
                 </defs>
                 
                 <!-- Vertical grid lines -->
                 <line x1="0" y1="0" x2="0" y2="${m}" stroke="#333" stroke-width="1" />
                 <line x1="${250}" y1="0" x2="${250}" y2="${m}" stroke="#222" stroke-width="1" stroke-dasharray="2,2" />
                 <line x1="${500}" y1="0" x2="${500}" y2="${m}" stroke="#222" stroke-width="1" stroke-dasharray="2,2" />
                 <line x1="${750}" y1="0" x2="${750}" y2="${m}" stroke="#222" stroke-width="1" stroke-dasharray="2,2" />
                 <line x1="${g}" y1="0" x2="${g}" y2="${m}" stroke="#333" stroke-width="1" />
                 
                 <!-- Target/average line -->
                 ${_?j`
                   <line x1="0" y1="${m-(_-b)/x*m}" 
                         x2="${g}" y2="${m-(_-b)/x*m}" 
                         stroke="${e}" stroke-width="1.5" stroke-dasharray="5,5" opacity="0.5" />
                 `:""}
                 
                 <!-- Data line and fill -->
                 <path d="${$} V ${m} H 0 Z" fill="url(#grad-${t})" />
                 <path d="${$}" fill="none" stroke="${e}" stroke-width="2.5" />
             </svg>
             
             <!-- X-axis markers -->
             <div style="position: absolute; left: 50px; right: 40px; bottom: 5px; display: flex; justify-content: space-between; font-size: 0.65rem; color: #666;">
                ${"24h"===c?j`
                    <span>24H</span>
                    <span>18H</span>
                    <span>12H</span>
                    <span>6H</span>
                `:j`
                    <span>60m</span>
                    <span>45m</span>
                    <span>30m</span>
                    <span>15m</span>
                `}
                <span style="color: ${e};">NOW</span>
             </div>
         </div>
      </div>
    `}_setStrainSearchQuery(t){this._strainLibraryDialog&&(this._strainLibraryDialog.searchQuery=t,this.requestUpdate())}_toggleAddStrainForm(){}_promptClearAll(){}_cancelClearAll(){}async _addStrain(){if(!this._strainLibraryDialog?.editorState?.strain)return;const t=this._strainLibraryDialog.editorState,e={strain:t.strain,phenotype:t.phenotype,breeder:t.breeder,type:t.type,flowering_days_min:t.flowering_min?parseInt(t.flowering_min):void 0,flowering_days_max:t.flowering_max?parseInt(t.flowering_max):void 0,lineage:t.lineage,sex:t.sex,description:t.description,image:t.image,image_crop_meta:t.image_crop_meta,sativa_percentage:t.sativa_percentage,indica_percentage:t.indica_percentage};try{await this.dataService.addStrain(e);const i=`${t.strain}|${t.phenotype||"default"}`,r={key:i,strain:t.strain,phenotype:t.phenotype,breeder:t.breeder,type:t.type,flowering_days_min:e.flowering_days_min,flowering_days_max:e.flowering_days_max,lineage:t.lineage,sex:t.sex,description:t.description,image:t.image,image_crop_meta:t.image_crop_meta,sativa_percentage:t.sativa_percentage,indica_percentage:t.indica_percentage};this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(t=>t.key!==i),this._strainLibraryDialog.strains.push(r),this._switchStrainView("browse"),this._fetchStrainLibrary()}catch(t){console.error("Error adding strain:",t)}}async _removeStrain(t){if(this._strainLibraryDialog)try{const e=t.split("|"),i=e[0],r=e.length>1&&"default"!==e[1]?e[1]:void 0;await this.dataService.removeStrain(i,r),this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e.key!==t),this.requestUpdate(),this._fetchStrainLibrary()}catch(t){console.error("Error removing strain:",t)}}async _clearStrains(){await this.dataService.clearStrainLibrary(),this._strainLibraryDialog&&(this._strainLibraryDialog.strains=[],this._strainLibraryDialog.confirmClearAll=!1,this.requestUpdate(),this._fetchStrainLibrary())}async _handleExportLibrary(){const t=await this.hass.connection.subscribeEvents(e=>{e.data&&e.data.url&&(this._downloadFile(e.data.url),t())},"growspace_manager_strain_library_exported");try{await this.hass.callService("growspace_manager","export_strain_library")}catch(e){console.error("Failed to call export service",e),t()}}_downloadFile(t){const e=document.createElement("a");e.style.display="none",e.href=t,e.download=t.split("/").pop()||"export.zip",document.body.appendChild(e),e.click(),document.body.removeChild(e)}_openImportDialog(){this._strainLibraryDialog&&(this._strainLibraryDialog.importDialog={open:!0,replace:!1},this.requestUpdate())}_handleImportDialogChange(t){this._strainLibraryDialog&&this._strainLibraryDialog.importDialog&&(void 0!==t.open&&(this._strainLibraryDialog.importDialog.open=t.open),void 0!==t.replace&&(this._strainLibraryDialog.importDialog.replace=t.replace),this.requestUpdate())}async _performImport(){if(!this._strainLibraryDialog?.importDialog)return;const t=this._strainLibraryDialog.importDialog.replace,e=document.createElement("input");e.type="file",e.accept=".zip",e.onchange=async e=>{const i=e.target.files?.[0];if(i)try{const e=await this.dataService.importStrainLibrary(i,t);alert(`Import successful! ${e.imported_count||""} strains imported.`),this._strainLibraryDialog&&this._strainLibraryDialog.importDialog&&(this._strainLibraryDialog.importDialog.open=!1),this.requestUpdate()}catch(t){console.error("Import failed:",t),alert(`Import failed: ${t.message}`)}},e.click()}updateGrid(){this.dataService=new rn(this.hass),this.requestUpdate()}_handleDragStart(t,e){this._draggedPlant=e,t.dataTransfer?.setData("text/plain",JSON.stringify({id:e.entity_id}));t.target.classList.add("dragging")}_handleDragEnd(t){t.target.classList.remove("dragging")}_handleDragOver(t){t.preventDefault()}async _handleDrop(t,e,i,r){if(t.preventDefault(),!this._draggedPlant||!this.selectedDevice)return;const a=this._draggedPlant;this._draggedPlant=null;try{if(r){const t=a.attributes.plant_id||a.entity_id.replace("sensor.",""),e=r.attributes.plant_id||r.entity_id.replace("sensor.","");await this.hass.callService("growspace_manager","switch_plants",{plant1_id:t,plant2_id:e}),this.updateGrid()}else await this._movePlant(a,e,i)}catch(t){console.error("Error during drag-and-drop:",t)}}async _movePlant(t,e,i){try{const r=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.dataService.updatePlant({plant_id:r,row:e,col:i})}catch(t){console.error("Error moving plant:",t)}}_moveClonePlant(t,e){this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Moved clone ${t.attributes.friendly_name} to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})}_openConfigDialog(){this._configDialog={open:!0,currentTab:"add_growspace",addGrowspaceData:{name:"",rows:3,plants_per_row:3,notification_service:""},environmentData:{selectedGrowspaceId:"",temp_sensor:"",humidity_sensor:"",vpd_sensor:"",co2_sensor:"",light_sensor:"",fan_switch:""},globalData:{weather_entity:"",lung_room_temp:"",lung_room_humidity:""}}}_handleAddGrowspaceSubmit(){if(!this._configDialog)return;const t=this._configDialog.addGrowspaceData;t.name?this.dataService.addGrowspace(t).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(t=>alert(`Error: ${t.message}`)):alert("Name is required")}_handleEnvSubmit(){if(!this._configDialog)return;const t=this._configDialog.environmentData;t.selectedGrowspaceId&&t.temp_sensor&&t.humidity_sensor&&t.vpd_sensor?this.dataService.configureGrowspaceSensors({growspace_id:t.selectedGrowspaceId,temperature_sensor:t.temp_sensor,humidity_sensor:t.humidity_sensor,vpd_sensor:t.vpd_sensor,co2_sensor:t.co2_sensor||void 0,light_sensor:t.light_sensor||void 0,fan_switch:t.fan_switch||void 0}).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(t=>alert(`Error: ${t.message}`)):alert("Growspace and required sensors (Temp, Hum, VPD) are mandatory")}_handleGlobalSubmit(){if(!this._configDialog)return;const t=this._configDialog.globalData;this.dataService.configureGlobalSettings(t).then(()=>{this._configDialog=null,this.requestUpdate()}).catch(t=>alert(`Error: ${t.message}`))}_openGrowMasterDialog(){this.selectedDevice&&(this._growMasterDialog={open:!0,growspaceId:this.selectedDevice,userQuery:"",isLoading:!1,response:null,mode:"single"})}async _handleAskAdvice(){if(this._growMasterDialog&&this._growMasterDialog.userQuery){this._growMasterDialog.isLoading=!0,this._growMasterDialog.response=null,this.requestUpdate();try{const t=await this.dataService.askGrowAdvice(this._growMasterDialog.growspaceId,this._growMasterDialog.userQuery);this._growMasterDialog&&(t&&t.response?"string"==typeof t.response?this._growMasterDialog.response=t.response:"object"==typeof t.response&&"response"in t.response&&"string"==typeof t.response.response?this._growMasterDialog.response=t.response.response:this._growMasterDialog.response=JSON.stringify(t,null,2):this._growMasterDialog.response=JSON.stringify(t,null,2))}catch(t){this._growMasterDialog&&(this._growMasterDialog.response=`Error: ${t.message||"Failed to get advice."}`)}finally{this._growMasterDialog&&(this._growMasterDialog.isLoading=!1,this.requestUpdate())}}}async _handleAnalyzeAll(){if(this._growMasterDialog){this._growMasterDialog.isLoading=!0,this._growMasterDialog.response=null,this._growMasterDialog.mode="all",this.requestUpdate();try{const t=await this.dataService.analyzeAllGrowspaces();this._growMasterDialog&&(t&&t.response?"string"==typeof t.response?this._growMasterDialog.response=t.response:"object"==typeof t.response&&"response"in t.response&&"string"==typeof t.response.response?this._growMasterDialog.response=t.response.response:this._growMasterDialog.response=JSON.stringify(t,null,2):this._growMasterDialog.response=JSON.stringify(t,null,2))}catch(t){this._growMasterDialog&&(this._growMasterDialog.response=`Error: ${t.message||"Failed to get advice."}`)}finally{this._growMasterDialog&&(this._growMasterDialog.isLoading=!1,this.requestUpdate())}}}async _handleGetStrainRecommendation(){if(this._strainRecommendationDialog&&this._strainRecommendationDialog.userQuery){this._strainRecommendationDialog.isLoading=!0,this._strainRecommendationDialog.response=null,this.requestUpdate();try{const t=await this.dataService.getStrainRecommendation(this._strainRecommendationDialog.userQuery);this._strainRecommendationDialog&&(t&&"string"==typeof t.response?this._strainRecommendationDialog.response=t.response:this._strainRecommendationDialog.response=JSON.stringify(t,null,2))}catch(t){this._strainRecommendationDialog&&(this._strainRecommendationDialog.response=`Error: ${t.message||"Failed to get recommendation."}`)}finally{this._strainRecommendationDialog&&(this._strainRecommendationDialog.isLoading=!1,this.requestUpdate())}}}_openStrainRecommendationDialog(){this._strainRecommendationDialog={open:!0,userQuery:"",isLoading:!1,response:null}}render(){if(!this.hass)return j`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;this.dataService=new rn(this.hass);const t=this.dataService.getGrowspaceDevices();if(!t.length)return j`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;if(!this._defaultApplied&&this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);e&&(this.selectedDevice=e.device_id),this._defaultApplied=!0}this.selectedDevice&&t.find(t=>t.device_id===this.selectedDevice)||(this.selectedDevice=t[0].device_id);const e=t.find(t=>t.device_id===this.selectedDevice);if(!e)return j`<ha-card><div class="error">No valid growspace selected.</div></ha-card>`;const i=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;i&&Object.entries(i).forEach(([t,e])=>{});const r=en.calculateEffectiveRows(e),{grid:a}=en.createGridLayout(e.plants,r,e.plants_per_row),n=e.plants_per_row>6,s=this._strainLibrary;return j`
      <ha-card class=${n?"wide-growspace":""}>
        <div class="unified-growspace-card">
          ${this.renderHeader(t)}
          ${this._isCompactView?"":this.renderGrowspaceHeader(e)}
          ${this.renderGrid(a,r,e.plants_per_row,s)}
        </div>
      </ha-card>
      
      ${this.renderDialogs()}
    `}renderGrowspaceHeader(t){const e=en.getDominantStage(t.plants),i=this.dataService.getGrowspaceDevices();let r=t.name.toLowerCase().replace(/\s+/g,"_");t.overview_entity_id&&(r=t.overview_entity_id.replace("sensor.",""));let a=`binary_sensor.${r}_optimal_conditions`;const n="cure"===r,s="dry"===r;n?a="binary_sensor.cure_optimal_curing":s&&(a="binary_sensor.dry_optimal_drying");const o=this.hass.states[a],l=t.overview_entity_id?this.hass.states[t.overview_entity_id]:void 0,c=(t,e)=>{if(t&&t.attributes)return void 0!==t.attributes[e]?t.attributes[e]:t.attributes.observations&&"object"==typeof t.attributes.observations?t.attributes.observations[e]:void 0},d=c(o,"temperature"),p=c(o,"humidity"),u=c(o,"vpd"),h=n||s,g=l?.attributes?.co2_sensor,m=h||!g?void 0:c(o,"co2"),f=c(o,"is_lights_on"),v=!h&&null!=f,y=!0===f;t.plants.some(t=>"flower"===t.attributes.stage);let b=[];if(this._historyData&&this._historyData.length>0){const t=[...this._historyData].sort((t,e)=>new Date(t.last_changed).getTime()-new Date(e.last_changed).getTime()),e=new Date,i=new Date(e.getTime()-864e5),r=1e3,a=100,n=[];let s=t.length>0?!0!==c(t[0],"is_lights_on"):y;t.forEach(t=>{const e=new Date(t.last_changed).getTime(),r=!0===c(t,"is_lights_on");e>=i.getTime()&&b.push({time:e,state:r})}),s=b.length>0?!b[0].state:y,n.push([0,s?0:a]),b.forEach(t=>{const e=(t.time-i.getTime())/864e5*r;n.push([e,s?0:a]),s=t.state,n.push([e,s?0:a])}),n.push([r,s?0:a]),n.map(t=>`${t[0]},${t[1]}`).join(" L ");const o=[...t].reverse(),l=o.find(t=>!0===c(t,"is_lights_on"));if(l){const t=new Date(l.last_changed);t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).replace(/ [AP]M/,""),t.toLocaleTimeString([],{hour12:!0}).slice(-2)}const d=o.find(t=>!1===c(t,"is_lights_on"));if(d){const t=new Date(d.last_changed);t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",hour12:!0}).replace(/ [AP]M/,""),t.toLocaleTimeString([],{hour12:!0}).slice(-2)}}const w=t=>{if(!t||0===t.length)return null;const e=new Date,i=60*e.getHours()+e.getMinutes(),r=[...t].sort((t,e)=>{const[i,r]=t.time.split(":").map(Number),[a,n]=e.time.split(":").map(Number);return 60*i+r-(60*a+n)}),a=r.find(t=>{const[e,r]=t.time.split(":").map(Number);return 60*e+r>i});return a?a.time.slice(0,5):r[0].time.slice(0,5)},x=w(l?.attributes?.irrigation_times),_=w(l?.attributes?.drain_times);return j`
      <div class="gs-stats-container">
         <div class="gs-header-top">
            <div class="gs-title-group">
               <!-- Title as Dropdown if no default is set -->
               ${this._config?.default_growspace?j`
                 <h3 class="gs-title">${t.name}</h3>
               `:j`
                 <select class="growspace-select-header" .value=${this.selectedDevice||""} @change=${this._handleDeviceChange}>
                    ${i.map(t=>j`<option value="${t.device_id}">${t.name}</option>`)}
                 </select>
               `}


               ${e?j`
               <div style="display: flex; gap: 8px;">
                <div class="gs-stage-chip">
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${en.getPlantStageIcon(e.stage)}"></path></svg>
                  ${e.stage.charAt(0).toUpperCase()+e.stage.slice(1)} • Day ${e.days}
                </div>
                <div class="gs-stage-chip">
                  <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24"><path d="${en.getPlantStageIcon(e.stage)}"></path></svg>
                  ${e.stage.charAt(0).toUpperCase()+e.stage.slice(1)} • Week ${Math.ceil(e.days/7)}
                </div>
               </div>
               `:""}
            </div>

            <div class="gs-stats-chips">
                ${void 0!==d?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("temperature")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("temperature")}>
                     <svg viewBox="0 0 24 24"><path d="${Et}"></path></svg>${d}°C
                   </div>`:""}
                ${void 0!==p?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("humidity")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("humidity")}>
                     <svg viewBox="0 0 24 24"><path d="${"M12,3.25C12,3.25 6,10 6,14C6,17.32 8.69,20 12,20A6,6 0 0,0 18,14C18,10 12,3.25 12,3.25M14.47,9.97L15.53,11.03L9.53,17.03L8.47,15.97M9.75,10A1.25,1.25 0 0,1 11,11.25A1.25,1.25 0 0,1 9.75,12.5A1.25,1.25 0 0,1 8.5,11.25A1.25,1.25 0 0,1 9.75,10M14.25,14.5A1.25,1.25 0 0,1 15.5,15.75A1.25,1.25 0 0,1 14.25,17A1.25,1.25 0 0,1 13,15.75A1.25,1.25 0 0,1 14.25,14.5Z"}"></path></svg>${p}%
                   </div>`:""}
                ${void 0!==u?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("vpd")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("vpd")}>
                     <svg viewBox="0 0 24 24"><path d="${"M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58 1 12.63 2.17 11.1 3.35 9.57 5.25 9.15 5.88 6.85 7.75 5.43 9.63 4 12 4 14.93 4 16.96 6.04 19 8.07 19 11 20.73 11.2 21.86 12.5 23 13.78 23 15.5 23 17.38 21.69 18.69 20.38 20 18.5 20M6.5 18H18.5Q19.55 18 20.27 17.27 21 16.55 21 15.5 21 14.45 20.27 13.73 19.55 13 18.5 13H17V11Q17 8.93 15.54 7.46 14.08 6 12 6 9.93 6 8.46 7.46 7 8.93 7 11H6.5Q5.05 11 4.03 12.03 3 13.05 3 14.5 3 15.95 4.03 17 5.05 18 6.5 18M12 12Z"}"></path></svg>${u} kPa
                   </div>`:""}
                 ${void 0!==m?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("co2")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("co2")}>
                     <svg viewBox="0 0 24 24"><path d="${"M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z"}"></path></svg>${m} ppm
                   </div>`:""}

                ${v?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("light")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("light")}>
                     <svg viewBox="0 0 24 24"><path d="${y?"M12,6A6,6 0 0,1 18,12C18,14.22 16.79,16.16 15,17.2V19A1,1 0 0,1 14,20H10A1,1 0 0,1 9,19V17.2C7.21,16.16 6,14.22 6,12A6,6 0 0,1 12,6M14,21V22A1,1 0 0,1 13,23H11A1,1 0 0,1 10,22V21H14M20,11H23V13H20V11M1,11H4V13H1V11M13,1V4H11V1H13M4.92,3.5L7.05,5.64L5.63,7.05L3.5,4.93L4.92,3.5M16.95,5.63L19.07,3.5L20.5,4.93L18.37,7.05L16.95,5.63Z":"M12,2C9.76,2 7.78,3.05 6.5,4.68L16.31,14.5C17.94,13.21 19,11.24 19,9A7,7 0 0,0 12,2M3.28,4L2,5.27L5.04,8.3C5,8.53 5,8.76 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H14.73L18.73,22L20,20.72L3.28,4M9,20V21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9Z"}"></path></svg>
                     ${y?"On":"Off"}
                   </div>`:""}

                 ${x?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("irrigation")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("irrigation")}>
                     <svg viewBox="0 0 24 24"><path d="${It}"></path></svg>
                     Next: ${x}
                   </div>`:""}

                 ${_?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("drain")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("drain")}>
                     <svg viewBox="0 0 24 24"><path d="${It}"></path></svg>
                     Next: ${_}
                   </div>`:""}

                 ${o?j`
                   <div class="stat-chip ${this._activeEnvGraphs.has("optimal")?"active":""}"
                        @click=${()=>this._toggleEnvGraph("optimal")}>
                     <svg viewBox="0 0 24 24"><path d="${"on"===o.state?"M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z":"M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"}"></path></svg>
                     ${"on"===o.state?"Optimal Conditions":o.attributes.reasons||"Not Optimal"}
                   </div>`:""}

                ${this._isCompactView?"":j`
                  <div class="menu-container">
                    <div class="menu-button" @click=${()=>this._menuOpen=!this._menuOpen}>
                      <svg viewBox="0 0 24 24"><path d="${"M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"}"></path></svg>
                    </div>
                    
                    ${this._menuOpen?j`
                      <div class="menu-dropdown" @click=${t=>t.stopPropagation()}>
                        <div class="menu-item" @click=${()=>{this._openConfigDialog(),this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${bt}"></path></svg>
                          <span class="menu-item-label">Config</span>
                        </div>

                        <div class="menu-item" @click=${()=>{this._isEditMode=!this._isEditMode,this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${At}"></path></svg>
                          <span class="menu-item-label">Edit</span>
                          <div class="menu-toggle-switch ${this._isEditMode?"active":""}"></div>
                        </div>
                        
                        <div class="menu-item" @click=${()=>{this._isCompactView=!0,this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${kt}"></path></svg>
                          <span class="menu-item-label">Compact View</span>
                          <div class="menu-toggle-switch ${this._isCompactView?"active":""}"></div>
                        </div>
                        
                        
                        <div class="menu-item" @click=${()=>{this._openStrainLibraryDialog(),this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${_t}"></path></svg>
                          <span class="menu-item-label">Strains</span>
                        </div>
                        
                        <div class="menu-item" @click=${()=>{this._openIrrigationDialog(),this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${It}"></path></svg>
                          <span class="menu-item-label">Irrigation</span>
                        </div>
                        
                        <div class="menu-item" @click=${()=>{this._openGrowMasterDialog(),this._menuOpen=!1}}>
                          <svg viewBox="0 0 24 24"><path d="${gt}"></path></svg>
                          <span class="menu-item-label">Ask AI</span>
                        </div>
                      </div>
                    `:""}
                  </div>
                `}
</div>
  </div>
 


<!-- Active Environmental Graphs -->
  ${this._activeEnvGraphs.has("temperature")?this.renderEnvGraph("temperature","#FF5722","Temperature","°C"):""}
         ${this._activeEnvGraphs.has("humidity")?this.renderEnvGraph("humidity","#2196F3","Humidity","%"):""}
         ${this._activeEnvGraphs.has("vpd")?this.renderEnvGraph("vpd","#9C27B0","VPD","kPa"):""}
         ${this._activeEnvGraphs.has("co2")?this.renderEnvGraph("co2","#90A4AE","CO2","ppm"):""}
         ${this._activeEnvGraphs.has("light")?this.renderEnvGraph("light","#FFEB3B","Light Cycle","state","step"):""}
         ${this._activeEnvGraphs.has("optimal")?this.renderEnvGraph("optimal","#4CAF50","Optimal Conditions","state","step"):""}
         ${this._activeEnvGraphs.has("irrigation")?this.renderEnvGraph("irrigation","#2196F3","Irrigation Schedule","state","step"):""}
         ${this._activeEnvGraphs.has("drain")?this.renderEnvGraph("drain","#FF9800","Drain Schedule","state","step"):""}

</div>
  `}renderHeader(t){return this._isCompactView||this._config?.title?(t.find(t=>t.device_id===this.selectedDevice),j`
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
                ${t.map(t=>j`<option value="${t.device_id}">${t.name}</option>`)}
              </select>
            `:j`
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
                <path d="${_t}"></path>
              </svg>
              Strains
            </button>
          </div>
        `:""}
      </div>
    `):j``}renderGrid(t,e,i,r){const a=i>5,n=a?"":`grid-template-columns: repeat(${i}, minmax(0, 1fr)); grid-template-rows: repeat(${e}, 1fr);`;return j`
      <div class="grid ${this._isCompactView?"compact":""} ${a?"force-list-view":""}"
           style="${n}">
        ${t.flat().map((t,e)=>{const a=Math.floor(e/i)+1,n=e%i+1;return t?this.renderPlantSlot(t,a,n,r):this.renderEmptySlot(a,n)})}
      </div>
    `}renderEmptySlot(t,e){return j`
      <div
        class="plant-card-empty"
        style="grid-row: ${t}; grid-column: ${e}"
        @click=${()=>this._openAddPlantDialog(t-1,e-1)}
        @dragover=${this._handleDragOver}
        @drop=${i=>this._handleDrop(i,t,e,null)}
      >
        <div class="plant-header">
          <svg style="width: 48px; height: 48px; opacity: 0.5; fill: currentColor;" viewBox="0 0 24 24">
            <path d="${Mt}"></path>
          </svg>
        </div>
        <div style="font-weight: 500; opacity: 0.8;">Add Plant</div>
      </div>
    `}renderPlantSlot(t,e,i,r){const a=en.getPlantStageColor(t.state),n=t.attributes?.strain,s=t.attributes?.phenotype;let o,l;if(n){const t=r.find(t=>t.strain===n&&t.phenotype===s);if(t&&t.image)o=t.image,l=t.image_crop_meta;else{const t=r.find(t=>t.strain===n&&(!t.phenotype||"default"===t.phenotype));if(t&&t.image)o=t.image,l=t.image_crop_meta;else if(!o){const t=r.find(t=>t.strain===n&&t.image);t&&(o=t.image,l=t.image_crop_meta)}}}const c=this._selectedPlants.has(t.attributes.plant_id||"");return j`
      <div
        class="plant-card-rich"
        style="grid-row: ${e}; grid-column: ${i}; --stage-color: ${a}"
        draggable="true"
        @dragstart=${e=>this._handleDragStart(e,t)}
        @dragend=${this._handleDragEnd}
        @dragover=${this._handleDragOver}
        @drop=${r=>this._handleDrop(r,e,i,t)}
        @click=${()=>this._handlePlantClick(t)}
      >
        ${o?j`
          <img 
            class="plant-card-bg" 
            src="${o}" 
            loading="lazy" 
            alt="${n||"Plant"}"
            style="${an.getImgStyle(l)}"
          />
          <div class="plant-card-overlay"></div>
        `:""}

        ${this._isEditMode?j`
          <div class="plant-card-checkbox" @click=${e=>{e.stopPropagation(),this._togglePlantSelection(t)}}>
             <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: ${c?"var(--primary-color)":"rgba(255,255,255,0.7)"};">
               <path d="${c?"M10,17L5,12L6.41,10.58L10,14.17L17.59,6.58L19,8M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3Z":"M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z"}"></path>
             </svg>
          </div>
        `:""}

        <div class="plant-card-content">
          <div class="pc-info">
            <div class="pc-strain-name" title="${t.attributes?.strain||""}">
              ${t.attributes?.strain||"Unknown Strain"}
            </div>
            ${t.attributes?.phenotype?j`<div class="pc-pheno">${t.attributes.phenotype}</div>`:""}
            <div class="pc-stage">
              ${t.state||"Unknown"}
            </div>
          </div>

          <div class="pc-stats">
            ${this.renderPlantDaysRich(t)}
          </div>
        </div>
      </div>
    `}renderPlantDaysRich(t){const e=[{days:t.attributes?.seedling_days,icon:Tt,title:"Seedling",stage:"seedling"},{days:t.attributes?.mother_days,icon:Tt,title:"Mother",stage:"mother"},{days:t.attributes?.clone_days,icon:Tt,title:"Clone",stage:"clone"},{days:t.attributes?.veg_days,icon:Tt,title:"Veg",stage:"vegetative"},{days:t.attributes?.flower_days,icon:$t,title:"Flower",stage:"flower"},{days:t.attributes?.dry_days,icon:Dt,title:"Dry",stage:"dry"},{days:t.attributes?.cure_days,icon:mt,title:"Cure",stage:"cure"}].filter(t=>void 0!==t.days&&null!==t.days),i=e.filter(t=>t.days),r=(t.state||"").toLowerCase(),a="veg"===r?"vegetative":r;return j`
        ${i.map(t=>{const e=en.getPlantStageColor(t.stage),i=t.stage===a;return j`
                <div class="pc-stat-item ${i?"current-stage":""}">
                    <svg style="color: ${e};" viewBox="0 0 24 24"><path d="${t.icon}"></path></svg>
                    <div class="pc-stat-text">${t.days}d</div>
                </div>
            `})}
    `}renderDialogs(){const t=this.dataService?.getStrainLibrary()||[],e={},i=this.hass.states["sensor.growspaces_list"]?.attributes?.growspaces;i&&Object.entries(i).forEach(([t,i])=>{e[t]=i});const r=this.dataService.getGrowspaceDevices().find(t=>t.device_id===this.selectedDevice);return j`
      ${an.renderAddPlantDialog(this._addPlantDialog,t,r?.name??"",{onClose:()=>this._addPlantDialog=null,onConfirm:()=>this._confirmAddPlant(),onStrainChange:e=>{if(this._addPlantDialog){this._addPlantDialog.strain=e;const i=t.find(t=>t.strain===e);i&&i.phenotype?this._addPlantDialog.phenotype=i.phenotype:this._addPlantDialog.phenotype="",this.requestUpdate()}},onPhenotypeChange:t=>{this._addPlantDialog&&(this._addPlantDialog.phenotype=t)},onVegStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.veg_start=t)},onFlowerStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.flower_start=t)},onSeedlingStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.seedling_start=t)},onMotherStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.mother_start=t)},onCloneStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.clone_start=t)},onDryStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.dry_start=t)},onCureStartChange:t=>{this._addPlantDialog&&(this._addPlantDialog.cure_start=t)},onRowChange:t=>{if(this._addPlantDialog){const e=parseInt(t);!isNaN(e)&&e>0&&(this._addPlantDialog.row=e-1,this.requestUpdate())}},onColChange:t=>{if(this._addPlantDialog){const e=parseInt(t);!isNaN(e)&&e>0&&(this._addPlantDialog.col=e-1,this.requestUpdate())}}})}

      ${an.renderPlantOverviewDialog(this._plantOverviewDialog,e,{onClose:()=>this._plantOverviewDialog=null,onUpdate:()=>{this._updatePlant()},onDelete:t=>{this._handleDeletePlant(t)},onHarvest:t=>{this._harvestPlant(t)},onClone:(t,e)=>{this.clonePlant(t,e)},onTakeClone:(t,e)=>{this.clonePlant(t,e),this._plantOverviewDialog=null},onMoveClone:(t,e)=>{this.hass.callService("growspace_manager","move_clone",{plant_id:t.attributes.plant_id,target_growspace_id:e}).then(()=>{console.log(`Clone ${t.attributes.friendly_name} moved to ${e}`),this._plantOverviewDialog=null}).catch(t=>{console.error("Error moving clone:",t)})},onFinishDrying:t=>{this._finishDryingPlant(t)},_harvestPlant:this._harvestPlant.bind(this),_finishDryingPlant:this._finishDryingPlant.bind(this),onAttributeChange:(t,e)=>{this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes[t]=e)},onToggleShowAllDates:()=>{this._plantOverviewDialog&&(this._plantOverviewDialog.showAllDates=!this._plantOverviewDialog.showAllDates,this.requestUpdate())}})}

      ${an.renderStrainLibraryDialog(this._strainLibraryDialog,{onClose:()=>this._strainLibraryDialog=null,onAddStrain:()=>this._addStrain(),onRemoveStrain:t=>this._removeStrain(t),onClearAll:()=>this._clearStrains(),onEditorChange:(t,e)=>this._handleStrainEditorChange(t,e),onSwitchView:(t,e)=>this._switchStrainView(t,e),onSearch:t=>this._setStrainSearchQuery(t),onToggleCropMode:t=>this._toggleCropMode(t),onToggleImageSelector:t=>this._toggleImageSelector(t),onSelectLibraryImage:t=>this._handleSelectLibraryImage(t),onExportStrains:()=>this._handleExportLibrary(),onOpenImportDialog:()=>this._openImportDialog(),onImportDialogChange:t=>this._handleImportDialogChange(t),onConfirmImport:()=>this._performImport(),onGetRecommendation:()=>this._openStrainRecommendationDialog()})}

      ${an.renderConfigDialog(this._configDialog,e,{onClose:()=>this._configDialog=null,onSwitchTab:t=>{this._configDialog&&(this._configDialog.currentTab=t,this.requestUpdate())},onAddGrowspaceChange:(t,e)=>{this._configDialog&&(this._configDialog.addGrowspaceData[t]=e,this.requestUpdate())},onAddGrowspaceSubmit:()=>this._handleAddGrowspaceSubmit(),onEnvChange:(t,e)=>{this._configDialog&&(this._configDialog.environmentData[t]=e,this.requestUpdate())},onEnvSubmit:()=>this._handleEnvSubmit(),onGlobalChange:(t,e)=>{this._configDialog&&(this._configDialog.globalData[t]=e,this.requestUpdate())},onGlobalSubmit:()=>this._handleGlobalSubmit()})}

    ${this._growMasterDialog?(()=>{let t,e=!1;if(this.selectedDevice&&this.hass){const t=this.selectedDevice,i=[`binary_sensor.${t}_plants_under_stress`,`binary_sensor.${t}_stress`,`binary_sensor.growspace_manager_${t}_stress`];for(const t of i){const i=this.hass.states[t];if(i&&"on"===i.state){e=!0;break}}}if(this.hass){const e=this.hass.states["sensor.growspace_manager"];e&&e.attributes&&e.attributes.ai_settings&&(t=e.attributes.personality||e.attributes.ai_settings.personality)}return an.renderGrowMasterDialog(this._growMasterDialog,e,t,{onClose:()=>this._growMasterDialog=null,onQueryChange:t=>{this._growMasterDialog&&(this._growMasterDialog.userQuery=t,this.requestUpdate())},onAnalyze:()=>this._handleAskAdvice(),onAnalyzeAll:()=>this._handleAnalyzeAll()})})():""}

      ${an.renderStrainRecommendationDialog(this._strainRecommendationDialog,{onClose:()=>this._strainRecommendationDialog=null,onQueryChange:t=>{this._strainRecommendationDialog&&(this._strainRecommendationDialog.userQuery=t,this.requestUpdate())},onGetRecommendation:()=>this._handleGetStrainRecommendation()})}

      ${an.renderIrrigationDialog(this._irrigationDialog,{onClose:()=>this._irrigationDialog=null,onIrrigationPumpChange:t=>{this._irrigationDialog&&(this._irrigationDialog.irrigation_pump_entity=t,this.requestUpdate())},onIrrigationDurationChange:t=>{this._irrigationDialog&&(this._irrigationDialog.irrigation_duration=t,this.requestUpdate())},onDrainPumpChange:t=>{this._irrigationDialog&&(this._irrigationDialog.drain_pump_entity=t,this.requestUpdate())},onDrainDurationChange:t=>{this._irrigationDialog&&(this._irrigationDialog.drain_duration=t,this.requestUpdate())},onSavePumpSettings:()=>this._saveIrrigationPumpSettings(),onAddIrrigationTime:t=>{const e=t.target.closest(".dialog-body")?.querySelector(".irrigation-time-bar");if(e){const t=e.getBoundingClientRect();this._startAddingIrrigationTime(t.width/2,t.width)}},onStartAddingIrrigationTime:(t,e)=>this._startAddingIrrigationTime(t,e),onRemoveIrrigationTime:t=>this._removeIrrigationTime(t),onAddDrainTime:t=>{const e=t.target.closest(".dialog-body")?.querySelector(".drain-time-bar");if(e){const t=e.getBoundingClientRect();this._startAddingDrainTime(t.width/2,t.width)}},onStartAddingDrainTime:(t,e)=>this._startAddingDrainTime(t,e),onRemoveDrainTime:t=>this._removeDrainTime(t),onCancelAddingIrrigationTime:()=>{this._irrigationDialog&&(this._irrigationDialog.adding_irrigation_time=void 0,this.requestUpdate())},onCancelAddingDrainTime:()=>{this._irrigationDialog&&(this._irrigationDialog.adding_drain_time=void 0,this.requestUpdate())},onConfirmAddIrrigationTime:(t,e)=>{this._addIrrigationTime(t,e)},onConfirmAddDrainTime:(t,e)=>{this._addDrainTime(t,e)},onIrrigationTimeInputChange:(t,e)=>{this._irrigationDialog?.adding_irrigation_time&&("time"===t?this._irrigationDialog.adding_irrigation_time.time=e:this._irrigationDialog.adding_irrigation_time.duration=e,this.requestUpdate())},onDrainTimeInputChange:(t,e)=>{this._irrigationDialog?.adding_drain_time&&("time"===t?this._irrigationDialog.adding_drain_time.time=e:this._irrigationDialog.adding_drain_time.duration=e,this.requestUpdate())}})}
    `}};nn.styles=[tn,o`
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
    `],t([ht(),e("design:type",Object)],nn.prototype,"_addPlantDialog",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_defaultApplied",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_plantOverviewDialog",void 0),t([ht(),e("design:type",Set)],nn.prototype,"_optimisticDeletedPlantIds",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_strainLibraryDialog",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_configDialog",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_growMasterDialog",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_strainRecommendationDialog",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_irrigationDialog",void 0),t([ht(),e("design:type",Object)],nn.prototype,"selectedDevice",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_draggedPlant",void 0),t([ht(),e("design:type",Boolean)],nn.prototype,"_isCompactView",void 0),t([ht(),e("design:type",Array)],nn.prototype,"_strainLibrary",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_historyData",void 0),t([ht(),e("design:type",Set)],nn.prototype,"_activeEnvGraphs",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_graphRanges",void 0),t([ht(),e("design:type",Object)],nn.prototype,"_tooltip",void 0),t([ht(),e("design:type",Boolean)],nn.prototype,"_menuOpen",void 0),t([ht(),e("design:type",Boolean)],nn.prototype,"_isEditMode",void 0),t([ht(),e("design:type",Set)],nn.prototype,"_selectedPlants",void 0),t([ut({attribute:!1}),e("design:type",Object)],nn.prototype,"hass",void 0),t([ut({attribute:!1}),e("design:type",Object)],nn.prototype,"_config",void 0),nn=t([ct("growspace-manager-card")],nn);let sn=class extends ot{constructor(){super(...arguments),this._growspaceOptions=[]}setConfig(t){this._config=t,this._loadGrowspaces()}updated(t){t.has("hass")&&this.hass&&(this._loadGrowspaces(),this._subscribeToSensorUpdates())}disconnectedCallback(){super.disconnectedCallback(),this._unsubStateChanged&&(this._unsubStateChanged(),this._unsubStateChanged=void 0)}_subscribeToSensorUpdates(){this.hass&&!this._unsubStateChanged&&(this._unsubStateChanged=this.hass.connection.subscribeEvents(t=>{const e=t.data.new_state;"sensor.growspaces_list"===e?.entity_id&&(Array.isArray(e.attributes?.growspaces)?this._growspaceOptions=e.attributes.growspaces:this._growspaceOptions=[])},"state_changed"))}_loadGrowspaces(){if(!this.hass)return;const t=this.hass.states["sensor.growspaces_list"];if(t&&t.attributes?.growspaces){const e=t.attributes.growspaces;this._growspaceOptions=Object.values(e)}else this._growspaceOptions=[]}render(){return this._config?j`
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
    `:j``}_valueChanged(t,e){if(!this._config)return;const i={...this._config,[t]:e};this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:i},bubbles:!0,composed:!0}))}};sn.styles=o`
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
  `,t([ut({attribute:!1}),e("design:type",Object)],sn.prototype,"hass",void 0),t([ut({attribute:!1}),e("design:type",Object)],sn.prototype,"_config",void 0),t([ht(),e("design:type",Array)],sn.prototype,"_growspaceOptions",void 0),sn=t([ct("growspace-manager-card-editor")],sn);var on=Object.freeze({__proto__:null,get GrowspaceManagerCardEditor(){return sn}});export{nn as GrowspaceManagerCard};
