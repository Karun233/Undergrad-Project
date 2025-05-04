from django.db import migrations, models

def migrate_points_to_score(apps, schema_editor):
    # Get the UserProfile model from the app registry
    UserProfile = apps.get_model('api', 'UserProfile')
    
    # For each profile, set score to points value (or 0 if null)
    for profile in UserProfile.objects.all():
        if hasattr(profile, 'points'):
            profile.score = profile.points or 0
            profile.save()

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_userprofile_score'),  # Adjust this to your last migration
    ]

    operations = [
        # Check if points column exists before attempting operations
        migrations.RunSQL(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name='api_userprofile' AND column_name='points'
                ) THEN
                    ALTER TABLE api_userprofile ALTER COLUMN points DROP NOT NULL;
                END IF;
            END $$;
            """,
            reverse_sql=""
        ),
        # Run the data migration
        migrations.RunPython(migrate_points_to_score, migrations.RunPython.noop),
        # Then remove the points column if it exists
        migrations.RunSQL(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name='api_userprofile' AND column_name='points'
                ) THEN
                    ALTER TABLE api_userprofile DROP COLUMN points;
                END IF;
            END $$;
            """,
            reverse_sql=""
        ),
    ]
