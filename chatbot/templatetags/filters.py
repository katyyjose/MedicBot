from django import template
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.filter
@stringfilter
def dotInsteadOfComma(value):
    return value.replace(",", ".")

@register.filter
def tabindex(value, index):
    """
    Add a tabindex attribute to the widget for a bound field.
    """
    value.field.widget.attrs['tabindex'] = index
    return value


register.filter('dotInsteadOfComma', dotInsteadOfComma)