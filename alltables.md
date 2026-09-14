| table_name             | column_name      | data_type                | is_nullable |
| ---------------------- | ---------------- | ------------------------ | ----------- |
| collections            | id               | uuid                     | NO          |
| collections            | user_id          | uuid                     | NO          |
| collections            | name             | text                     | NO          |
| collections            | created_at       | timestamp with time zone | NO          |
| collections            | description      | text                     | YES         |
| marketplace_items      | id               | uuid                     | NO          |
| marketplace_items      | title            | text                     | NO          |
| marketplace_items      | description      | text                     | NO          |
| marketplace_items      | tag              | text                     | YES         |
| marketplace_items      | image_url        | text                     | YES         |
| marketplace_items      | link             | text                     | YES         |
| marketplace_items      | status           | text                     | YES         |
| marketplace_items      | created_at       | timestamp with time zone | YES         |
| orders                 | order_id         | text                     | NO          |
| orders                 | user_id          | uuid                     | NO          |
| orders                 | amount           | numeric                  | NO          |
| orders                 | currency         | text                     | YES         |
| orders                 | status           | text                     | YES         |
| orders                 | item_type        | text                     | YES         |
| orders                 | item_id          | uuid                     | NO          |
| orders                 | created_at       | timestamp with time zone | NO          |
| page_views             | id               | uuid                     | NO          |
| page_views             | session_id       | text                     | NO          |
| page_views             | path             | text                     | NO          |
| page_views             | created_at       | timestamp with time zone | NO          |
| promo_banners          | id               | uuid                     | NO          |
| promo_banners          | title            | text                     | NO          |
| promo_banners          | image_url        | text                     | NO          |
| promo_banners          | target_url       | text                     | NO          |
| promo_banners          | is_active        | boolean                  | YES         |
| promo_banners          | created_at       | timestamp with time zone | YES         |
| prompts                | id               | uuid                     | NO          |
| prompts                | slug             | text                     | NO          |
| prompts                | title            | text                     | NO          |
| prompts                | content          | text                     | NO          |
| prompts                | prompts          | ARRAY                    | YES         |
| prompts                | tags             | ARRAY                    | YES         |
| prompts                | category         | text                     | NO          |
| prompts                | images           | ARRAY                    | YES         |
| prompts                | created_at       | timestamp with time zone | NO          |
| prompts                | updated_at       | timestamp with time zone | NO          |
| prompts                | seo_description  | text                     | YES         |
| prompts                | pack_id          | text                     | YES         |
| prompts                | pack_title       | text                     | YES         |
| prompts                | pack_image_url   | text                     | YES         |
| resources_items        | id               | text                     | NO          |
| resources_items        | title            | text                     | NO          |
| resources_items        | description      | text                     | NO          |
| resources_items        | icon             | text                     | YES         |
| resources_items        | color            | text                     | YES         |
| resources_items        | count            | text                     | YES         |
| resources_items        | image_url        | text                     | YES         |
| resources_items        | created_at       | timestamp with time zone | YES         |
| tool_requests          | id               | uuid                     | NO          |
| tool_requests          | email            | text                     | YES         |
| tool_requests          | idea_description | text                     | NO          |
| tool_requests          | created_at       | timestamp with time zone | NO          |
| tools_items            | id               | uuid                     | NO          |
| tools_items            | title            | text                     | NO          |
| tools_items            | description      | text                     | NO          |
| tools_items            | tag              | text                     | YES         |
| tools_items            | image_url        | text                     | YES         |
| tools_items            | link             | text                     | YES         |
| tools_items            | status           | text                     | YES         |
| tools_items            | created_at       | timestamp with time zone | YES         |
| user_profiles          | id               | uuid                     | NO          |
| user_profiles          | email            | text                     | NO          |
| user_profiles          | preferences      | ARRAY                    | YES         |
| user_profiles          | created_at       | timestamp with time zone | NO          |
| user_profiles          | updated_at       | timestamp with time zone | NO          |
| user_profiles          | name             | text                     | YES         |
| user_profiles          | favorites        | ARRAY                    | YES         |
| user_prompts           | id               | uuid                     | NO          |
| user_prompts           | user_id          | uuid                     | NO          |
| user_prompts           | collection_id    | uuid                     | YES         |
| user_prompts           | title            | text                     | NO          |
| user_prompts           | content          | text                     | NO          |
| user_prompts           | category         | text                     | YES         |
| user_prompts           | price            | text                     | YES         |
| user_prompts           | tags             | ARRAY                    | YES         |
| user_prompts           | created_at       | timestamp with time zone | NO          |
| user_prompts           | updated_at       | timestamp with time zone | NO          |
| user_prompts           | example          | text                     | YES         |
| waitlist_emails        | id               | uuid                     | NO          |
| waitlist_emails        | email            | text                     | NO          |
| waitlist_emails        | created_at       | timestamp with time zone | NO          |
| workshop_registrations | id               | uuid                     | NO          |
| workshop_registrations | user_id          | uuid                     | NO          |
| workshop_registrations | workshop_id      | uuid                     | NO          |
| workshop_registrations | order_id         | text                     | NO          |
| workshop_registrations | status           | text                     | YES         |
| workshop_registrations | created_at       | timestamp with time zone | NO          |
| workshops              | id               | uuid                     | NO          |
| workshops              | slug             | text                     | NO          |
| workshops              | title            | text                     | NO          |
| workshops              | topic            | text                     | NO          |
| workshops              | scheduled_date   | timestamp with time zone | NO          |
| workshops              | duration_minutes | integer                  | NO          |
| workshops              | format           | text                     | YES         |
| workshops              | eligibility      | text                     | YES         |