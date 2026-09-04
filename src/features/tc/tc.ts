/**
 * The lazy `growspace-tc` chunk (TC ADR-0003).
 *
 * This file's name is the chunk's name: rollup emits dynamic chunks as
 * `growspace-[name]-[hash].js`, so everything the TC surface needs is reached
 * through here and nothing here is imported statically from the entry bundle.
 * A dashboard without Growspace Manager TC installed never fetches it.
 */

import './containers/growspace-tc-view.container';

export { GrowspaceTcView } from './containers/growspace-tc-view.container';
