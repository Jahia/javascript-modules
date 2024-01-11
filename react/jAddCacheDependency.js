import {useServerContext} from './ServerContext';
import {render} from '@jahia/server-helpers';

export default ({...props}) => {
    const {renderContext} = useServerContext();
    render.addCacheDependencyTag(props, renderContext);
};
