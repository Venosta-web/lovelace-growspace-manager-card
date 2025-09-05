function t(t,e,i,a){var r,s=arguments.length,n=s<3?e:null===a?a=Object.getOwnPropertyDescriptor(e,i):a;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,a);else for(var o=t.length-1;o>=0;o--)(r=t[o])&&(n=(s<3?r(n):s>3?r(e,i,n):r(e,i))||n);return s>3&&n&&Object.defineProperty(e,i,n),n}function e(t,e){if("object"==typeof Reflect&&"function"==typeof Reflect.metadata)return Reflect.metadata(t,e)}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const i=globalThis,a=i.ShadowRoot&&(void 0===i.ShadyCSS||i.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,r=Symbol(),s=new WeakMap;class n{constructor(t,e,i){if(this._$cssResult$=!0,i!==r)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(a&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=s.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&s.set(e,t))}return t}toString(){return this.cssText}}const o=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,a)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[a+1],t[0]);return new n(i,t,r)},l=a?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new n("string"==typeof t?t:t+"",void 0,r))(e)})(t):t,{is:d,defineProperty:c,getOwnPropertyDescriptor:p,getOwnPropertyNames:h,getOwnPropertySymbols:g,getPrototypeOf:v}=Object,u=globalThis,_=u.trustedTypes,f=_?_.emptyScript:"",m=u.reactiveElementPolyfillSupport,y=(t,e)=>t,b={toAttribute(t,e){switch(e){case Boolean:t=t?f:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},$=(t,e)=>!d(t,e),w={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:$};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),u.litPropertyMetadata??=new WeakMap;class A extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=w){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),a=this.getPropertyDescriptor(t,i,e);void 0!==a&&c(this.prototype,t,a)}}static getPropertyDescriptor(t,e,i){const{get:a,set:r}=p(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:a,set(e){const s=a?.call(this);r?.call(this,e),this.requestUpdate(t,s,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??w}static _$Ei(){if(this.hasOwnProperty(y("elementProperties")))return;const t=v(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(y("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(y("properties"))){const t=this.properties,e=[...h(t),...g(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(l(t))}else void 0!==t&&e.push(l(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,e)=>{if(a)t.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const a of e){const e=document.createElement("style"),r=i.litNonce;void 0!==r&&e.setAttribute("nonce",r),e.textContent=a.cssText,t.appendChild(e)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),a=this.constructor._$Eu(t,i);if(void 0!==a&&!0===i.reflect){const r=(void 0!==i.converter?.toAttribute?i.converter:b).toAttribute(e,i.type);this._$Em=t,null==r?this.removeAttribute(a):this.setAttribute(a,r),this._$Em=null}}_$AK(t,e){const i=this.constructor,a=i._$Eh.get(t);if(void 0!==a&&this._$Em!==a){const t=i.getPropertyOptions(a),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:b;this._$Em=a;const s=r.fromAttribute(e,t.type);this[a]=s??this._$Ej?.get(a)??s,this._$Em=null}}requestUpdate(t,e,i){if(void 0!==t){const a=this.constructor,r=this[t];if(i??=a.getPropertyOptions(t),!((i.hasChanged??$)(r,e)||i.useDefault&&i.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(a._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:a,wrapped:r},s){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,s??e??this[t]),!0!==r||void 0!==s)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===a&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,a=this[e];!0!==t||this._$AL.has(e)||void 0===a||this.C(e,void 0,i,a)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}}A.elementStyles=[],A.shadowRootOptions={mode:"open"},A[y("elementProperties")]=new Map,A[y("finalized")]=new Map,m?.({ReactiveElement:A}),(u.reactiveElementVersions??=[]).push("2.1.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const x=globalThis,C=x.trustedTypes,D=C?C.createPolicy("lit-html",{createHTML:t=>t}):void 0,S="$lit$",P=`lit$${Math.random().toFixed(9).slice(2)}$`,E="?"+P,O=`<${E}>`,L=document,H=()=>L.createComment(""),k=t=>null===t||"object"!=typeof t&&"function"!=typeof t,M=Array.isArray,V="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,R=/-->/g,j=/>/g,N=RegExp(`>|${V}(?:([^\\s"'>=/]+)(${V}*=${V}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),T=/'/g,z=/"/g,B=/^(?:script|style|textarea|title)$/i,I=(t=>(e,...i)=>({_$litType$:t,strings:e,values:i}))(1),F=Symbol.for("lit-noChange"),W=Symbol.for("lit-nothing"),Z=new WeakMap,G=L.createTreeWalker(L,129);function q(t,e){if(!M(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==D?D.createHTML(e):e}const K=(t,e)=>{const i=t.length-1,a=[];let r,s=2===e?"<svg>":3===e?"<math>":"",n=U;for(let e=0;e<i;e++){const i=t[e];let o,l,d=-1,c=0;for(;c<i.length&&(n.lastIndex=c,l=n.exec(i),null!==l);)c=n.lastIndex,n===U?"!--"===l[1]?n=R:void 0!==l[1]?n=j:void 0!==l[2]?(B.test(l[2])&&(r=RegExp("</"+l[2],"g")),n=N):void 0!==l[3]&&(n=N):n===N?">"===l[0]?(n=r??U,d=-1):void 0===l[1]?d=-2:(d=n.lastIndex-l[2].length,o=l[1],n=void 0===l[3]?N:'"'===l[3]?z:T):n===z||n===T?n=N:n===R||n===j?n=U:(n=N,r=void 0);const p=n===N&&t[e+1].startsWith("/>")?" ":"";s+=n===U?i+O:d>=0?(a.push(o),i.slice(0,d)+S+i.slice(d)+P+p):i+P+(-2===d?e:p)}return[q(t,s+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),a]};class Y{constructor({strings:t,_$litType$:e},i){let a;this.parts=[];let r=0,s=0;const n=t.length-1,o=this.parts,[l,d]=K(t,e);if(this.el=Y.createElement(l,i),G.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(a=G.nextNode())&&o.length<n;){if(1===a.nodeType){if(a.hasAttributes())for(const t of a.getAttributeNames())if(t.endsWith(S)){const e=d[s++],i=a.getAttribute(t).split(P),n=/([.?@])?(.*)/.exec(e);o.push({type:1,index:r,name:n[2],strings:i,ctor:"."===n[1]?et:"?"===n[1]?it:"@"===n[1]?at:tt}),a.removeAttribute(t)}else t.startsWith(P)&&(o.push({type:6,index:r}),a.removeAttribute(t));if(B.test(a.tagName)){const t=a.textContent.split(P),e=t.length-1;if(e>0){a.textContent=C?C.emptyScript:"";for(let i=0;i<e;i++)a.append(t[i],H()),G.nextNode(),o.push({type:2,index:++r});a.append(t[e],H())}}}else if(8===a.nodeType)if(a.data===E)o.push({type:2,index:r});else{let t=-1;for(;-1!==(t=a.data.indexOf(P,t+1));)o.push({type:7,index:r}),t+=P.length-1}r++}}static createElement(t,e){const i=L.createElement("template");return i.innerHTML=t,i}}function J(t,e,i=t,a){if(e===F)return e;let r=void 0!==a?i._$Co?.[a]:i._$Cl;const s=k(e)?void 0:e._$litDirective$;return r?.constructor!==s&&(r?._$AO?.(!1),void 0===s?r=void 0:(r=new s(t),r._$AT(t,i,a)),void 0!==a?(i._$Co??=[])[a]=r:i._$Cl=r),void 0!==r&&(e=J(t,r._$AS(t,e.values),r,a)),e}class Q{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,a=(t?.creationScope??L).importNode(e,!0);G.currentNode=a;let r=G.nextNode(),s=0,n=0,o=i[0];for(;void 0!==o;){if(s===o.index){let e;2===o.type?e=new X(r,r.nextSibling,this,t):1===o.type?e=new o.ctor(r,o.name,o.strings,this,t):6===o.type&&(e=new rt(r,this,t)),this._$AV.push(e),o=i[++n]}s!==o?.index&&(r=G.nextNode(),s++)}return G.currentNode=L,a}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class X{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,a){this.type=2,this._$AH=W,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=a,this._$Cv=a?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=J(this,t,e),k(t)?t===W||null==t||""===t?(this._$AH!==W&&this._$AR(),this._$AH=W):t!==this._$AH&&t!==F&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>M(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==W&&k(this._$AH)?this._$AA.nextSibling.data=t:this.T(L.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,a="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=Y.createElement(q(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===a)this._$AH.p(e);else{const t=new Q(a,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=Z.get(t.strings);return void 0===e&&Z.set(t.strings,e=new Y(t)),e}k(t){M(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,a=0;for(const r of t)a===e.length?e.push(i=new X(this.O(H()),this.O(H()),this,this.options)):i=e[a],i._$AI(r),a++;a<e.length&&(this._$AR(i&&i._$AB.nextSibling,a),e.length=a)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=t.nextSibling;t.remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class tt{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,a,r){this.type=1,this._$AH=W,this._$AN=void 0,this.element=t,this.name=e,this._$AM=a,this.options=r,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=W}_$AI(t,e=this,i,a){const r=this.strings;let s=!1;if(void 0===r)t=J(this,t,e,0),s=!k(t)||t!==this._$AH&&t!==F,s&&(this._$AH=t);else{const a=t;let n,o;for(t=r[0],n=0;n<r.length-1;n++)o=J(this,a[i+n],e,n),o===F&&(o=this._$AH[n]),s||=!k(o)||o!==this._$AH[n],o===W?t=W:t!==W&&(t+=(o??"")+r[n+1]),this._$AH[n]=o}s&&!a&&this.j(t)}j(t){t===W?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class et extends tt{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===W?void 0:t}}class it extends tt{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==W)}}class at extends tt{constructor(t,e,i,a,r){super(t,e,i,a,r),this.type=5}_$AI(t,e=this){if((t=J(this,t,e,0)??W)===F)return;const i=this._$AH,a=t===W&&i!==W||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,r=t!==W&&(i===W||a);a&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class rt{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){J(this,t)}}const st=x.litHtmlPolyfillSupport;st?.(Y,X),(x.litHtmlVersions??=[]).push("3.3.1");const nt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ot extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const a=i?.renderBefore??e;let r=a._$litPart$;if(void 0===r){const t=i?.renderBefore??null;a._$litPart$=r=new X(e.insertBefore(H(),t),t,void 0,i??{})}return r._$AI(t),r})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return F}}ot._$litElement$=!0,ot.finalized=!0,nt.litElementHydrateSupport?.({LitElement:ot});const lt=nt.litElementPolyfillSupport;lt?.({LitElement:ot}),(nt.litElementVersions??=[]).push("4.2.1");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const dt={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:$},ct=(t=dt,e,i)=>{const{kind:a,metadata:r}=i;let s=globalThis.litPropertyMetadata.get(r);if(void 0===s&&globalThis.litPropertyMetadata.set(r,s=new Map),"setter"===a&&((t=Object.create(t)).wrapped=!0),s.set(i.name,t),"accessor"===a){const{name:a}=i;return{set(i){const r=e.get.call(this);e.set.call(this,i),this.requestUpdate(a,r,t)},init(e){return void 0!==e&&this.C(a,void 0,t,e),e}}}if("setter"===a){const{name:a}=i;return function(i){const r=this[a];e.call(this,i),this.requestUpdate(a,r,t)}}throw Error("Unsupported decorator location: "+a)};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function pt(t){return(e,i)=>"object"==typeof i?ct(t,e,i):((t,e,i)=>{const a=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),a?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ht(t){return pt({...t,state:!0,attribute:!1})}var gt="M4,2H6V4C6,5.44 6.68,6.61 7.88,7.78C8.74,8.61 9.89,9.41 11.09,10.2L9.26,11.39C8.27,10.72 7.31,10 6.5,9.21C5.07,7.82 4,6.1 4,4V2M18,2H20V4C20,6.1 18.93,7.82 17.5,9.21C16.09,10.59 14.29,11.73 12.54,12.84C10.79,13.96 9.09,15.05 7.88,16.22C6.68,17.39 6,18.56 6,20V22H4V20C4,17.9 5.07,16.18 6.5,14.79C7.91,13.41 9.71,12.27 11.46,11.16C13.21,10.04 14.91,8.95 16.12,7.78C17.32,6.61 18,5.44 18,4V2M14.74,12.61C15.73,13.28 16.69,14 17.5,14.79C18.93,16.18 20,17.9 20,20V22H18V20C18,18.56 17.32,17.39 16.12,16.22C15.26,15.39 14.11,14.59 12.91,13.8L14.74,12.61M7,3H17V4L16.94,4.5H7.06L7,4V3M7.68,6H16.32C16.08,6.34 15.8,6.69 15.42,7.06L14.91,7.5H9.07L8.58,7.06C8.2,6.69 7.92,6.34 7.68,6M9.09,16.5H14.93L15.42,16.94C15.8,17.31 16.08,17.66 16.32,18H7.68C7.92,17.66 8.2,17.31 8.58,16.94L9.09,16.5M7.06,19.5H16.94L17,20V21H7V20L7.06,19.5Z",vt="M3,13A9,9 0 0,0 12,22C12,17 7.97,13 3,13M12,5.5A2.5,2.5 0 0,1 14.5,8A2.5,2.5 0 0,1 12,10.5A2.5,2.5 0 0,1 9.5,8A2.5,2.5 0 0,1 12,5.5M5.6,10.25A2.5,2.5 0 0,0 8.1,12.75C8.63,12.75 9.12,12.58 9.5,12.31C9.5,12.37 9.5,12.43 9.5,12.5A2.5,2.5 0 0,0 12,15A2.5,2.5 0 0,0 14.5,12.5C14.5,12.43 14.5,12.37 14.5,12.31C14.88,12.58 15.37,12.75 15.9,12.75C17.28,12.75 18.4,11.63 18.4,10.25C18.4,9.25 17.81,8.4 16.97,8C17.81,7.6 18.4,6.74 18.4,5.75C18.4,4.37 17.28,3.25 15.9,3.25C15.37,3.25 14.88,3.41 14.5,3.69C14.5,3.63 14.5,3.56 14.5,3.5A2.5,2.5 0 0,0 12,1A2.5,2.5 0 0,0 9.5,3.5C9.5,3.56 9.5,3.63 9.5,3.69C9.12,3.41 8.63,3.25 8.1,3.25A2.5,2.5 0 0,0 5.6,5.75C5.6,6.74 6.19,7.6 7.03,8C6.19,8.4 5.6,9.25 5.6,10.25M12,22A9,9 0 0,0 21,13C16,13 12,17 12,22Z",ut="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",_t="M2,22V20C2,20 7,18 12,18C17,18 22,20 22,20V22H2M11.3,9.1C10.1,5.2 4,6.1 4,6.1C4,6.1 4.2,13.9 9.9,12.7C9.5,9.8 8,9 8,9C10.8,9 11,12.4 11,12.4V17C11.3,17 11.7,17 12,17C12.3,17 12.7,17 13,17V12.8C13,12.8 13,8.9 16,7.9C16,7.9 14,10.9 14,12.9C21,13.6 21,4 21,4C21,4 12.1,3 11.3,9.1Z";let ft=class extends ot{constructor(){super(...arguments),this._addPlantDialog=null,this._defaultApplied=!1,this._plantOverviewDialog=null,this._strainLibraryDialog=null,this.selectedDevice=null,this._draggedPlant=null,this._isCompactView=!1}get _strainLibrary(){const t=Object.values(this.hass.states).find(t=>t.entity_id.endsWith("_strain_library"));return t?.attributes?.strains||[]}_getPlantStageColor(t){switch(t.toLowerCase()){case"seedling":return"#4CAF50";case"vegetative":return"#8BC34A";case"flower":return"#FF9800";case"dry":return"#795548";case"cure":return"#9C27B0";default:return"#757575"}}_getPlantStageIcon(t){switch(t.toLowerCase()){case"seedling":case"vegetative":default:return _t;case"flower":case"dry":return vt;case"cure":return"M11.5,22V17.35C11,18.13 10,19.09 8.03,19.81C8.03,19.81 8.53,18.1 9.94,16.95C8.64,17.23 6.68,17.19 4,16C4,16 6.47,14.59 9.28,14.97C7.69,14 5.7,12.08 4.17,8.11C4.17,8.11 8.67,9.34 10.91,13.14C8.88,8.24 12,2 12,2C14.43,7.47 13.91,11.1 13.12,13.1C15.37,9.33 19.83,8.11 19.83,8.11C18.3,12.08 16.31,14 14.72,14.97C17.53,14.59 20,16 20,16C17.32,17.19 15.36,17.23 14.06,16.95C15.47,18.1 15.97,19.81 15.97,19.81C14,19.09 13,18.13 12.5,17.35V22H11.5Z"}}async _harvestPlant(){if(!this._plantOverviewDialog)return;const t=this._plantOverviewDialog.plant;if("flower"===t.state.toLowerCase())try{await this.hass.callService("growspace_manager","harvest_plant",{plant_id:t.attributes?.plant_id||t.entity_id.replace("sensor.",""),target_growspace_name:"dry"}),this._plantOverviewDialog=null}catch(t){console.error("Error harvesting plant:",t)}else alert("Only flowering plants can be harvested.")}async _finishDryingPlant(){if(!this._plantOverviewDialog)return;const t=this._plantOverviewDialog.plant;if("dry"===t.state.toLowerCase())try{await this.hass.callService("growspace_manager","harvest_plant",{plant_id:t.attributes?.plant_id||t.entity_id.replace("sensor.",""),target_growspace_name:"cure"}),this._plantOverviewDialog=null}catch(t){console.error("Error finishing drying plant:",t)}else alert("Only harvested plants can be finished drying.")}_openStrainLibraryDialog(){const t=this._strainLibrary||[];this._strainLibraryDialog={open:!0,newStrain:"",strains:t}}async _addStrain(){this._strainLibraryDialog?.newStrain&&(this._strainLibraryDialog.strains.push(this._strainLibraryDialog.newStrain),await this.hass.callService("growspace_manager","import_strain_library",{strains:this._strainLibraryDialog.strains,replace:!0}),this._strainLibraryDialog.newStrain="")}async _removeStrain(t){this._strainLibraryDialog&&(this._strainLibraryDialog.strains=this._strainLibraryDialog.strains.filter(e=>e!==t),await this.hass.callService("growspace_manager","import_strain_library",{strains:this._strainLibraryDialog.strains,replace:!0}))}async _handleDeletePlant(t){if(confirm("Are you sure you want to delete this plant?"))try{await this.hass.callService("growspace_manager","remove_plant",{plant_id:t})}catch(t){console.error("Error deleting plant:",t)}}async _clearStrains(){await this.hass.callService("growspace_manager","clear_strain_library",{})}static async getConfigElement(){return document.createElement("div")}static getStubConfig(){return{type:"custom:growspace-manager-card",title:"Growspace Manager"}}setConfig(t){if(!t)throw new Error("Invalid configuration");this._config=t}getCardSize(){return 4}static get styles(){return o`
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
        margin-top: inherti;
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
        width: 20px;
        height: 20px;
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
        max-height: 300px;
        overflow-y: auto;
        margin-top: var(--spacing-md);
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
    `}_getGrowspaceDevices(){if(!this.hass)return[];const t=Object.values(this.hass.states),e=t.filter(t=>t.entity_id.endsWith("_overview")),i=new Map;t.forEach(t=>{if(void 0!==t.attributes?.row&&void 0!==t.attributes?.col){const a=t.attributes?.growspace_id||e.find(e=>e.entity_id.startsWith(t.entity_id.split("_")[0]))?.attributes?.growspace_id||"unknown";i.has(a)||i.set(a,[]),i.get(a).push(t)}});const a=[];return i.forEach((t,i)=>{const r=e.find(t=>t.attributes?.growspace_id===i);a.push({device_id:i,name:r?.attributes?.friendly_name||`Growspace ${i}`,plants:t,rows:r?.attributes?.rows??3,plants_per_row:r?.attributes?.plants_per_row??3})}),a}_createGridLayout(t,e,i){const a=Array.from({length:e},()=>Array.from({length:i},()=>null));return t.forEach(t=>{const r=(t.attributes?.row??1)-1,s=(t.attributes?.col??1)-1;r>=0&&r<e&&s>=0&&s<i&&(a[r][s]=t)}),{rows:e,cols:i,grid:a}}_handleDeviceChange(t){const e=t.target;this.selectedDevice=e.value}_handlePlantClick(t){this._plantOverviewDialog={open:!0,plant:t,editedAttributes:{...t.attributes}}}_openAddPlantDialog(t,e){const i=(new Date).toISOString().slice(0,16),a=this._strainLibrary?.[0]||"";this._addPlantDialog={open:!0,row:t,col:e,strain:a,phenotype:"",veg_start:i,flower_start:i}}_confirmAddPlant(){if(!this._addPlantDialog||!this.selectedDevice)return;if(!this._addPlantDialog.strain)return void alert("Please enter a strain!");const t=this._addPlantDialog.veg_start||(new Date).toISOString().slice(0,16),e=this._addPlantDialog.flower_start||(new Date).toISOString().slice(0,16);this.hass.callService("growspace_manager","add_plant",{growspace_id:this.selectedDevice,row:this._addPlantDialog.row+1,col:this._addPlantDialog.col+1,strain:this._addPlantDialog.strain,phenotype:this._addPlantDialog.phenotype,veg_start:t,flower_start:e}).then(()=>{this._addPlantDialog=null}).catch(t=>console.error("Error calling growspace_manager.add_plant",t))}async _updatePlant(){if(!this._plantOverviewDialog)return;const t=this._plantOverviewDialog.editedAttributes,e={plant_id:this._plantOverviewDialog.plant.attributes?.plant_id||this._plantOverviewDialog.plant.entity_id.replace("sensor.","")};["strain","phenotype","row","col","veg_start","flower_start"].forEach(i=>{void 0!==t[i]&&null!==t[i]&&(e[i]=t[i])});try{await this.hass.callService("growspace_manager","update_plant",e),this._plantOverviewDialog=null}catch(t){console.error("Error updating plant:",t)}}_handleDragStart(t,e){this._draggedPlant=e,t.dataTransfer?.setData("text/plain",JSON.stringify({id:e.entity_id}));t.target.classList.add("dragging")}_handleDragEnd(t){t.target.classList.remove("dragging")}_handleDragOver(t){t.preventDefault()}_handleDrop(t,e,i,a){if(t.preventDefault(),!this._draggedPlant)return;const r=this._draggedPlant;this._draggedPlant=null,a?(this._movePlant(r,e,i),this._movePlant(a,r.attributes.row,r.attributes.col)):this._movePlant(r,e,i)}async _movePlant(t,e,i){try{const a=t.attributes?.plant_id||t.entity_id.replace("sensor.","");await this.hass.callService("growspace_manager","update_plant",{plant_id:a,row:e,col:i})}catch(t){console.error("Error moving plant:",t)}}firstUpdated(){const t=this._getGrowspaceDevices();if(!this.selectedDevice&&t.length){let e;this._config?.default_growspace&&(e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace)),this.selectedDevice=e?.device_id||t[0].device_id}}render(){if(!this.hass)return I`<ha-card><div class="error">Home Assistant not available</div></ha-card>`;const t=this._getGrowspaceDevices();if(!t.length)return I`<ha-card><div class="no-data">No growspace devices found.</div></ha-card>`;if(!this._defaultApplied&&this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);e&&(this.selectedDevice=e.device_id),this._defaultApplied=!0}if(!this.selectedDevice||!t.find(t=>t.device_id===this.selectedDevice))if(this._config?.default_growspace){const e=t.find(t=>t.device_id===this._config.default_growspace||t.name===this._config.default_growspace);e&&(this.selectedDevice=e.device_id)}else this.selectedDevice=t[0].device_id;const e=t.find(t=>t.device_id===this.selectedDevice),{rows:i,cols:a,grid:r}=this._createGridLayout(e.plants,e.rows,e.plants_per_row);return I`
      <ha-card>
        <div class="header">
          ${this._config?.title?I`<h2 class="header-title">${this._config.title}</h2>`:""}
          
          <div class="selector-container">
            ${this._config?.default_growspace?I`<span class="selected-growspace"> ${t.find(t=>t.device_id===this.selectedDevice)?.name}</span>`:I`
              <label for="device-select">Growspace:</label>
              <select 
                id="device-select" 
                class="growspace-select"
                .value=${this.selectedDevice} 
                @change=${this._handleDeviceChange}
              >
                ${t.map(t=>I`<option value="${t.device_id}">${t.name}</option>`)}
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
                <path d="${gt}"></path>
              </svg>
              Strains
            </button>
          </div>
        </div>

        <div class="grid ${this._isCompactView?"compact":""}" 
             style="grid-template-columns: repeat(${a}, 1fr); grid-template-rows: repeat(${i}, 1fr);">
          ${r.flat().map((t,e)=>{const i=Math.floor(e/a)+1,r=e%a+1;if(!t)return I`
                <div 
                  class="plant empty" 
                  style="grid-row: ${i}; grid-column: ${r}" 
                  @click=${()=>this._openAddPlantDialog(i-1,r-1)}
                  @dragover=${this._handleDragOver}
                  @drop=${t=>this._handleDrop(t,i,r,null)}
                >
                  <div class="plant-header">
                    <svg class="plant-icon" viewBox="0 0 24 24">
                      <path d="${ut}"></path>
                    </svg>
                  </div>
                  <div class="plant-name">Add Plant</div>
                  <div class="plant-stage">Empty Slot</div>
                </div>
              `;const s=this._getPlantStageColor(t.state),n=this._getPlantStageIcon(t.state);return I`
              <div 
                class="plant" 
                style="grid-row: ${i}; grid-column: ${r}; --stage-color: ${s}" 
                draggable="true"
                @dragstart=${e=>this._handleDragStart(e,t)}
                @dragend=${this._handleDragEnd}
                @dragover=${this._handleDragOver}
                @drop=${e=>this._handleDrop(e,i,r,t)}
                @click=${()=>this._handlePlantClick(t)}
              >
                <div class="plant-header">
                  <svg class="plant-icon" viewBox="0 0 24 24">
                    <path d="${n}"></path>
                  </svg>
                  <svg style="width:12px;height:12px;fill:var(--secondary-text-color);opacity:0.5;" viewBox="0 0 24 24">
                    <path d="${"M21 11H3V9H21V11M21 13H3V15H21V13Z"}"></path>
                  </svg>
                </div>
                <div class="plant-name">${t.attributes?.strain||"Unknown"}</div>
                ${t.attributes?.phenotype?I`<div class="plant-phenotype">${t.attributes.phenotype}</div>`:""}
                <div class="plant-stage">${t.state}</div>
                
                ${this._isCompactView?"":I`
                  <div class="plant-days">
                    ${t.attributes?.veg_days?I`
                      <span title="Days in Vegetative">
                        <svg style="width:10px;height:10px;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${_t}"></path>
                        </svg>
                        ${t.attributes.veg_days}d
                      </span>
                    `:""}
                    ${t.attributes?.flower_days?I`
                      <span title="Days in Flower">
                        <svg style="width:10px;height:10px;fill:currentColor;" viewBox="0 0 24 24">
                          <path d="${vt}"></path>
                        </svg>
                        ${t.attributes.flower_days}d
                      </span>
                    `:""}
                  </div>
                `}
              </div>
            `})}
        </div>

        

        
      </ha-card>
      <!-- Enhanced Add Plant Dialog -->
        ${this._addPlantDialog?.open?I`
          <ha-dialog
            open
            @closed=${()=>this._addPlantDialog=null}
            heading="🌱 Add New Plant"
            .scrimClickAction=${""}
            .escapeKeyAction=${""}
          >
            <div class="dialog-content">
              <div class="form-group">
                <label>
                  <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                    <path d="${gt}"></path>
                  </svg>
                  Strain *
                </label>
                <select 
                  class="form-input"
                  .value=${this._addPlantDialog.strain} 
                  @change=${t=>{const e=t.target;this._addPlantDialog&&(this._addPlantDialog.strain=e.value)}}
                >
                  <option value="">Select a strain...</option>
                  ${this._strainLibrary.map(t=>I`
                    <option value="${t}" ?selected=${this._addPlantDialog?.strain===t}>${t}</option>
                  `)}
                </select>
              </div>

              <div class="form-group">
                <label>Phenotype</label>
                <input 
                  type="text" 
                  class="form-input"
                  placeholder="e.g., Pheno #1, Purple variant..."
                  .value=${this._addPlantDialog.phenotype||""} 
                  @input=${t=>{const e=t.target;this._addPlantDialog&&(this._addPlantDialog.phenotype=e.value)}} 
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div class="form-group">
                  <label>
                    <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                      <path d="${"M15,13H16.5V15.82L18.94,17.23L18.19,18.53L15,16.69V13M19,8H5V19H9.67C9.24,18.09 9,17.07 9,16A7,7 0 0,1 16,9C17.07,9 18.09,9.24 19,9.67V8M5,21C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H6V1H8V3H16V1H18V3H19A2,2 0 0,1 21,5V11.1C22.24,12.36 23,14.09 23,16A7,7 0 0,1 16,23C14.09,23 12.36,22.24 11.1,21H5M16,11.15A4.85,4.85 0 0,0 11.15,16C11.15,18.68 13.32,20.85 16,20.85A4.85,4.85 0 0,0 20.85,16C20.85,13.32 18.68,11.15 16,11.15Z"}"></path>
                    </svg>
                    Vegetative Start
                  </label>
                  <input 
                    type="datetime-local" 
                    class="form-input"
                    .value=${this._addPlantDialog.veg_start||""} 
                    @input=${t=>{const e=t.target;this._addPlantDialog&&(this._addPlantDialog.veg_start=e.value)}} 
                  />
                </div>

                <div class="form-group">
                  <label>
                    <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                      <path d="${vt}"></path>
                    </svg>
                    Flower Start
                  </label>
                  <input 
                    type="datetime-local" 
                    class="form-input"
                    .value=${this._addPlantDialog.flower_start||""} 
                    @input=${t=>{const e=t.target;this._addPlantDialog&&(this._addPlantDialog.flower_start=e.value)}} 
                  />
                </div>
                <div class="form-group">
                  <label>
                    <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                      <path d="${vt}"></path>
                    </svg>
                    Dry Start
                  </label>
                  <input 
                    type="datetime-local" 
                    class="form-input"
                    .value=${this._addPlantDialog.dry_start||""} 
                    @input=${t=>{const e=t.target;this._addPlantDialog&&(this._addPlantDialog.dry_start=e.value)}} 
                  />
                </div>
                <div class="form-group">
                  <label>
                    <svg style="width:16px;height:16px;fill:currentColor;margin-right:4px;" viewBox="0 0 24 24">
                      <path d="${vt}"></path>
                    </svg>
                    Cure Start
                  </label>
                  <input 
                    type="datetime-local" 
                    class="form-input"
                    .value=${this._addPlantDialog.cure_start||""} 
                    @input=${t=>{const e=t.target;this._addPlantDialog&&(this._addPlantDialog.cure_start=e.value)}} 
                  />
                </div>
              </div>

              <div style="background: rgba(var(--rgb-primary-color), 0.05); padding: var(--spacing-md); border-radius: var(--border-radius); border-left: 4px solid var(--primary-color);">
                <strong>Position:</strong> Row ${this._addPlantDialog.row+1}, Column ${this._addPlantDialog.col+1}
              </div>
            </div>

            <button class="action-button primary" slot="primaryAction" @click=${this._confirmAddPlant}>
              <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="${_t}"></path>
              </svg>
              Add Plant
            </button>
            <button class="action-button" slot="secondaryAction" @click=${()=>this._addPlantDialog=null}>
              Cancel
            </button>
          </ha-dialog>
        `:""}

        <!-- Enhanced Plant Overview Dialog -->
        ${this._plantOverviewDialog?.open?I`
          <ha-dialog
            open
            @closed=${()=>this._plantOverviewDialog=null}
            heading=" ${this._plantOverviewDialog.editedAttributes.strain||"Plant"} Details"
            .scrimClickAction=${""}
            .escapeKeyAction=${""}
          >
            <div class="dialog-content">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div class="form-group">
                  <label>Strain</label>
                  <input 
                    type="text" 
                    class="form-input"
                    .value=${this._plantOverviewDialog.editedAttributes.strain||""} 
                    @input=${t=>{const e=t.target;this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes.strain=e.value)}}
                  />
                </div>

                <div class="form-group">
                  <label>Phenotype</label>
                  <input 
                    type="text" 
                    class="form-input"
                    .value=${this._plantOverviewDialog.editedAttributes.phenotype||""} 
                    @input=${t=>{const e=t.target;this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes.phenotype=e.value)}}
                  />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div class="form-group">
                  <label>Row</label>
                  <input 
                    type="number" 
                    class="form-input"
                    min="1"
                    .value=${this._plantOverviewDialog.editedAttributes.row||1} 
                    @input=${t=>{const e=t.target;this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes.row=parseInt(e.value))}}
                  />
                </div>

                <div class="form-group">
                  <label>Column</label>
                  <input 
                    type="number" 
                    class="form-input"
                    min="1"
                    .value=${this._plantOverviewDialog.editedAttributes.col||1} 
                    @input=${t=>{const e=t.target;this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes.col=parseInt(e.value))}}
                  />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div class="form-group">
                  <label>Vegetative Start</label>
                  <input 
                    type="datetime-local" 
                    class="form-input"
                    .value=${this._plantOverviewDialog.editedAttributes.veg_start||""} 
                    @input=${t=>{const e=t.target;this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes.veg_start=e.value)}}
                  />
                </div>

                <div class="form-group">
                  <label>Flower Start</label>
                  <input 
                    type="datetime-local" 
                    class="form-input"
                    .value=${this._plantOverviewDialog.editedAttributes.flower_start||""} 
                    @input=${t=>{const e=t.target;this._plantOverviewDialog&&(this._plantOverviewDialog.editedAttributes.flower_start=e.value)}}
                  />
                </div>
              </div>

              ${this._plantOverviewDialog.plant.attributes?.veg_days||this._plantOverviewDialog.plant.attributes?.flower_days?I`
                <div style="background: rgba(var(--rgb-info-color, 33, 150, 243), 0.05); padding: var(--spacing-md); border-radius: var(--border-radius); border-left: 4px solid var(--info-color, #2196F3);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>Current Stage:</strong> ${this._plantOverviewDialog.plant.state}</span>
                    <div style="display: flex; gap: var(--spacing-md);">
                      ${this._plantOverviewDialog.plant.attributes?.veg_days?I`
                        <span>🌱 ${this._plantOverviewDialog.plant.attributes.veg_days} days veg</span>
                      `:""}
                      ${this._plantOverviewDialog.plant.attributes?.flower_days?I`
                        <span>🌸 ${this._plantOverviewDialog.plant.attributes.flower_days} days flower</span>
                      `:""}
                    </div>
                  </div>
                </div>
              `:""}
            </div>

            <button class="action-button primary" slot="primaryAction" @click=${this._updatePlant}>
              <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"></path>
              </svg>
              Update Plant
            </button>
            <button class="action-button" slot="secondaryAction" @click=${()=>this._handleDeletePlant(this._plantOverviewDialog.plant.attributes?.plant_id)}>
              Remove Plant
            </button>
            <button class="action-button" slot="secondaryAction" @click=${()=>this._plantOverviewDialog=null}>
              Cancel
            </button>
            ${"flower"===this._plantOverviewDialog.plant.state.toLowerCase()?I`            
              <button class="action-button primary" @click=${this._harvestPlant}>
                Harvest
              </button>
            `:""}

            ${"dry"===this._plantOverviewDialog.plant.state.toLowerCase()?I`
              <button class="action-button primary" @click=${this._finishDryingPlant}>
                Finish Drying
              </button>
            `:""}
          </ha-dialog>
        `:""}
      <!-- Enhanced Strain Library Dialog -->
        ${this._strainLibraryDialog?.open?I`
          <ha-dialog 
            open 
            heading="Strain Library Management" 
            @closed=${()=>this._strainLibraryDialog=null}
            .scrimClickAction=${""}
            .escapeKeyAction=${"close"}
          >
            <div class="dialog-content">
              <div class="strain-library-header">
                <div class="strain-input-group">
                  <input 
                    type="text" 
                    class="form-input"
                    placeholder="Enter new strain name..."
                    .value=${this._strainLibraryDialog.newStrain}
                    @input=${t=>{const e=t.target;this._strainLibraryDialog&&(this._strainLibraryDialog.newStrain=e.value)}}
                    @keydown=${t=>{"Enter"===t.key&&this._addStrain()}}
                  />
                  <button class="action-button primary" @click=${this._addStrain}>
                    <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                      <path d="${ut}"></path>
                    </svg>
                    Add
                  </button>
                </div>
              </div>

              ${this._strainLibraryDialog.strains.length>0?I`
                <div class="strain-list">
                  ${this._strainLibraryDialog.strains.map(t=>I`
                    <div class="strain-item">
                      <span class="strain-name">${t}</span>
                      <button 
                        class="remove-button"
                        title="Remove ${t}"
                        @click=${()=>this._removeStrain(t)}
                      >
                        <svg class="remove-icon" viewBox="0 0 24 24">
                          <path d="${"M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"}"></path>
                        </svg>
                      </button>
                    </div>
                  `)}
                </div>
              `:I`
                <div class="no-data">
                  No strains in library. Add some strains to get started!
                </div>
              `}
            </div>

            <button class="action-button danger" slot="secondaryAction" @click=${this._clearStrains}>
              Clear All
            </button>
            <button class="action-button" slot="primaryAction" @click=${()=>this._strainLibraryDialog=null}>
              Done
            </button>
          </ha-dialog>
        `:""}
    `}};t([ht(),e("design:type",Object)],ft.prototype,"_addPlantDialog",void 0),t([ht(),e("design:type",Object)],ft.prototype,"_defaultApplied",void 0),t([ht(),e("design:type",Object)],ft.prototype,"_plantOverviewDialog",void 0),t([ht(),e("design:type",Object)],ft.prototype,"_strainLibraryDialog",void 0),t([ht(),e("design:type",Object)],ft.prototype,"selectedDevice",void 0),t([ht(),e("design:type",Object)],ft.prototype,"_draggedPlant",void 0),t([ht(),e("design:type",Boolean)],ft.prototype,"_isCompactView",void 0),t([pt({attribute:!1}),e("design:type",Object)],ft.prototype,"hass",void 0),t([pt({attribute:!1}),e("design:type",Object)],ft.prototype,"_config",void 0),ft=t([(t=>(e,i)=>{void 0!==i?i.addInitializer(()=>{customElements.define(t,e)}):customElements.define(t,e)})("growspace-manager-card")],ft);export{ft as GrowspaceManagerCard};
//# sourceMappingURL=growspace-manager-card.js.map
