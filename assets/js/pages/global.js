import PageManager from './pageManager';
import navigation from '../components/navigation';
import skipLink from '../components/skipLinkFocus';

export default class Global extends PageManager {
    onReady() {
        navigation();
        skipLink();
        console.log('HELLO PAL, sup matey sup');
    }
}
