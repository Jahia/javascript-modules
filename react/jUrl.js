import {useServerContext} from './ServerContext';
import {buildUrl} from '../urlBuilder';

export default ({...props}) => {
    const {currentResource, renderContext} = useServerContext();
    return buildUrl(props, renderContext, currentResource);
};
