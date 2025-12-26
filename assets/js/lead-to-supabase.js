/**
 * Lead to Supabase - Обработка форм заявок
 * Отправляет данные форм в Supabase таблицу consultation_requests
 */

// ============================================
// КОНФИГУРАЦИЯ - ЗАМЕНИТЕ НА ВАШИ ДАННЫЕ
// ============================================
const SUPABASE_URL = "https://qdvlohkigrgqsekogfff.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8yDaxvxmETcv5vR88I53Zw_tswrX_wp";

// ============================================
// ИНИЦИАЛИЗАЦИЯ SUPABASE CLIENT
// ============================================
let supabase = null;

async function initSupabase() {
    if (!SUPABASE_URL || SUPABASE_URL === "PASTE_YOUR_URL" || 
        !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === "PASTE_YOUR_ANON_KEY") {
        console.warn("Lead to Supabase: Не настроены SUPABASE_URL и SUPABASE_ANON_KEY");
        return false;
    }

    try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    } catch (error) {
        console.error("Lead to Supabase: Ошибка инициализации", error);
        return false;
    }
}

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Определяет язык страницы по имени файла
 */
function getPageLang() {
    const pathname = window.location.pathname;
    if (pathname.includes('index-ru.html') || pathname.includes('documents-ru.html') || pathname.includes('auth-ru.html')) {
        return 'ru';
    }
    if (pathname.includes('index-en.html') || pathname.includes('documents-en.html') || pathname.includes('auth-en.html')) {
        return 'en';
    }
    return 'ro'; // По умолчанию румынский
}

/**
 * Получает UTM параметры из URL
 */
function getUtmParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        utm_source: urlParams.get('utm_source') || null,
        utm_medium: urlParams.get('utm_medium') || null,
        utm_campaign: urlParams.get('utm_campaign') || null
    };
}

/**
 * Валидация имени (минимум 2 символа)
 */
function validateName(name) {
    return name && name.trim().length >= 2;
}

/**
 * Валидация email (базовая проверка regex)
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return email && emailRegex.test(email.trim());
}

/**
 * Валидация телефона (разрешены +, цифры, пробелы, -, длина 8-16 по цифрам)
 */
function validatePhone(phone) {
    if (!phone) return false;
    const cleaned = phone.replace(/[^\d]/g, ''); // Убираем все кроме цифр
    return cleaned.length >= 8 && cleaned.length <= 16;
}

/**
 * Валидация типа бизнеса (не пусто)
 */
function validateBusinessType(businessType) {
    return businessType && businessType.trim().length > 0;
}

/**
 * Получает значение из поля формы по name атрибуту
 */
function getFormFieldValue(form, fieldName) {
    const field = form.querySelector(`[name="${fieldName}"]`);
    if (!field) return null;
    
    // Для select с nice-select библиотекой
    if (field.tagName === 'SELECT') {
        // Сначала проверяем скрытый select
        if (field.value && field.value.trim()) {
            return field.value.trim();
        }
        
        // Если select скрыт, ищем nice-select рядом
        const niceSelect = field.nextElementSibling?.classList.contains('nice-select') 
            ? field.nextElementSibling 
            : form.querySelector('.nice-select');
            
        if (niceSelect) {
            const current = niceSelect.querySelector('.current');
            if (current && current.textContent) {
                const text = current.textContent.trim();
                // Проверяем, что это не placeholder
                if (text && !text.includes('-- Select') && !text.includes('-- Выберите') && !text.includes('Tipul de business') && !text.includes('Business Type') && !text.includes('Тип бизнеса')) {
                    // Находим соответствующее значение в select
                    const options = Array.from(field.options);
                    const matchingOption = options.find(opt => opt.textContent.trim() === text);
                    if (matchingOption) {
                        return matchingOption.value || matchingOption.textContent.trim();
                    }
                    return text;
                }
            }
        }
        
        // Fallback на обычный select
        if (field.value) {
            return field.value.trim();
        }
    }
    
    return field.value ? field.value.trim() : null;
}

/**
 * Показывает сообщение об успехе
 */
function showSuccessMessage(pageLang) {
    const messages = {
        'ru': 'Спасибо! Ваша заявка отправлена. Мы свяжемся с вами в ближайшее время.',
        'en': 'Thank you! Your request has been sent. We will contact you soon.',
        'ro': 'Mulțumim! Cererea dvs. a fost trimisă. Vă vom contacta în curând.'
    };
    
    const message = messages[pageLang] || messages['ro'];
    
    // Создаем toast уведомление
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 255, 0, 0.9);
        color: #000;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Удаляем через 5 секунд
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/**
 * Показывает сообщение об ошибке
 */
function showErrorMessage(pageLang, error) {
    const messages = {
        'ru': 'Ошибка',
        'en': 'Error',
        'ro': 'Eroare'
    };
    
    const message = messages[pageLang] || messages['ro'];
    
    // Создаем toast уведомление
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 0, 0, 0.9);
        color: #fff;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = `${message}: ${error || 'Неизвестная ошибка'}`;
    document.body.appendChild(toast);
    
    // Удаляем через 5 секунд
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
    
    console.error('Lead to Supabase: Ошибка отправки', error);
}

