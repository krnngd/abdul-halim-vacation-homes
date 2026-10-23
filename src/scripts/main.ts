import { initMotion } from './motion';
import { initNav } from './nav';

function reportFailure(feature: string) {
  return (error: unknown): void => {
    console.error(`[site] ${feature} failed to initialise`, error);
  };
}

initMotion();
initNav();

if (document.querySelector('[data-portfolio]')) {
  import('./portfolio').then(({ initPortfolio }) => initPortfolio()).catch(reportFailure('portfolio'));
}

if (document.querySelector('[data-enquiry-form]')) {
  import('./form').then(({ initEnquiryForm }) => initEnquiryForm()).catch(reportFailure('enquiry form'));
}

if (document.querySelector('[data-map]')) {
  import('./maps').then(({ initMaps }) => initMaps()).catch(reportFailure('maps'));
}
