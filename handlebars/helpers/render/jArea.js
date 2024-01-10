import {SafeString} from 'handlebars';
import setResult from '../../setResult';
import renderArea from '../../../utils/renderArea';

export default function (options) {
    return setResult(new SafeString(renderArea(options.hash, options.data.root.renderContext)), this, options);
}
