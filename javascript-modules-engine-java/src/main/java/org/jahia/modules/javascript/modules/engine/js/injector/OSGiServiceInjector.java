package org.jahia.modules.javascript.modules.engine.js.injector;

import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.reflect.FieldUtils;
import org.apache.commons.lang3.reflect.MethodUtils;
import org.jahia.osgi.BundleUtils;

import javax.inject.Inject;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

public class OSGiServiceInjector {
    public static void handleMethodInjection(Object data) throws IllegalAccessException, InvocationTargetException {
        for (Method method : MethodUtils.getMethodsListWithAnnotation(data.getClass(), Inject.class, true, true)) {
            handleMethodInjection(data, method);
        }

        for (Field field : FieldUtils.getFieldsListWithAnnotation(data.getClass(), Inject.class)) {
            handleFieldInjection(data, field);
        }
    }

    private static void handleMethodInjection(Object data, Method method) throws IllegalAccessException, InvocationTargetException {
        if (method.isAnnotationPresent(OSGiService.class) && method.getParameterTypes().length > 0) {

            OSGiService annotation = method.getAnnotation(OSGiService.class);
            Class<?> klass = annotation.service().equals(Object.class) ? method.getParameterTypes()[0] : annotation.service();
            String filter = StringUtils.isNotEmpty(annotation.filter()) ? annotation.filter() : null;

            if (!method.isAccessible()) {
                method.setAccessible(true);
            }

            method.invoke(data, BundleUtils.getOsgiService(klass, filter));
        }
    }

    private static void handleFieldInjection(Object data, Field field) throws IllegalAccessException {
        if (field.isAnnotationPresent(OSGiService.class)) {

            OSGiService annotation = field.getAnnotation(OSGiService.class);
            Class<?> klass = annotation.service().equals(Object.class) ? field.getType() : annotation.service();
            String filter = StringUtils.isNotEmpty(annotation.filter()) ? annotation.filter() : null;

            if (!field.isAccessible()) {
                field.setAccessible(true);
            }

            field.set(data, BundleUtils.getOsgiService(klass, filter));
        }
    }

}
