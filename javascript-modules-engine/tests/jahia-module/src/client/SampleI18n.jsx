import React, { useState } from 'react';
import {useTranslation} from "react-i18next";

export const SampleI18n = ({placeholder = ''}) => {
    const { t } = useTranslation();
    const [updatedPlaceholder, setUpdatedPlaceholder] = useState(placeholder);

    return (
        <>
            <h3>Test i18n</h3>
            <div data-testid="i18n-simple">{t('greeting')}</div>
            <div data-testid="i18n-placeholder">{t('test.composed', { placeholder: updatedPlaceholder })}</div>
            <p>
                <span>Edit to update i18n placeholder:</span>
                <input
                    data-testid="i18n-edit-placeholder"
                    type="text"
                    value={updatedPlaceholder}
                    onChange={(event) => {
                        setUpdatedPlaceholder(event.target.value);
                    }}
                />
            </p>
        </>
    );
}

export default SampleI18n;