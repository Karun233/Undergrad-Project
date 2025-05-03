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
        # First, make points nullable if it exists
        migrations.RunSQL(
            "ALTER TABLE api_userprofile ALTER COLUMN points DROP NOT NULL;",
            reverse_sql="ALTER TABLE api_userprofile ALTER COLUMN points SET NOT NULL;"
        ),
        # Run the data migration
        migrations.RunPython(migrate_points_to_score),
        # Then remove the points column if it exists
        migrations.RunSQL(
            "ALTER TABLE api_userprofile DROP COLUMN IF EXISTS points;",
            reverse_sql=""
        ),
    ]