/**
 * Очищает форму
 */
function clearForm(form) {
    const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
    inputs.forEach(input => {
        input.value = '';
    });
    
    // Очищаем nice-select если используется
    const niceSelect = form.querySelector('.nice-select');
    if (niceSelect) {
        const current = niceSelect.querySelector('.current');
        if (current) {
            const firstOption = niceSelect.querySelector('.option:not(.disabled)');
            if (firstOption) {
                current.textContent = firstOption.textContent;
            }
        }
    }
    
    // Очищаем обычный select
    const selects = form.querySelectorAll('select');
    selects.forEach(select => {
        select.value = '';
    });
}

// ============================================
// ОСНОВНАЯ ФУНКЦИЯ ОБРАБОТКИ ФОРМЫ
// ============================================

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const pageLang = getPageLang();
    
    // Проверяем инициализацию Supabase
    if (!supabase) {
        const initialized = await initSupabase();
        if (!initialized) {
            showErrorMessage(pageLang, 'Сервис временно недоступен');
            return;
        }
    }
    
    // Собираем данные из формы
    const name = getFormFieldValue(form, 'name');
    const email = getFormFieldValue(form, 'email');
    const phone = getFormFieldValue(form, 'phone');
    const telegram = getFormFieldValue(form, 'telegram');
    const businessType = getFormFieldValue(form, 'business_type');
    
    // Валидация обязательных полей
    if (!validateName(name)) {
        showErrorMessage(pageLang, 'Имя должно содержать минимум 2 символа');
        return;
    }
    
    if (!validateEmail(email)) {
        showErrorMessage(pageLang, 'Введите корректный email');
        return;
    }
    
    if (!validatePhone(phone)) {
        showErrorMessage(pageLang, 'Введите корректный номер телефона');
        return;
    }
    
    if (!validateBusinessType(businessType)) {
        showErrorMessage(pageLang, 'Выберите тип бизнеса');
        return;
    }
    
    // Собираем дополнительные данные
    const pagePath = window.location.pathname + window.location.search;
    const utmParams = getUtmParams();
    
    // Подготавливаем данные для отправки
    const formData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        telegram: telegram ? telegram.trim() : null,
        business_type: businessType.trim(),
        page_path: pagePath,
        page_lang: pageLang,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        user_agent: navigator.userAgent,
        status: 'new'
    };
    
    try {
        // Отправляем данные в Supabase
        const { data, error } = await supabase
            .from('consultation_requests')
            .insert([formData]);
        
        if (error) {
            throw error;
        }
        
        // Успех
        showSuccessMessage(pageLang);
        clearForm(form);
        
    } catch (error) {
        showErrorMessage(pageLang, error.message || 'Ошибка отправки данных');
    }
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    // Инициализируем Supabase
    await initSupabase();
    
    // Синхронизация nice-select со скрытым select
    function syncNiceSelect() {
        document.querySelectorAll('select[name="business_type"]').forEach(select => {
            if (select.style.display === 'none') {
                const niceSelect = select.nextElementSibling;
                if (niceSelect && niceSelect.classList.contains('nice-select')) {
                    // Слушаем клики по опциям nice-select
                    niceSelect.querySelectorAll('.option:not(.disabled)').forEach((option, index) => {
                        option.addEventListener('click', function() {
                            const optionText = this.textContent.trim();
                            // Находим соответствующую опцию в select
                            const selectOptions = Array.from(select.options);
                            const matchingOption = selectOptions.find(opt => opt.textContent.trim() === optionText);
                            if (matchingOption) {
                                select.value = matchingOption.value || matchingOption.textContent.trim();
                            }
                        });
                    });
                }
            }
        });
    }
    
    // Ждем, пока nice-select инициализируется
    setTimeout(syncNiceSelect, 500);
    
    // Находим все формы на странице
    const forms = document.querySelectorAll('form.form-cta, form[class*="form"]');
    
    if (forms.length === 0) {
        // Если формы нет, ничего не делаем
        return;
    }
    
    // Подключаем обработчик к каждой форме
    forms.forEach(form => {
        // Проверяем, есть ли в форме поля для заявки (name, email, phone)
        const hasName = form.querySelector('[name="name"]') || 
                       form.querySelector('input[type="text"]') && 
                       form.querySelector('label')?.textContent?.toLowerCase().includes('name');
        const hasEmail = form.querySelector('[name="email"]') || form.querySelector('input[type="email"]');
        const hasPhone = form.querySelector('[name="phone"]') || form.querySelector('input[type="tel"]');
        
        // Если это форма заявки (есть name, email, phone), подключаем обработчик
        if (hasName && hasEmail && hasPhone) {
            form.addEventListener('submit', handleFormSubmit);
        }
    });
});

// Добавляем стили для анимации toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

